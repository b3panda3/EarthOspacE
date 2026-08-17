import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/watsonx";
import { isDemoMode } from "@/lib/utils/demo";

// ─── Demo briefing sentences ──────────────────────────────────────────────────

const DEMO_BRIEFINGS: string[] = [
  "Solar Cycle 25 is approaching its predicted maximum — heightened flare activity and elevated Kp indices expected through Q3; all mission planners advised to monitor NOAA SWPC daily forecasts.",
  "Artemis III hardware integration is underway at KSC; nominal space weather conditions are forecast for the next 72 hours — an optimal window for orbital insertion rehearsals.",
  "A minor geomagnetic enhancement (Kp 3–4) is expected from an incoming coronal hole high-speed stream; GPS users should anticipate brief scintillation events over polar routes.",
  "The ISS has just completed its 100,000th orbit around Earth — a quarter-century of continuous human presence in low Earth orbit and a foundation for deep-space exploration ahead.",
  "Europa Clipper is en route to Jupiter's moon; space weather remains calm at L2, making this an ideal window for deep-space communication and science operations.",
];

export async function GET(req: NextRequest) {
  const role    = req.nextUrl.searchParams.get("role")    ?? "Space Enthusiast";
  const mission = req.nextUrl.searchParams.get("mission") ?? "Ground-based Research";

  // ── Demo mode: return a pre-generated briefing instantly ─────────────────
  if (isDemoMode()) {
    const idx = Math.floor(Date.now() / 86_400_000) % DEMO_BRIEFINGS.length;
    return NextResponse.json({ briefing: DEMO_BRIEFINGS[idx], demo: true });
  }

  try {
    const reply = await chatCompletion([
      {
        role: "system",
        content:
          "You are a space exploration mission briefing AI. Generate one concise, engaging sentence (max 180 chars) that serves as a daily mission briefing. Be specific and grounded. No preamble, just the briefing sentence.",
      },
      {
        role: "user",
        content: `Daily briefing for a ${role} focused on ${mission}. Reference current space exploration context.`,
      },
    ]);
    return NextResponse.json({ briefing: reply.content.trim() });
  } catch (err) {
    console.error("[briefing] Granite call failed:", err);
    return NextResponse.json({
      briefing: `Today's mission focus: monitoring ${mission} activities and tracking ongoing developments in space exploration.`,
    });
  }
}
