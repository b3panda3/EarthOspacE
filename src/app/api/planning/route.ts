/**
 * /src/app/api/planning/route.ts
 *
 * POST /api/planning
 *   Accepts mission parameters, fetches current conditions + 3-day forecast,
 *   calls Granite for a full GO/NO-GO assessment, and returns the result.
 *
 * Body: MissionParameters (JSON)
 *
 * Response: MissionAssessmentResult + embedded SpaceWeatherForecast
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllTelemetry } from "@/lib/api/sources";
import { generatePredictions, generateMissionAssessment } from "@/lib/ai/prediction";
import { withCache, TTL } from "@/lib/api/cache";
import { isDemoMode, DEMO_MISSION_ASSESSMENT } from "@/lib/utils/demo";
import type { CurrentConditions, HistoricalPoint } from "@/lib/ai/prediction";
import type { MissionParameters } from "@/lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let params: MissionParameters;

  try {
    params = (await req.json()) as MissionParameters;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (!params.missionName || !params.missionType || !params.plannedStart || !params.plannedEnd) {
    return NextResponse.json(
      { error: "missionName, missionType, plannedStart and plannedEnd are required" },
      { status: 422 }
    );
  }

  if (!Array.isArray(params.activities) || params.activities.length === 0) {
    params = { ...params, activities: ["observation"] };
  }

  // ── Demo mode ────────────────────────────────────────────────────────────
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 900));
    const demoForecast = {
      generatedAt:         new Date().toISOString(),
      forecastHorizonDays: 3,
      metrics:             [],
      overallOutlook:      "Demo mode — space weather nominal.",
      alertLevel:          "green" as const,
    };
    return NextResponse.json({
      assessment: { ...DEMO_MISSION_ASSESSMENT, missionName: params.missionName },
      forecast:   demoForecast,
      currentConditions: { kpIndex: 2.3, solarWindSpeedKms: 412 },
      demo: true,
    });
  }

  try {
    const telemetry = await withCache("telemetry:full", () => fetchAllTelemetry(), TTL.TELEMETRY);

    const latestWind = telemetry.solarWind[telemetry.solarWind.length - 1];
    const latestKp   = telemetry.kpPoints[telemetry.kpPoints.length - 1];

    const current: CurrentConditions = {
      kpIndex:             latestKp?.kp              ?? 2.3,
      solarWindSpeedKms:   latestWind?.speedKms       ?? 420,
      solarWindDensity:    latestWind?.densityN        ?? 5.2,
      activeFlares:        telemetry.telemetry.filter((t) => t.type === "solar_flare").length,
      radiationBeltStatus: (latestKp?.kp ?? 0) >= 5 ? "storm" : (latestKp?.kp ?? 0) >= 3 ? "active" : "quiet",
      neoHazardousCount:   telemetry.neos.filter((n) => n.isPotentiallyHazardous).length,
    };

    const historical: HistoricalPoint[] = telemetry.kpPoints.slice(-7).map((pt, i) => ({
      timestamp:         pt.timestamp,
      kpIndex:           pt.kp,
      solarWindSpeedKms: telemetry.solarWind[i]?.speedKms ?? current.solarWindSpeedKms,
    }));

    const forecast = await generatePredictions(current, historical, 3);

    // Duration in hours derived from dates if not explicitly provided
    const durationHours =
      params.durationHours ||
      Math.round(
        (new Date(params.plannedEnd).getTime() - new Date(params.plannedStart).getTime()) /
          3_600_000
      );

    const normalised: MissionParameters = { ...params, durationHours };

    const assessment = await generateMissionAssessment(normalised, forecast, current);

    return NextResponse.json({ assessment, forecast, currentConditions: current });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/planning] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
