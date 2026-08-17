/**
 * /src/app/api/telemetry/route.ts
 *
 * GET  /api/telemetry
 *   Aggregates live data from NASA NeoWs, NOAA space weather (solar wind + Kp),
 *   and Copernicus STAC. Runs anomaly detection on key metrics, writes a
 *   snapshot row to Supabase `telemetry_history`, and returns the full payload.
 *
 * Query params:
 *   ?anomaly=1   — include Granite anomaly analysis (default off to keep latency low)
 *
 * Response shape: TelemetryAPIResponse (see inline type below)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllTelemetry } from "@/lib/api/sources";
import { detectAnomalies } from "@/lib/ai/anomaly";
import { supabase } from "@/lib/utils/supabase";
import { withCache, TTL } from "@/lib/api/cache";
import type { MetricSeries } from "@/lib/ai/anomaly";
import type { AnomalyResult, TrendAnalysis } from "@/lib/types";
import type { AggregatedTelemetry } from "@/lib/api/sources";

// ─── Trend analysis helper ────────────────────────────────────────────────────

function buildTrendAnalysis(
  metric: string,
  values: number[],
  timestamps: string[]
): TrendAnalysis {
  const window = values.slice(-7);
  const movingAverage = window.reduce((s, v) => s + v, 0) / (window.length || 1);

  const first = window[0] ?? movingAverage;
  const last  = window[window.length - 1] ?? movingAverage;

  const changePercent =
    first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;

  const trend: "up" | "down" | "flat" =
    changePercent > 3 ? "up" : changePercent < -3 ? "down" : "flat";

  const dataPoints = values.slice(-14).map((v, i) => ({
    timestamp: timestamps[i] ?? new Date().toISOString(),
    value: v,
  }));

  return { metric, movingAverage, trend, changePercent, dataPoints };
}

// ─── Supabase snapshot writer ─────────────────────────────────────────────────

async function writeTelemetrySnapshot(data: AggregatedTelemetry): Promise<void> {
  if (!supabase) return;

  const now = new Date().toISOString();

  const rows = [
    // Solar wind speed
    ...data.solarWind.slice(-1).map((pt) => ({
      source: "NOAA" as const,
      metric: "solar_wind_speed",
      value: pt.speedKms,
      timestamp: pt.timestamp,
    })),
    // Kp index
    ...data.kpPoints.slice(-1).map((pt) => ({
      source: "NOAA" as const,
      metric: "kp_index",
      value: pt.kp,
      timestamp: pt.timestamp,
    })),
    // NEO count today
    {
      source: "NASA" as const,
      metric: "neo_count",
      value: data.neos.length,
      timestamp: now,
    },
    // Potentially hazardous NEO count
    {
      source: "NASA" as const,
      metric: "neo_hazardous_count",
      value: data.neos.filter((n) => n.isPotentiallyHazardous).length,
      timestamp: now,
    },
  ];

  try {
    await supabase.from("telemetry_history").insert(rows);
  } catch (err) {
    console.warn("[telemetry] Supabase insert failed (non-fatal):", (err as Error).message);
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const wantAnomaly = req.nextUrl.searchParams.get("anomaly") === "1";

  try {
    // Fetch live telemetry (cached internally per source)
    const data = await withCache(
      "telemetry:full",
      () => fetchAllTelemetry(),
      TTL.WEATHER
    );

    // ── Trend analysis ──────────────────────────────────────────────────────
    const solarWindSpeeds = data.solarWind.map((p) => p.speedKms);
    const solarWindTs     = data.solarWind.map((p) => p.timestamp);
    const kpValues        = data.kpPoints.map((p) => p.kp);
    const kpTs            = data.kpPoints.map((p) => p.timestamp);

    const trends: TrendAnalysis[] = [
      buildTrendAnalysis("solar_wind_speed", solarWindSpeeds, solarWindTs),
      buildTrendAnalysis("kp_index",         kpValues,        kpTs),
    ];

    // ── Anomaly detection (optional, Granite-powered) ───────────────────────
    let anomalies: AnomalyResult[] = [];

    if (wantAnomaly) {
      const latestWind = data.solarWind[data.solarWind.length - 1];
      const latestKp   = data.kpPoints[data.kpPoints.length - 1];

      const series: MetricSeries[] = [];

      if (latestWind) {
        series.push({
          key:     "solar_wind_speed",
          label:   "Solar Wind Speed",
          values:  solarWindSpeeds.slice(0, -1),
          current: latestWind.speedKms,
          unit:    "km/s",
        });
        series.push({
          key:     "solar_wind_density",
          label:   "Solar Wind Proton Density",
          values:  data.solarWind.slice(0, -1).map((p) => p.densityN),
          current: latestWind.densityN,
          unit:    "n/cm³",
        });
      }

      if (latestKp) {
        series.push({
          key:     "kp_index",
          label:   "Geomagnetic Kp Index",
          values:  kpValues.slice(0, -1),
          current: latestKp.kp,
          unit:    "Kp",
        });
      }

      anomalies = await detectAnomalies(series, { callLLM: true });
    }

    // ── Persist snapshot to Supabase (fire & forget) ────────────────────────
    void writeTelemetrySnapshot(data);

    return NextResponse.json({
      ...data,
      trends,
      anomalies,
      wantAnomaly,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/telemetry] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
