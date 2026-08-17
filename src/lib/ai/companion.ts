/**
 * /src/lib/ai/companion.ts
 *
 * ASTRO — AI companion conversation engine.
 *
 * Architecture:
 *   - Server-side only (Node/Watsonx — never imported from client components)
 *   - Maintains sliding window of last 10 messages for context
 *   - Injects live platform data (news, weather, space events) into system prompt
 *   - Exports buildAstroMessages() and generateAstroReply()
 *   - Also exports buildBriefingPrompt() for the daily briefing mode
 */

import { chatCompletion, GRANITE_CHAT_MODEL, type ChatMessage } from "@/lib/ai/watsonx";
import { withCache, TTL } from "@/lib/api/cache";

// ─── Scenario types ───────────────────────────────────────────────────────────

export type AstroScenario =
  | "free_chat"
  | "daily_briefing"
  | "space_weather"
  | "brainstorm"
  | "emergency";

export interface PlatformContext {
  newsHeadlines?:   string[];       // top 3 titles
  currentKp?:       number;
  solarWindSpeed?:  number;
  weatherSummary?:  string;
  activeEvents?:    string[];       // top 3 event titles
  alertLevel?:      "green" | "yellow" | "orange" | "red";
}

export interface ConversationMessage {
  role:      "user" | "assistant";
  content:   string;
  timestamp: string;
  scenario?: AstroScenario;
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  userRole: string,
  missionType: string,
  scenario: AstroScenario,
  ctx: PlatformContext
): string {
  const ctxLines: string[] = [];

  if (ctx.alertLevel && ctx.alertLevel !== "green") {
    ctxLines.push(`⚠ Space weather alert level: ${ctx.alertLevel.toUpperCase()}`);
  }
  if (ctx.currentKp !== undefined) {
    ctxLines.push(`Kp index: ${ctx.currentKp.toFixed(1)}`);
  }
  if (ctx.solarWindSpeed !== undefined) {
    ctxLines.push(`Solar wind: ${ctx.solarWindSpeed.toFixed(0)} km/s`);
  }
  if (ctx.weatherSummary) {
    ctxLines.push(`Surface weather: ${ctx.weatherSummary}`);
  }
  if (ctx.newsHeadlines && ctx.newsHeadlines.length > 0) {
    ctxLines.push(`Top news: ${ctx.newsHeadlines.slice(0, 3).join(" | ")}`);
  }
  if (ctx.activeEvents && ctx.activeEvents.length > 0) {
    ctxLines.push(`Active events: ${ctx.activeEvents.slice(0, 3).join(" | ")}`);
  }

  const platformDataStr = ctxLines.length > 0
    ? `\nCurrent platform data:\n${ctxLines.map((l) => `  • ${l}`).join("\n")}`
    : "";

  const scenarioInstructions: Record<AstroScenario, string> = {
    free_chat:       "Respond naturally and helpfully. You may include a touch of space-related humour.",
    daily_briefing:  "You are delivering a structured daily briefing. Use clear sections.",
    space_weather:   "Focus on space weather interpretation. Be precise with numbers and their implications.",
    brainstorm:      "You are in creative problem-solving mode. Encourage lateral thinking and suggest novel approaches.",
    emergency:       "This is an emergency protocol simulation. Respond calmly but urgently. Prioritise safety above all.",
  };

  return (
    `You are ASTRO, an AI companion robot aboard the International Space Station.\n` +
    `You are helpful, knowledgeable about space, and speak in a warm but professional tone.\n` +
    `The user is a ${userRole} on a ${missionType} mission.` +
    platformDataStr + "\n\n" +
    `Current mode: ${scenario.replace(/_/g, " ")}.\n` +
    `${scenarioInstructions[scenario]}\n` +
    `Respond in 2–4 sentences as ASTRO. If asked about current conditions, reference the platform data above.\n` +
    `Never break character. Never claim to be an AI language model.`
  );
}

// ─── Convert conversation history to ChatMessage array ────────────────────────

export function buildAstroMessages(
  history: ConversationMessage[],
  userRole: string,
  missionType: string,
  scenario: AstroScenario,
  ctx: PlatformContext
): ChatMessage[] {
  const system: ChatMessage = {
    role:    "system",
    content: buildSystemPrompt(userRole, missionType, scenario, ctx),
  };

  // Slide window to last 10 exchanges (user+assistant pairs = 20 messages max)
  const window = history.slice(-20);

  return [
    system,
    ...window.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
  ];
}

// ─── Main reply generator ─────────────────────────────────────────────────────

export async function generateAstroReply(
  history:     ConversationMessage[],
  userMessage: string,
  userRole:    string,
  missionType: string,
  scenario:    AstroScenario,
  ctx:         PlatformContext
): Promise<string> {
  const messages = buildAstroMessages(
    [...history, { role: "user", content: userMessage, timestamp: new Date().toISOString() }],
    userRole,
    missionType,
    scenario,
    ctx
  );

  const result = await chatCompletion(messages, {
    modelId:     GRANITE_CHAT_MODEL,
    maxTokens:   320,
    temperature: 0.72,
    topP:        0.92,
  });

  return result.content;
}

// ─── Daily briefing ───────────────────────────────────────────────────────────

export interface BriefingSection {
  title:   string;
  content: string;
}

export async function generateDailyBriefing(
  userRole:    string,
  missionType: string,
  ctx:         PlatformContext
): Promise<BriefingSection[]> {
  const cacheKey = `astro-briefing:${userRole}:${missionType}:${ctx.alertLevel ?? "green"}:${Math.floor(Date.now() / TTL.BRIEFING)}`;

  return withCache(cacheKey, async () => {
    const weatherStatus =
      ctx.alertLevel === "red"    ? "CRITICAL — severe geomagnetic storm in progress" :
      ctx.alertLevel === "orange" ? "WARNING — elevated solar activity" :
      ctx.alertLevel === "yellow" ? "ELEVATED — monitoring in progress" :
                                    "GREEN — all clear";

    const prompt =
      `You are ASTRO, an AI robot aboard the ISS delivering a structured daily briefing to a ${userRole}.\n\n` +
      `Current data:\n` +
      `  • Space weather: Kp=${ctx.currentKp?.toFixed(1) ?? "?"}, SW=${ctx.solarWindSpeed?.toFixed(0) ?? "?"} km/s, status=${weatherStatus}\n` +
      `  • Top news: ${(ctx.newsHeadlines ?? []).slice(0, 3).join(" | ") || "No headlines"}\n` +
      `  • Active events: ${(ctx.activeEvents ?? []).slice(0, 3).join(" | ") || "None"}\n\n` +
      `Deliver a structured daily briefing covering exactly these 4 sections.\n` +
      `Respond ONLY as a JSON array of { "title": "...", "content": "..." } objects.\n` +
      `Sections must be:\n` +
      `  1. "Space Weather Status"\n` +
      `  2. "Key News Highlights"\n` +
      `  3. "Events to Watch"\n` +
      `  4. "Alerts & Concerns"\n` +
      `Keep each content to 1–2 sentences. Be specific. Reference the data above.\n` +
      `No markdown fences. No extra text.`;

    try {
      const result = await chatCompletion(
        [
          { role: "system", content: "You are ASTRO, an AI robot aboard the ISS." },
          { role: "user",   content: prompt },
        ],
        { modelId: GRANITE_CHAT_MODEL, maxTokens: 500, temperature: 0.4 }
      );

      const cleaned = result.content
        .replace(/^```(?:json)?\s*/im, "")
        .replace(/\s*```\s*$/im, "")
        .trim();

      const parsed = JSON.parse(cleaned) as BriefingSection[];
      if (Array.isArray(parsed) && parsed[0]?.title) return parsed;
    } catch {
      // fall through to demo
    }

    // Demo fallback
    return [
      {
        title:   "Space Weather Status",
        content: `Current Kp index is ${ctx.currentKp?.toFixed(1) ?? "unknown"}, solar wind at ${ctx.solarWindSpeed?.toFixed(0) ?? "—"} km/s. Space weather is ${weatherStatus.toLowerCase()}.`,
      },
      {
        title:   "Key News Highlights",
        content: ctx.newsHeadlines && ctx.newsHeadlines.length > 0
          ? ctx.newsHeadlines.slice(0, 2).join(". ") + "."
          : "No major headlines at this time.",
      },
      {
        title:   "Events to Watch",
        content: ctx.activeEvents && ctx.activeEvents.length > 0
          ? `Monitor: ${ctx.activeEvents.slice(0, 2).join(" and ")}.`
          : "No immediate events requiring attention.",
      },
      {
        title:   "Alerts & Concerns",
        content: ctx.alertLevel !== "green"
          ? `Alert level is ${ctx.alertLevel?.toUpperCase()}. Enhanced monitoring recommended for all EVA and communication activities.`
          : "No active alerts. All systems nominal. Have a productive mission.",
      },
    ];
  }, TTL.BRIEFING);
}
