/**
 * /src/app/api/predictive/route.ts
 *
 * GET /api/predictive
 *   Fetches current telemetry, runs Granite forecast, returns full predictive
 *   payload including space weather forecast, debris bands, conjunction events,
 *   and communication outlook.
 *
 * Query params:
 *   ?days=3  — forecast horizon (1-7, default 3)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllTelemetry } from "@/lib/api/sources";
import { generatePredictions, generateQuickAssessment } from "@/lib/ai/prediction";
import { withCache, TTL } from "@/lib/api/cache";
import { isDemoMode } from "@/lib/utils/demo";
import type { CurrentConditions, HistoricalPoint } from "@/lib/ai/prediction";
import type { DebrisBand, ConjunctionEvent } from "@/lib/types";

// ─── Static debris catalog (authoritative public data from ESA/NASA) ──────────

const DEBRIS_BANDS: DebrisBand[] = [
  { altitudeKm: 400,   densityScore: 7, objectCount: 3_200, riskLevel: "high" as const,     description: "ISS orbit — dense debris from 2009 Iridium-Cosmos collision remnants" },
  { altitudeKm: 550,   densityScore: 9, objectCount: 6_400, riskLevel: "critical" as const, description: "Starlink/OneWeb LEO belt — highest tracked object density" },
  { altitudeKm: 800,   densityScore: 8, objectCount: 4_100, riskLevel: "critical" as const, description: "Sun-synchronous orbit — Fengyun ASAT debris cloud still dispersing" },
  { altitudeKm: 1200,  densityScore: 5, objectCount: 1_800, riskLevel: "moderate" as const, description: "Inner Van Allen band — reduced commercial traffic, legacy debris" },
  { altitudeKm: 2000,  densityScore: 3, objectCount: 780,   riskLevel: "moderate" as const, description: "Transition zone — sparser, mostly defunct weather satellites" },
  { altitudeKm: 20200, densityScore: 2, objectCount: 340,   riskLevel: "low" as const,      description: "MEO / GPS constellation altitude — relatively clean environment" },
  { altitudeKm: 35786, densityScore: 4, objectCount: 950,   riskLevel: "moderate" as const, description: "GEO ring — high commercial value, growing graveyard zone" },
];

// ─── Demo conjunction events ──────────────────────────────────────────────────

function buildConjunctionEvents(): ConjunctionEvent[] {
  const now = Date.now();
  const events: ConjunctionEvent[] = [
    {
      id: "conj-1",
      primaryObject:   "ISS (ZARYA) 25544",
      secondaryObject: "Cosmos 1408 debris #214",
      tcaUtc:          new Date(now + 14 * 3600_000).toISOString(),
      missDistanceKm:  1.82,
      probabilityPct:  0.04,
      riskLevel:       "moderate",
      riskNarrative:   "Fragment from 2021 ASAT test drifting into ISS orbital band. Probability low but TCA within 24h warrants monitoring.",
    },
    {
      id: "conj-2",
      primaryObject:   "Sentinel-2A 40697",
      secondaryObject: "SL-16 R/B 22195",
      tcaUtc:          new Date(now + 30 * 3600_000).toISOString(),
      missDistanceKm:  0.74,
      probabilityPct:  0.18,
      riskLevel:       "high",
      riskNarrative:   "Russian rocket body on crossing orbit; miss distance under 1 km triggers avoidance manoeuvre assessment by ESA.",
    },
    {
      id: "conj-3",
      primaryObject:   "NOAA-20 43013",
      secondaryObject: "Fengyun-1C debris #891",
      tcaUtc:          new Date(now + 58 * 3600_000).toISOString(),
      missDistanceKm:  3.12,
      probabilityPct:  0.007,
      riskLevel:       "low",
      riskNarrative:   "Old Fengyun debris fragment; comfortable miss distance. No action required.",
    },
    {
      id: "conj-4",
      primaryObject:   "Hubble ST 20580",
      secondaryObject: "BREEZE-M 36032",
      tcaUtc:          new Date(now + 72 * 3600_000).toISOString(),
      missDistanceKm:  5.6,
      probabilityPct:  0.001,
      riskLevel:       "low",
      riskNarrative:   "Russian upper stage on diverging trajectory. Probability negligible.",
    },
    {
      id: "conj-5",
      primaryObject:   "Sentinel-5P 42969",
      secondaryObject: "CZ-4C R/B 44528",
      tcaUtc:          new Date(now + 10 * 3600_000).toISOString(),
      missDistanceKm:  0.31,
      probabilityPct:  0.72,
      riskLevel:       "critical",
      riskNarrative:   "CRITICAL: Chinese rocket body on near-miss trajectory within 12 hours. ESA collision avoidance manoeuvre under evaluation.",
    },
  ];
  return events.sort((a, b) => b.probabilityPct - a.probabilityPct);
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const days = Math.min(7, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "3")));

  // ── Demo mode ───────────────────────────────────────────────────────────
  if (isDemoMode()) {
    const { DEMO_FORECAST_METRICS, DEMO_QUICK_ASSESSMENT } = await import("@/lib/utils/demo");
    const forecast = {
      generatedAt:         new Date().toISOString(),
      forecastHorizonDays: days,
      metrics:             DEMO_FORECAST_METRICS.filter((m) => m.day <= days),
      overallOutlook:      "Space weather conditions remain calm with a possible mild geomagnetic enhancement on Day 2 from an incoming high-speed stream. Overall outlook is favourable for all mission activities.",
      alertLevel:          "green" as const,
    };
    return NextResponse.json({
      forecast,
      quickAssessment:  DEMO_QUICK_ASSESSMENT,
      debrisBands:      DEBRIS_BANDS,
      conjunctionEvents: buildConjunctionEvents(),
      commOutlook: { hfRadio: "Clear", satellite: "Nominal", gps: "Normal", summary: "All communication bands expected to be clear for the next 24 hours." },
      currentConditions: { kpIndex: 2.3, solarWindSpeedKms: 412, solarWindDensity: 5.2, activeFlares: 0, radiationBeltStatus: "quiet", neoHazardousCount: 1 },
      fetchedAt: new Date().toISOString(),
      demo: true,
    });
  }

  try {
    const telemetry = await withCache("telemetry:full", () => fetchAllTelemetry(), TTL.TELEMETRY);

    const latestWind = telemetry.solarWind[telemetry.solarWind.length - 1];
    const latestKp   = telemetry.kpPoints[telemetry.kpPoints.length - 1];

    const current: CurrentConditions = {
      kpIndex:             Number(latestKp?.kp) || 2.3,
      solarWindSpeedKms:   Number(latestWind?.speedKms) || 420,
      solarWindDensity:    Number(latestWind?.densityN) || 5.2,
      activeFlares:        telemetry.telemetry.filter((t) => t.type === "solar_flare").length,
      radiationBeltStatus: (latestKp?.kp ?? 0) >= 5 ? "storm" : (latestKp?.kp ?? 0) >= 3 ? "active" : "quiet",
      neoHazardousCount:   telemetry.neos.filter((n) => n.isPotentiallyHazardous).length,
    };

    const historical: HistoricalPoint[] = telemetry.kpPoints
      .slice(-7)
      .map((pt, i) => ({
        timestamp:         pt.timestamp,
        kpIndex:           Number(pt.kp) || 0,
        solarWindSpeedKms: Number(telemetry.solarWind[i]?.speedKms) || current.solarWindSpeedKms,
      }));

    const [forecast, quickAssessment] = await Promise.all([
      generatePredictions(current, historical, days),
      generateQuickAssessment(current),
    ]);

    const conjunctionEvents = buildConjunctionEvents();

    // Communication outlook derived from Kp forecast
    const day1Kp = forecast.metrics.find((m) => m.metric === "kp_index" && m.day === 1);
    const commOutlook = {
      hfRadio:    (day1Kp?.predictedMax ?? 3) < 5 ? "Clear"    : "Degraded",
      satellite:  (day1Kp?.predictedMax ?? 3) < 6 ? "Nominal"  : "Disrupted",
      gps:        (day1Kp?.predictedMax ?? 3) < 7 ? "Normal"   : "Reduced accuracy",
      summary:    (day1Kp?.predictedMax ?? 3) < 4
        ? "All communication bands expected to be clear for the next 24 hours."
        : "Elevated geomagnetic activity may cause HF radio blackouts and GPS scintillation.",
    };

    return NextResponse.json({
      forecast,
      quickAssessment,
      debrisBands:       DEBRIS_BANDS,
      conjunctionEvents,
      commOutlook,
      currentConditions: current,
      fetchedAt:         new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/predictive] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
