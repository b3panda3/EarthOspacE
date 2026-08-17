"use client";

/**
 * MissionTimeline
 *
 * Gantt-like horizontal timeline showing planned activities
 * with risk zones overlaid as coloured bands.
 *
 * Renders purely in SVG for precise layout control.
 *
 * Props:
 *   params      — MissionParameters (for start/end/activities)
 *   assessment  — MissionAssessmentResult (for risk bands per activity)
 *   forecast    — SpaceWeatherForecast (for background condition bands)
 */

import type { MissionParameters, MissionAssessmentResult, SpaceWeatherForecast } from "@/lib/types";

interface MissionTimelineProps {
  params:     MissionParameters;
  assessment: MissionAssessmentResult;
  forecast:   SpaceWeatherForecast;
}

const RISK_COLOR: Record<string, string> = {
  critical: "#f87171",
  high:     "#fb923c",
  moderate: "#e6c974",
  low:      "#4ade80",
};

const RISK_BG: Record<string, string> = {
  critical: "rgba(248,113,113,0.18)",
  high:     "rgba(251,146,60,0.15)",
  moderate: "rgba(230,201,116,0.12)",
  low:      "rgba(74,222,128,0.10)",
};

const VERDICT_COLOR: Record<string, string> = {
  "GO":          "#4ade80",
  "NO-GO":       "#f87171",
  "CONDITIONAL": "#e6c974",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MissionTimeline({ params, assessment, forecast }: MissionTimelineProps) {
  const startMs = new Date(params.plannedStart).getTime();
  const endMs   = new Date(params.plannedEnd).getTime();
  const totalMs = endMs - startMs;

  if (totalMs <= 0) return null;

  const toX = (ms: number, width: number) =>
    Math.max(0, Math.min(width, ((ms - startMs) / totalMs) * width));

  // Partition activities evenly across the window
  const slotMs = totalMs / params.activities.length;
  const activitySlots = params.activities.map((act, i) => ({
    activity: act,
    startMs:  startMs + i * slotMs,
    endMs:    startMs + (i + 1) * slotMs,
    guidance: assessment.activityGuidance.find(
      (g) => g.activity.toLowerCase().includes(act.toLowerCase().split(" ")[0])
    ),
  }));

  // Width constants (SVG coordinate space)
  const W    = 800;
  const H    = 160;
  const PAD  = { left: 12, right: 12, top: 18, bottom: 36 };
  const chartW = W - PAD.left - PAD.right;
  const barH   = 32;
  const barY   = PAD.top + 10;

  // Forecast day bands (day1 = first third, day2 = second third, etc.)
  const dayBands = Array.from({ length: params.activities.length > 0 ? 3 : 0 }, (_, i) => {
    const forecastKp = forecast.metrics.find((m) => m.metric === "kp_index" && m.day === i + 1);
    const max = forecastKp?.predictedMax ?? 2;
    const level =
      max >= 7 ? "critical" : max >= 5 ? "high" : max >= 3 ? "moderate" : "low";
    return { xStart: (i / 3) * chartW, width: chartW / 3, level };
  });

  const verdictC = VERDICT_COLOR[assessment.verdict] ?? "#96938d";

  return (
    <div className="rounded-xl border border-[#605943] bg-[#24231f] p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#e8e7e5]">Mission Timeline</h3>
          <p className="text-xs text-[#96938d] mt-0.5">
            {formatDate(params.plannedStart)} &nbsp;{formatTime(params.plannedStart)}
            {" — "}
            {formatTime(params.plannedEnd)} UTC ·{" "}
            {params.durationHours}h window
          </p>
        </div>
        <span
          className="self-start sm:self-auto px-3 py-1 rounded-full text-sm font-bold tracking-wide"
          style={{ backgroundColor: verdictC + "22", color: verdictC, border: `1px solid ${verdictC}55` }}
        >
          {assessment.verdict}
        </span>
      </div>

      {/* SVG timeline */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 480 }}
          aria-label="Mission timeline"
        >
          {/* Background forecast condition bands */}
          {dayBands.map((band, i) => (
            <rect
              key={`band-${i}`}
              x={PAD.left + band.xStart}
              y={PAD.top}
              width={band.width}
              height={barH + 40}
              fill={RISK_BG[band.level]}
              rx={2}
            />
          ))}

          {/* Activity bars */}
          {activitySlots.map((slot, i) => {
            const x  = PAD.left + toX(slot.startMs, chartW);
            const x2 = PAD.left + toX(slot.endMs,   chartW);
            const w  = Math.max(4, x2 - x);
            const rl = slot.guidance?.riskLevel ?? "low";
            const label = slot.activity.replace(/_/g, " ").toUpperCase();

            return (
              <g key={`act-${i}`}>
                {/* Bar */}
                <rect
                  x={x + 2}
                  y={barY}
                  width={w - 4}
                  height={barH}
                  fill={RISK_COLOR[rl] + "33"}
                  stroke={RISK_COLOR[rl]}
                  strokeWidth={1.5}
                  rx={4}
                />
                {/* Label inside bar */}
                <text
                  x={x + w / 2}
                  y={barY + barH / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={RISK_COLOR[rl]}
                  fontSize={9}
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {label.length > 14 ? label.slice(0, 13) + "…" : label}
                </text>
              </g>
            );
          })}

          {/* Time axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const ms = startMs + pct * totalMs;
            const x  = PAD.left + pct * chartW;
            return (
              <g key={`tick-${pct}`}>
                <line
                  x1={x} y1={barY + barH + 4}
                  x2={x} y2={barY + barH + 10}
                  stroke="#605943" strokeWidth={1}
                />
                <text
                  x={x}
                  y={barY + barH + 22}
                  textAnchor="middle"
                  fill="#96938d"
                  fontSize={9}
                >
                  {formatTime(new Date(ms).toISOString())}
                </text>
              </g>
            );
          })}

          {/* Base line */}
          <line
            x1={PAD.left} y1={barY + barH + 4}
            x2={PAD.left + chartW} y2={barY + barH + 4}
            stroke="#3a3830" strokeWidth={1}
          />

          {/* Legend */}
          {["low","moderate","high","critical"].map((rl, i) => (
            <g key={`legend-${rl}`} transform={`translate(${PAD.left + i * 95}, ${H - 14})`}>
              <rect width={10} height={10} fill={RISK_COLOR[rl] + "55"} stroke={RISK_COLOR[rl]} strokeWidth={1} rx={2} />
              <text x={14} y={9} fill="#96938d" fontSize={9}>{rl.charAt(0).toUpperCase() + rl.slice(1)}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Optimal timing note */}
      {assessment.optimalTiming && (
        <p className="mt-2 text-xs text-[#96938d] border-t border-[#3a3830] pt-2">
          <span className="text-[#e6c974]">⏱ Optimal:</span> {assessment.optimalTiming}
        </p>
      )}
    </div>
  );
}
