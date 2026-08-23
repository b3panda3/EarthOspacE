"use client";

/**
 * /src/app/dashboard/predictive/page.tsx
 *
 * Predictive Space Monitoring Dashboard
 *
 * Grid layout (2-col on lg+):
 *   ┌──────────────────────┬──────────────────────┐
 *   │ Space Weather         │ Communication Outlook│
 *   │ Forecast (3-day)      │                      │
 *   ├──────────────────────┼──────────────────────┤
 *   │ Collision Risk        │ Debris Tracking      │
 *   │ (conjunction events)  │ (canvas heatmap)     │
 *   └──────────────────────┴──────────────────────┘
 */

import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import type {
  SpaceWeatherForecast,
  MetricForecast,
  DebrisBand,
  ConjunctionEvent,
  RiskLevel,
} from "@/lib/types";
import type { CurrentConditions } from "@/lib/ai/prediction";

// ─── API response shape ───────────────────────────────────────────────────────

interface PredictiveResponse {
  forecast:           SpaceWeatherForecast;
  quickAssessment:    { score: number; label: string; summary: string };
  debrisBands:        DebrisBand[];
  conjunctionEvents:  ConjunctionEvent[];
  commOutlook:        { hfRadio: string; satellite: string; gps: string; summary: string };
  currentConditions:  CurrentConditions;
  fetchedAt:          string;
}

async function fetchPredictive(): Promise<PredictiveResponse> {
  const res = await fetch("/api/predictive?days=3", { cache: "no-store" });
  if (!res.ok) throw new Error(`Predictive API ${res.status}`);
  return res.json();
}

// ─── Risk colours ─────────────────────────────────────────────────────────────

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#f87171",
  high:     "#fb923c",
  moderate: "#38bdf8",
  low:      "#4ade80",
};

const CONF_ICON: Record<string, string> = { high: "●●●", medium: "●●○", low: "●○○" };

const ALERT_COLOR: Record<SpaceWeatherForecast["alertLevel"], string> = {
  green:  "#4ade80",
  yellow: "#38bdf8",
  orange: "#fb923c",
  red:    "#f87171",
};

// ─── Sub-widgets ──────────────────────────────────────────────────────────────

/** Space Weather Forecast widget */
function ForecastWidget({
  forecast,
  loading,
}: { forecast?: SpaceWeatherForecast; loading: boolean }) {
  if (loading) return <SkeletonCard rows={5} title="Space Weather Forecast" />;
  if (!forecast) return null;

  const days = [1, 2, 3];
  const metrics = ["kp_index", "solar_wind_speed", "radiation_level"];
  const alertC  = ALERT_COLOR[forecast.alertLevel];

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#e0f2fe]">Space Weather Forecast</h3>
          <p className="text-xs text-[#7dd3fc] mt-0.5">IBM Granite · 3-day outlook</p>
        </div>
        <span
          className="px-2 py-0.5 text-xs rounded-full font-semibold uppercase tracking-wide"
          style={{ backgroundColor: alertC + "22", color: alertC, border: `1px solid ${alertC}55` }}
        >
          {forecast.alertLevel}
        </span>
      </div>

      {/* Outlook */}
      <p className="text-xs text-[#7dd3fc] leading-relaxed border-l-2 pl-2"
         style={{ borderColor: alertC }}>
        {forecast.overallOutlook}
      </p>

      {/* Day-by-day grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="text-left text-[#7dd3fc] font-normal py-1 pr-2 min-w-[110px]">Metric</th>
              {days.map((d) => (
                <th key={d} className="text-center text-[#7dd3fc] font-normal py-1 px-2 min-w-[90px]">
                  Day +{d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const row = days.map((d) =>
                forecast.metrics.find((m) => m.metric === metric && m.day === d)
              );
              const first = row.find(Boolean);
              return (
                <tr key={metric} className="border-b border-[#1e3a5f] last:border-0">
                  <td className="py-2 pr-2">
                    <p className="text-[#e0f2fe] font-medium">{first?.label ?? metric}</p>
                    <p className="text-[10px] text-[#1e3a5f]">{first?.unit ?? ""}</p>
                  </td>
                  {row.map((m, i) => {
                    if (!m) return <td key={i} className="py-2 px-2 text-center text-[#1e3a5f]">—</td>;
                    const confColor =
                      m.confidence === "high" ? "#4ade80" : m.confidence === "medium" ? "#38bdf8" : "#f87171";
                    return (
                      <td key={i} className="py-2 px-2 text-center">
                        <p className="text-[#e0f2fe] font-mono font-semibold">
                          {m.predictedMin.toFixed(1)}–{m.predictedMax.toFixed(1)}
                        </p>
                        <span className="text-[10px]" style={{ color: confColor }}>
                          {CONF_ICON[m.confidence]} {m.confidence}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reasoning popover — best-reasoning from day 1 */}
      {forecast.metrics.filter((m) => m.day === 1).map((m) => (
        <details key={m.metric} className="group text-xs">
          <summary className="cursor-pointer text-[#1e3a5f] hover:text-[#7dd3fc] transition-colors">
            {m.label} reasoning…
          </summary>
          <p className="mt-1 text-[#7dd3fc] leading-relaxed pl-2 border-l border-[#1e3a5f]">
            {m.reasoning}
          </p>
        </details>
      ))}

      <p className="text-[10px] text-[#1e3a5f]">
        Generated {new Date(forecast.generatedAt).toLocaleTimeString()} · Powered by IBM Granite
      </p>
    </div>
  );
}

/** Debris tracking canvas heatmap */
function DebrisWidget({ bands, loading }: { bands?: DebrisBand[]; loading: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bands) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    ctx.clearRect(0, 0, w, h);

    // Draw altitude axis (log scale: 300 km → 40000 km)
    const logMin = Math.log10(300);
    const logMax = Math.log10(42_000);
    const altToX = (km: number) => ((Math.log10(km) - logMin) / (logMax - logMin)) * (w - 60) + 30;

    // Background
    ctx.fillStyle = "#0a0e17";
    ctx.fillRect(0, 0, w, h);

    // Earth circle
    const cy = h * 0.7;
    ctx.beginPath();
    ctx.arc(altToX(300), cy, 12, 0, Math.PI * 2);
    const earthGrad = ctx.createRadialGradient(altToX(300), cy, 0, altToX(300), cy, 12);
    earthGrad.addColorStop(0, "#4ade80");
    earthGrad.addColorStop(1, "#166534");
    ctx.fillStyle = earthGrad;
    ctx.fill();
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "9px sans-serif";
    ctx.fillText("Earth", altToX(300) - 12, cy + 22);

    // Orbit rings
    const orbitAlts = [400, 550, 800, 2000, 20200, 35786];
    orbitAlts.forEach((alt) => {
      const x = altToX(alt);
      ctx.beginPath();
      ctx.arc(altToX(300), cy, x - altToX(300), 0, Math.PI * 2);
      ctx.strokeStyle = "#2a2820";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Density blobs per band
    bands.forEach((band) => {
      const x  = altToX(band.altitudeKm);
      const r  = 8 + band.densityScore * 4;
      const alpha = 0.15 + band.densityScore * 0.07;

      const color =
        band.riskLevel === "critical" ? `rgba(248,113,113,${alpha})`
        : band.riskLevel === "high"   ? `rgba(251,146,60,${alpha})`
        : band.riskLevel === "moderate" ? `rgba(230,201,116,${alpha})`
        : `rgba(74,222,128,${alpha})`;

      // Scatter dots
      const seed = band.altitudeKm;
      for (let i = 0; i < band.objectCount / 400; i++) {
        const angle = ((seed * (i + 1) * 137.508) % 360) * (Math.PI / 180);
        const dist  = altToX(300) + (x - altToX(300)) * (0.9 + (((seed * i) % 20) / 100));
        const dx = dist * Math.cos(angle);
        const dy = dist * Math.sin(angle);
        const dotX = altToX(300) + dx - altToX(300) * Math.cos(angle) * 0 + (Math.cos(angle) * (x - altToX(300)));
        const dotY = cy + Math.sin(angle) * (x - altToX(300));
        ctx.beginPath();
        ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Label
      const lx = Math.cos(0.6) * (x - altToX(300)) + altToX(300);
      const ly = cy - Math.sin(0.6) * (x - altToX(300));
      ctx.fillStyle = RISK_COLOR[band.riskLevel];
      ctx.font = "8px monospace";
      ctx.fillText(`${band.altitudeKm >= 1000 ? (band.altitudeKm / 1000).toFixed(0) + "k" : band.altitudeKm} km`, lx - 10, ly - 4);
    });

    // Axis label
    ctx.fillStyle = "#1e3a5f";
    ctx.font = "9px sans-serif";
    ctx.fillText("Altitude (log scale, 300 – 42,000 km)", 30, h - 8);
  }, [bands]);

  if (loading) return <SkeletonCard rows={4} title="Debris Tracking" />;

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#e0f2fe]">Space Debris Tracking</h3>
        <p className="text-xs text-[#7dd3fc] mt-0.5">Density concentration by orbital altitude</p>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg bg-[#0a0e17]"
        style={{ height: 180 }}
      />

      {/* Band list */}
      <div className="space-y-1.5 mt-1">
        {(bands ?? []).map((b) => (
          <div key={b.altitudeKm} className="flex items-start gap-2">
            <span
              className="flex-shrink-0 mt-0.5 h-2 w-2 rounded-full"
              style={{ backgroundColor: RISK_COLOR[b.riskLevel] }}
            />
            <div className="min-w-0">
              <span className="text-[#e0f2fe] text-xs font-mono">
                {b.altitudeKm >= 1000
                  ? `${(b.altitudeKm / 1000).toFixed(1)}k km`
                  : `${b.altitudeKm} km`}
              </span>
              <span className="text-[#7dd3fc] text-xs ml-1.5">
                ·{" "}{b.objectCount.toLocaleString()} objects
              </span>
              <p className="text-[10px] text-[#1e3a5f] leading-tight mt-0.5">{b.description}</p>
            </div>
            {/* Density bar */}
            <div className="ml-auto flex-shrink-0 flex items-center gap-1">
              <div className="w-16 h-1.5 rounded-full bg-[#1e3a5f]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(b.densityScore / 10) * 100}%`,
                    backgroundColor: RISK_COLOR[b.riskLevel],
                  }}
                />
              </div>
              <span className="text-[10px] text-[#7dd3fc] w-3 tabular-nums">{b.densityScore}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Collision Risk widget */
function CollisionWidget({ events, loading }: { events?: ConjunctionEvent[]; loading: boolean }) {
  if (loading) return <SkeletonCard rows={5} title="Collision Risk Monitor" />;

  const sorted = [...(events ?? [])].sort((a, b) => b.probabilityPct - a.probabilityPct).slice(0, 5);

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#e0f2fe]">Collision Risk Monitor</h3>
        <p className="text-xs text-[#7dd3fc] mt-0.5">Top 5 conjunction events</p>
      </div>

      <div className="space-y-2">
        {sorted.map((ev) => {
          const rc   = RISK_COLOR[ev.riskLevel];
          const tca  = new Date(ev.tcaUtc);
          const hoursAway = Math.round((tca.getTime() - Date.now()) / 3_600_000);

          return (
            <div
              key={ev.id}
              className="rounded-lg border p-3"
              style={{
                borderColor: rc + "44",
                backgroundColor: rc + "0a",
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#e0f2fe] truncate">{ev.primaryObject}</p>
                  <p className="text-[10px] text-[#7dd3fc]">vs. {ev.secondaryObject}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className="text-xs font-bold font-mono"
                    style={{ color: rc }}
                  >
                    {ev.probabilityPct.toFixed(2)}%
                  </span>
                  <p className="text-[10px] text-[#7dd3fc]">{ev.missDistanceKm.toFixed(2)} km</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#7dd3fc]">
                  TCA in{" "}
                  <span className="text-[#38bdf8]">{hoursAway}h</span>
                  {" "}({tca.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })})
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium capitalize"
                  style={{ backgroundColor: rc + "22", color: rc }}
                >
                  {ev.riskLevel}
                </span>
              </div>
              <p className="text-[10px] text-[#7dd3fc] leading-relaxed">{ev.riskNarrative}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Communication Outlook widget */
function CommOutlookWidget({
  outlook,
  loading,
}: {
  outlook?: { hfRadio: string; satellite: string; gps: string; summary: string };
  loading: boolean;
}) {
  if (loading) return <SkeletonCard rows={3} title="Communication Outlook" />;

  const channels = [
    { label: "HF Radio",      status: outlook?.hfRadio   ?? "Unknown" },
    { label: "Satellite Link", status: outlook?.satellite ?? "Unknown" },
    { label: "GPS/GNSS",       status: outlook?.gps       ?? "Unknown" },
  ];

  const statusColor = (s: string) =>
    s === "Clear" || s === "Nominal" || s === "Normal" ? "#4ade80"
    : s.toLowerCase().includes("disrupt") ? "#f87171"
    : "#38bdf8";

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#e0f2fe]">Communication Outlook</h3>
        <p className="text-xs text-[#7dd3fc] mt-0.5">Ionospheric &amp; link conditions</p>
      </div>

      {/* Channel status */}
      <div className="grid grid-cols-3 gap-2">
        {channels.map((ch) => {
          const sc = statusColor(ch.status);
          return (
            <div key={ch.label} className="rounded-lg bg-[#111f36] p-2.5 text-center">
              <p className="text-[10px] text-[#7dd3fc] mb-1">{ch.label}</p>
              <span
                className="inline-block h-2 w-2 rounded-full mb-1"
                style={{ backgroundColor: sc }}
              />
              <p className="text-xs font-semibold" style={{ color: sc }}>
                {ch.status}
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {outlook?.summary && (
        <p className="text-xs text-[#7dd3fc] leading-relaxed border-l-2 border-[#1e3a5f] pl-2">
          {outlook.summary}
        </p>
      )}

      {/* Granite note */}
      <p className="text-[10px] text-[#1e3a5f]">
        Derived from Kp index forecast · updated every 30 min
      </p>
    </div>
  );
}

/** Skeleton loader card */
function SkeletonCard({ rows, title }: { rows: number; title: string }) {
  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 animate-pulse">
      <div className="h-4 w-36 rounded bg-[#1e3a5f] mb-3" />
      <div className="text-xs text-[#1e3a5f] mb-3">{title}</div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-[#1e3a5f] mb-2" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PredictiveDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<PredictiveResponse, Error>({
    queryKey: ["predictive"],
    queryFn:  fetchPredictive,
    refetchInterval: 30 * 60 * 1000, // 30 min (Granite outputs cached same duration)
    staleTime:       29 * 60 * 1000,
  });

  const alertC = data ? ALERT_COLOR[data.forecast?.alertLevel ?? "green"] : "#7dd3fc";

  return (
    <div className="min-h-screen bg-[#000000] px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e0f2fe] tracking-tight">
            Predictive Monitoring
          </h1>
          <p className="text-sm text-[#7dd3fc] mt-1">
            3-day IBM Granite space weather forecast · debris &amp; collision risk · comms outlook
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e3a5f] text-[#7dd3fc] hover:text-[#e0f2fe] hover:border-[#38bdf8] transition-colors disabled:opacity-50"
        >
          <svg className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Alert level banner */}
      {data && (
        <div
          className="mb-5 rounded-xl border px-4 py-2.5 flex items-center gap-3"
          style={{ borderColor: alertC + "44", backgroundColor: alertC + "0f" }}
        >
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: alertC }} />
          <p className="text-sm" style={{ color: alertC }}>
            <strong>Alert level: {data.forecast?.alertLevel?.toUpperCase()}</strong>
            {" · "}
            <span className="text-[#7dd3fc]">{data.quickAssessment?.summary}</span>
          </p>
        </div>
      )}

      {isError && (
        <div className="mb-4 rounded-xl border border-[#f87171] border-opacity-40 bg-[rgba(248,113,113,0.08)] p-4">
          <p className="text-sm text-[#f87171]">Failed to load predictive data: {error.message}</p>
        </div>
      )}

      {/* 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ForecastWidget   forecast={data?.forecast}           loading={isLoading} />
        <CommOutlookWidget outlook={data?.commOutlook}        loading={isLoading} />
        <CollisionWidget  events={data?.conjunctionEvents}   loading={isLoading} />
        <DebrisWidget     bands={data?.debrisBands}           loading={isLoading} />
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-[#1e3a5f] pt-4 flex flex-wrap gap-4 text-[10px] text-[#1e3a5f]">
        <span>Forecast: IBM Granite LLM · NOAA SWPC data</span>
        <span>Debris: ESA Space Debris Office catalog</span>
        <span>Conjunctions: Demo data (Space-Track auth required for live)</span>
      </div>
    </div>
  );
}
