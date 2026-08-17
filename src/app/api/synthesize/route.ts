/**
 * POST /api/synthesize
 *
 * Accepts: { items: NewsItem[], profile?: AiUserProfile }
 * Returns: { items: NewsItem[], stats: SynthesisStats }
 *
 * Processing pipeline:
 *   1. Validate request body
 *   2. Build FlashContext from profile (or use defaults)
 *   3. Enqueue items through globalQueue (batches of 5, 1 s between batches)
 *      - Each item: check cache → generate flash → store to cache
 *   4. Return enriched items with timing stats
 *
 * Error handling:
 *   - Malformed request body → 400
 *   - Any item-level AI failure → fallback commentary, never a 500
 *   - Unrecoverable server error → 500 with error message
 *
 * The cache layer (appCache) prevents redundant Granite calls within a
 * 30-minute window for identical (articleId × role × mission) combinations.
 */

import { NextRequest, NextResponse } from "next/server";
import type { NewsItem, AiUserProfile } from "@/lib/types";
import { globalQueue } from "@/lib/ai/queue";
import {
  generateNewsFlash,
  fallbackFlash,
  profileToContext,
  type FlashContext,
} from "@/lib/ai/newsFlash";

// ─── Request / Response shapes ────────────────────────────────────────────────

interface SynthesizeRequest {
  items: NewsItem[];
  profile?: Partial<AiUserProfile>;
}

interface SynthesisStats {
  total:       number;
  aiGenerated: number;
  fromCache:   number;
  fallbacks:   number;
  durationMs:  number;
}

interface SynthesizeResponse {
  items: NewsItem[];
  stats: SynthesisStats;
}

// ─── Default context when no profile is available ─────────────────────────────

const DEFAULT_CONTEXT: FlashContext = {
  userRole:    "Space Enthusiast",
  missionType: "Ground-based Research",
  topInterests: ["Space Events", "Astronomy News", "Space Weather"],
};

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  /* ── Parse body ─────────────────────────────────────────────────────────── */
  let body: SynthesizeRequest;
  try {
    body = (await req.json()) as SynthesizeRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Request body must include a non-empty 'items' array." },
      { status: 400 }
    );
  }

  /* ── Build context ──────────────────────────────────────────────────────── */
  const ctx: FlashContext = body.profile
    ? profileToContext({
        role:         body.profile.role         ?? DEFAULT_CONTEXT.userRole,
        missionType:  body.profile.missionType  ?? DEFAULT_CONTEXT.missionType,
        interests:    body.profile.interests    ?? ({} as AiUserProfile["interests"]),
      })
    : DEFAULT_CONTEXT;

  /* ── Track stats ────────────────────────────────────────────────────────── */
  let aiGenerated = 0;
  let fromCache   = 0;
  let fallbacks   = 0;

  /* ── Process via BatchQueue ─────────────────────────────────────────────── */
  let enrichedItems: NewsItem[];

  try {
    const { results, errorCount, durationMs } = await globalQueue.process<NewsItem, NewsItem>(
      body.items,
      /* workFn */ async (item) => {
        // Items that already carry a non-trivial flash are returned unchanged
        // (they were cached or pre-generated upstream).
        if (item.flashCommentary && item.flashCommentary.length > 10) {
          fromCache++;
          return item;
        }

        const flash = await generateNewsFlash(item, ctx);

        // Detect whether the flash was served from cache vs freshly generated.
        // generateNewsFlash() writes to cache on generation; a subsequent call
        // within the TTL window returns the stored value.  We use a simple
        // heuristic: if the flash equals the fallback string it means Granite
        // was unavailable.
        const isFallback =
          flash === fallbackFlash(item) ||
          flash.startsWith(`${item.category[0].toUpperCase()}${item.category.slice(1)} update:`);

        if (isFallback) {
          fallbacks++;
        } else {
          aiGenerated++;
        }

        return { ...item, flashCommentary: flash };
      },
      /* fallbackFn */ (item) => {
        fallbacks++;
        return { ...item, flashCommentary: fallbackFlash(item) };
      },
      /* onItemError */ (err, item, idx) => {
        console.error(
          `[synthesize] Item ${idx} ("${item.title.slice(0, 40)}") failed:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    );

    enrichedItems = results;

    const stats: SynthesisStats = {
      total:       body.items.length,
      aiGenerated,
      fromCache,
      fallbacks:   errorCount + fallbacks,
      durationMs,
    };

    const response: SynthesizeResponse = { items: enrichedItems, stats };
    return NextResponse.json(response);

  } catch (err) {
    /* Unrecoverable error — should not happen in normal operation */
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[synthesize] Unrecoverable error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
