/**
 * /src/app/api/robot/route.ts
 *
 * POST /api/robot
 *   Accepts a user message + conversation history, calls the ASTRO companion
 *   AI, and returns the robot's reply.
 *
 * POST /api/robot?mode=briefing
 *   Triggers the structured daily briefing (no user message needed).
 *
 * Body shape: RobotAPIBody
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateAstroReply,
  generateDailyBriefing,
  type ConversationMessage,
  type AstroScenario,
  type PlatformContext,
} from "@/lib/ai/companion";
import { fetchAllTelemetry } from "@/lib/api/sources";
import { withCache, TTL } from "@/lib/api/cache";
import {
  isDemoMode,
  DEMO_ASTRO_REPLIES,
  DEMO_BRIEFING_SECTIONS,
} from "@/lib/utils/demo";

// ─── Request body ─────────────────────────────────────────────────────────────

interface RobotAPIBody {
  message?:   string;
  history?:   ConversationMessage[];
  scenario?:  AstroScenario;
  userRole?:  string;
  missionType?: string;
}

// ─── Build platform context from live telemetry + briefing cache ──────────────

async function buildPlatformContext(): Promise<PlatformContext> {
  try {
    const telemetry = await withCache("telemetry:full", () => fetchAllTelemetry(), TTL.TELEMETRY);

    const kp    = telemetry.kpPoints[telemetry.kpPoints.length - 1]?.kp    ?? 0;
    const sw    = telemetry.solarWind[telemetry.solarWind.length - 1]?.speedKms ?? 420;
    const level = kp >= 7 ? "red" : kp >= 5 ? "orange" : kp >= 3 ? "yellow" : "green";

    return {
      currentKp:      kp,
      solarWindSpeed: sw,
      alertLevel:     level as PlatformContext["alertLevel"],
      newsHeadlines:  [],   // populated from /api/news separately if desired
      activeEvents:   telemetry.neos
        .filter((n) => n.isPotentiallyHazardous)
        .slice(0, 3)
        .map((n) => `NEO ${n.name} approach ${n.closeApproachDate}`),
    };
  } catch {
    return { alertLevel: "green" };
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const mode = req.nextUrl.searchParams.get("mode");

  let body: RobotAPIBody;
  try {
    body = (await req.json()) as RobotAPIBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userRole    = body.userRole    ?? "Space Explorer";
  const missionType = body.missionType ?? "Ground-based Research";
  const scenario    = (body.scenario ?? "free_chat") as AstroScenario;
  const history     = body.history     ?? [];

  // ── Demo mode: return instant mock responses ────────────────────────────
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 600)); // simulate slight latency

    if (mode === "briefing") {
      return NextResponse.json({ briefing: DEMO_BRIEFING_SECTIONS });
    }

    const message = body.message?.trim() ?? "";
    const replyKey = (
      scenario === "space_weather" ? "space_weather" :
      scenario === "brainstorm"    ? "brainstorm"    :
      scenario === "emergency"     ? "emergency"     :
      scenario === "free_chat"     ? "free_chat"     :
                                     "default"
    ) as keyof typeof DEMO_ASTRO_REPLIES;

    return NextResponse.json({
      reply: DEMO_ASTRO_REPLIES[replyKey] ?? DEMO_ASTRO_REPLIES.default,
      context: { alertLevel: "green", currentKp: 2.3, solarWindSpeed: 412 },
      demo: true,
    });
  }

  const ctx = await buildPlatformContext();

  // ── Daily briefing mode ─────────────────────────────────────────────────
  if (mode === "briefing") {
    try {
      const sections = await generateDailyBriefing(userRole, missionType, ctx);
      return NextResponse.json({ briefing: sections });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  // ── Normal chat message ─────────────────────────────────────────────────
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 422 });
  }

  try {
    const reply = await generateAstroReply(
      history,
      message,
      userRole,
      missionType,
      scenario as AstroScenario,
      ctx
    );
    return NextResponse.json({ reply, context: ctx });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[api/robot] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
