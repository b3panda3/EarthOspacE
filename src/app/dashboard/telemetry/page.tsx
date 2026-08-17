"use client";

/**
 * /src/app/dashboard/telemetry/page.tsx
 *
 * Real-time Space Telemetry Dashboard
 *
 * Layout (responsive grid):
 *   ┌──────────────────────────────┐
 *   │ Hero header + stats row      │
 *   ├──────────────────────────────┤
 *   │ Anomaly alerts (if any)      │
 *   ├────────────────┬─────────────┤
 *   │ Solar Wind     │ Geomagnetic │
 *   ├────────────────┼─────────────┤
 *   │ NEO Tracker    │ Satellites  │
 *   └────────────────┴─────────────┘
 *
 * Data fetching:
 *   TanStack Query polls /api/telemetry every 5 minutes.
 *   Pass ?anomaly=1 to trigger Granite anomaly analysis.
 *
 * Supabase telemetry_history write happens server-side in /api/telemetry.
 */

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import SolarWindWidget      from "@/components/dashboard/telemetry/SolarWindWidget";
import GeomagneticWidget    from "@/components/dashboard/telemetry/GeomagneticWidget";
import SatelliteTrackerWidget from "@/components/dashboard/telemetry/SatelliteTrackerWidget";
import NEOTrackerWidget     from "@/components/dashboard/telemetry/NEOTrackerWidget";
import AnomalyAlert         from "@/components/dashboard/telemetry/AnomalyAlert";
import type { TrendAnalysis, AnomalyResult, TelemetryStatus } from "@/lib/types";
import type { SolarWindPoint, KpPoint } from "@/lib/api/sources/noaa";
import type { TrackedSatellite, NeoObject } from "@/lib/types";

// ─── API response shape ───────────────────────────────────────────────────────

interface TelemetryResponse {
  solarWind:          SolarWindPoint[];
  kpPoints:           KpPoint[];
  kpCurrent:          number;
  neos:               NeoObject[];
  satellites:         TrackedSatellite[];
  telemetry:          { id: string; status: TelemetryStatus; label?: string }[];
  trends:             TrendAnalysis[];
  anomalies:          AnomalyResult[];
  wantAnomaly:        boolean;
  fetchedAt:          string;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchTelemetry(withAnomaly: boolean): Promise<TelemetryResponse> {
  const url = `/api/telemetry${withAnomaly ? "?anomaly=1" : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Telemetry API ${res.status}`);
  return res.json() as Promise<TelemetryResponse>;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<TelemetryStatus, string> = {
  nominal:  "#4ade80",
  elevated: "#e6c974",
  warning:  "#fb923c",
  critical: "#f87171",
  unknown:  "#96938d",
};

const STATUS_LABEL: Record<TelemetryStatus, string> = {
  nominal:  "Nominal",
  elevated: "Elevated",
  warning:  "Warning",
  critical: "Critical",
  unknown:  "Unknown",
};

function overallStatus(
  statuses: TelemetryStatus[]
): TelemetryStatus {
  const order: TelemetryStatus[] = ["critical", "warning", "elevated", "nominal", "unknown"];
  for (const s of order) {
    if (statuses.includes(s)) return s;
  }
  return "unknown";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TelemetryPage() {
  const [anomalyEnabled, setAnomalyEnabled] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useQuery<TelemetryResponse, Error>({
    queryKey: ["telemetry", anomalyEnabled],
    queryFn:  () => fetchTelemetry(anomalyEnabled),
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime:       4 * 60 * 1000,
  });

  // Derive status from telemetry items
  const statuses: TelemetryStatus[] = data?.telemetry.map((t) => t.status) ?? [];
  const sysStatus = overallStatus(statuses);
  const statusColor = STATUS_COLOR[sysStatus];

  const windTrend  = data?.trends.find((t) => t.metric === "solar_wind_speed");
  const kpTrend    = data?.trends.find((t) => t.metric === "kp_index");

  // Find status of specific metrics
  const windStatus = (data?.telemetry.find((t) => t.id === "noaa-sw-speed")?.status) ?? "unknown";
  const kpStatus   = (data?.telemetry.find((t) => t.id === "noaa-kp")?.status) ?? "unknown";

  return (
    <div className="min-h-screen bg-[#100f0e] px-4 py-6 md:px-8">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e7e5] tracking-tight">
              Space Telemetry
            </h1>
            <p className="text-sm text-[#96938d] mt-1">
              Real-time solar weather, orbital objects &amp; geomagnetic data
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Anomaly toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                className="relative w-8 h-4 rounded-full transition-colors"
                style={{ backgroundColor: anomalyEnabled ? "#8369ce" : "#3a3830" }}
                onClick={() => setAnomalyEnabled((v) => !v)}
              >
                <span
                  className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform"
                  style={{ left: anomalyEnabled ? "18px" : "2px" }}
                />
              </div>
              <span className="text-xs text-[#96938d]">
                Granite anomaly detection
              </span>
            </label>

            {/* Refresh button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#605943] text-[#96938d] hover:text-[#e8e7e5] hover:border-[#e6c974] transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Last updated */}
        {dataUpdatedAt > 0 && (
          <p className="text-xs text-[#605943] mt-2">
            Last updated {new Date(dataUpdatedAt).toLocaleTimeString()} ·{" "}
            refreshes every 5 min
          </p>
        )}
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {isError && (
        <div className="mb-4 rounded-xl border border-[#f87171] border-opacity-40 bg-[rgba(248,113,113,0.08)] p-4">
          <p className="text-sm text-[#f87171]">
            Failed to load telemetry: {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs text-[#e6c974] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── System status bar ─────────────────────────────────────────────── */}
      <div className="mb-5 rounded-xl border border-[#3a3830] bg-[#24231f] px-4 py-3 flex flex-wrap items-center gap-4">
        {/* Overall */}
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-sm font-medium" style={{ color: statusColor }}>
            System: {STATUS_LABEL[sysStatus]}
          </span>
        </div>

        {/* Per-metric pills */}
        {[
          { label: "Solar Wind",  status: windStatus },
          { label: "Kp Index",    status: kpStatus   },
        ].map(({ label, status: s }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[s as TelemetryStatus] }}
            />
            <span className="text-xs text-[#96938d]">{label}</span>
            <span className="text-xs capitalize" style={{ color: STATUS_COLOR[s as TelemetryStatus] }}>
              {STATUS_LABEL[s as TelemetryStatus]}
            </span>
          </div>
        ))}

        {/* NEO count pill */}
        {data && (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e6c974]" />
            <span className="text-xs text-[#96938d]">NEOs</span>
            <span className="text-xs text-[#e6c974]">
              {data.neos.length} tracked
              {data.neos.filter((n) => n.isPotentiallyHazardous).length > 0 &&
                ` · ${data.neos.filter((n) => n.isPotentiallyHazardous).length} hazardous`}
            </span>
          </div>
        )}

        {/* Anomaly detection status */}
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: anomalyEnabled ? "#8369ce" : "#3a3830" }}
          />
          <span className="text-xs text-[#96938d]">
            {anomalyEnabled ? "Anomaly detection on" : "Anomaly detection off"}
          </span>
          {data?.anomalies && data.anomalies.length > 0 && (
            <span className="text-xs text-[#f87171]">
              · {data.anomalies.length} flagged
            </span>
          )}
        </div>
      </div>

      {/* ── Anomaly alerts ────────────────────────────────────────────────── */}
      {data?.anomalies && data.anomalies.length > 0 && (
        <div className="mb-5 space-y-3">
          {data.anomalies.map((a) => (
            <AnomalyAlert key={a.metricKey + a.detectedAt} anomaly={a} />
          ))}
        </div>
      )}

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Solar Wind */}
        <SolarWindWidget
          points={data?.solarWind ?? []}
          status={windStatus as TelemetryStatus}
          trend={windTrend}
          isLoading={isLoading}
        />

        {/* Geomagnetic / Kp */}
        <GeomagneticWidget
          kpCurrent={data?.kpCurrent ?? 0}
          kpPoints={data?.kpPoints ?? []}
          status={kpStatus as TelemetryStatus}
          trend={kpTrend}
          isLoading={isLoading}
        />

        {/* NEO Tracker */}
        <NEOTrackerWidget
          neos={data?.neos ?? []}
          isLoading={isLoading}
        />

        {/* Satellite Tracker */}
        <SatelliteTrackerWidget
          satellites={data?.satellites ?? []}
          isLoading={isLoading}
        />
      </div>

      {/* ── Data attribution footer ───────────────────────────────────────── */}
      <div className="mt-8 border-t border-[#3a3830] pt-4 flex flex-wrap gap-4 text-[10px] text-[#605943]">
        <span>Solar wind: NOAA SWPC / DSCOVR ACE</span>
        <span>Kp index: NOAA planetary_k_index_1m</span>
        <span>NEOs: NASA NeoWs API</span>
        <span>Satellites: Static NORAD catalog</span>
        {anomalyEnabled && <span>Anomaly analysis: IBM Granite</span>}
      </div>
    </div>
  );
}
