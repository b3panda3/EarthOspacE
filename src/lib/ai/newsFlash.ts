/**
 * /src/lib/ai/newsFlash.ts
 *
 * News-flash generation system.
 *
 * Constructs carefully engineered prompts from raw data + user profile,
 * calls generateText on Granite 13B Chat v2, and applies a deterministic
 * fallback when the model is unavailable.
 *
 * Cache integration: results are stored in the shared LRU cache for 30 min
 * to avoid redundant LLM calls for identical article + profile combinations.
 */

import { generateText, WatsonxError, type GenerateOptions } from "@/lib/ai/watsonx";
import { appCache, TTL, cacheKey } from "@/lib/api/cache";
import type { NewsItem, AiUserProfile, NewsCategory } from "@/lib/types";

// ─── Fallback template ────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  climate:     "Climate",
  astronomy:   "Astronomy",
  space:       "Space",
  environment: "Environment",
  disaster:    "Incident",
  technology:  "Technology",
  general:     "General",
};

/**
 * Deterministic fallback — used when Granite is unavailable.
 * Format: "[Category] update: [title]. Monitor for further developments."
 */
export function fallbackFlash(item: Pick<NewsItem, "category" | "title">): string {
  const label = CATEGORY_LABEL[item.category] ?? "News";
  const title = item.title.trim().replace(/\.$/, "");
  return `${label} update: ${title}. Monitor for further developments.`;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export interface FlashContext {
  userRole: string;
  missionType: string;
  /** Optional: top interest weights to tailor the flash */
  topInterests?: string[];
}

/**
 * Build the full prompt for a single news flash.
 *
 * The prompt is explicitly structured as a role-play briefing scenario so that
 * Granite produces a focused, mission-aware output rather than generic news copy.
 */
export function buildFlashPrompt(
  item: Pick<NewsItem, "title" | "summary" | "category">,
  ctx: FlashContext
): string {
  const categoryLabel = CATEGORY_LABEL[item.category] ?? "space and Earth";
  const interestClause =
    ctx.topInterests && ctx.topInterests.length > 0
      ? ` Key interests to connect: ${ctx.topInterests.slice(0, 3).join(", ")}.`
      : "";

  return `You are an AI intelligence officer aboard a space station. A ${ctx.userRole} on a ${ctx.missionType} needs to know about the following:

CATEGORY: ${categoryLabel}
TITLE: ${item.title}
DETAILS: ${item.summary}

Generate a 2-3 sentence news flash that:
(1) states the key fact clearly and accurately
(2) explains why it matters specifically for a ${ctx.userRole} on a ${ctx.missionType}
(3) adds a unique insight by connecting this event to a broader space exploration trend or relevant historical context${interestClause}

Tone: professional but engaging. No clichés. No preamble. Write only the news flash sentences.`;
}

// ─── Single-item flash generation ────────────────────────────────────────────

const FLASH_GEN_OPTS: GenerateOptions = {
  maxNewTokens: 180,       // 2-3 tight sentences
  temperature: 0.72,
  topP: 0.92,
  topK: 45,
  repetitionPenalty: 1.15,
};

/**
 * Generate an AI news flash for a single item.
 *
 * Results are cached per (article id × user role × mission type) for TTL.NEWS_FLASH.
 * Falls back to `fallbackFlash()` on any AI error.
 */
export async function generateNewsFlash(
  item: NewsItem,
  ctx: FlashContext
): Promise<string> {
  const key = cacheKey("flash", {
    id:      item.id,
    role:    ctx.userRole,
    mission: ctx.missionType,
  });

  // Cache hit
  const cached = appCache.get(key) as string | undefined;
  if (cached) return cached;

  const prompt = buildFlashPrompt(item, ctx);

  try {
    const raw = await generateText(prompt, FLASH_GEN_OPTS);
    const flash = raw.trim().replace(/^["']|["']$/g, ""); // strip stray quotes
    const result = flash.length > 20 ? flash : fallbackFlash(item);
    appCache.set(key, result, TTL.NEWS_FLASH);
    return result;
  } catch (err) {
    const isExpected = err instanceof WatsonxError;
    if (!isExpected) {
      console.error("[newsFlash] Unexpected error:", err);
    } else {
      console.warn("[newsFlash] Granite unavailable, using fallback:", (err as Error).message);
    }
    const fallback = fallbackFlash(item);
    // Cache the fallback for a shorter time so we retry sooner
    appCache.set(key, fallback, 5 * 60 * 1000);
    return fallback;
  }
}

// ─── Batch flash generation ───────────────────────────────────────────────────

/**
 * Generate news flashes for multiple items using the supplied context.
 * Runs concurrently (the BatchQueue caller handles rate-limit batching).
 *
 * Items that already have a non-empty flashCommentary are returned unchanged.
 */
export async function generateNewsFlashes(
  items: NewsItem[],
  ctx: FlashContext
): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    items.map(async (item) => {
      if (item.flashCommentary && item.flashCommentary.length > 10) {
        return item; // already has a flash — skip
      }
      const flash = await generateNewsFlash(item, ctx);
      return { ...item, flashCommentary: flash };
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { ...items[i], flashCommentary: fallbackFlash(items[i]) }
  );
}

// ─── Profile → FlashContext converter ────────────────────────────────────────

/** Build a FlashContext from an AiUserProfile (from the profile hook/DB). */
export function profileToContext(
  profile: Pick<AiUserProfile, "role" | "missionType" | "interests">
): FlashContext {
  const topInterests = Object.entries(profile.interests ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat]) => cat);

  return {
    userRole:     profile.role,
    missionType:  profile.missionType,
    topInterests,
  };
}
