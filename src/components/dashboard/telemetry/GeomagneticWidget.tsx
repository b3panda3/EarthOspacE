"use client";

/**
 * GeomagneticWidget
 *
 * Custom SVG arc gauge for the planetary Kp index (0–9 scale).
 *
 * Colour zones:
 *   0–3   → green  (#4ade80) — quiet
 *   4–5   → amber  (#38bdf8) — active / G-storm watch
 *   6–9   → red    (#f87171) — severe geomagnetic storm
 *
 * Also renders a mini sparkline of the last 20 Kp readings.
 */

import type { KpPoint } from "@/lib/api/sources/noaa";
import type { TelemetryStatus } from "@/lib/types";
import SparklineChart, { TrendBadge } from "./SparklineChart";
import type { TrendAnalysis } from "@/lib/types";

interface GeomagneticWidgetProps {
  kpCurrent: number;
  kpPoints: KpPoint[];
  status: TelemetryStatus;
  trend?: TrendAnalysis;
  isLoading?: boolean;
}

// ─── Gauge maths ──────────────────────────────────────────────────────────────
// We render a 180° half-circle arc (SVG viewBox 0 0 200 110).
// The arc goes from 180° (left) to 0° (right) at radius 80.

const CX = 100, CY = 100, R = 78;

function polarToXY(deg: number, r = R): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
}

function kpToAngle(kp: number): number {
  // kp 0→9 maps to 180°→0°
  const clamped = Math.max(0, Math.min(9, kp));
  return 180 - (clamped / 9) * 180;
}

function arcPath(startDeg: number, endDeg: number, r = R): string {
  const [sx, sy] = polarToXY(startDeg, r);
  const [ex, ey] = polarToXY(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 0 ${ex} ${ey}`;
}

// Colour zones: 180°→120° green, 120°→60° amber, 60°→0° red
const ZONES = [
  { from: 180, to: 120, color: "#4ade80", label: "Quiet" },
  { from: 120, to:  60, color: "#38bdf8", label: "Active" },
  { from:  60, to:   0, color: "#f87171", label: "Storm"  },
];

function kpColor(kp: number): string {
  if (kp >= 6) return "#f87171";
  if (kp >= 4) return "#38bdf8";
  return "#4ade80";
}

function kpLabel(kp: number): string {
  if (kp >= 7) return "Severe Storm";
  if (kp >= 6) return "Strong Storm";
  if (kp >= 5) return "G-Storm";
  if (kp >= 4) return "Active";
  if (kp >= 2) return "Quiet";
  return "Very Quiet";
}

export default function GeomagneticWidget({
  kpCurrent,
  kpPoints,
  status,
  trend,
  isLoading = false,
}: GeomagneticWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 animate-pulse">
        <div className="h-4 w-36 rounded bg-[#1e3a5f] mb-3" />
        <div className="h-32 rounded bg-[#1e3a5f]" />
      </div>
    );
  }

  const kpNum = Number(kpCurrent) || 0;
  const needleAngle = kpToAngle(kpNum);
  const [nx, ny]   = polarToXY(needleAngle, R - 10);
  const color       = kpColor(kpNum);

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-[#e0f2fe]">Geomagnetic Activity</h3>
          <p className="text-xs text-[#7dd3fc] mt-0.5">Planetary Kp Index</p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: color + "22", color }}
        >
          {kpLabel(kpNum)}
        </span>
      </div>

      {/* SVG Gauge */}
      <svg viewBox="0 0 200 108" className="w-full" aria-label={`Kp index ${kpNum.toFixed(1)}`}>
        {/* Track background */}
        <path
          d={arcPath(180, 0)}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth={14}
          strokeLinecap="round"
        />

        {/* Coloured zone arcs */}
        {ZONES.map((z) => (
          <path
            key={z.label}
            d={arcPath(z.from, z.to)}
            fill="none"
            stroke={z.color}
            strokeWidth={6}
            strokeLinecap="butt"
            opacity={0.45}
          />
        ))}

        {/* Active fill arc (0 → current kp angle) */}
        <path
          d={arcPath(180, needleAngle)}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={5} fill={color} />

        {/* Centre reading */}
        <text x={CX} y={CY - 20} textAnchor="middle" fill="#e0f2fe" fontSize={26} fontWeight="bold" fontFamily="monospace">
          {kpNum.toFixed(1)}
        </text>
        <text x={CX} y={CY - 6} textAnchor="middle" fill="#7dd3fc" fontSize={10}>
          Kp
        </text>

        {/* Zone labels */}
        <text x={18}  y={104} fill="#4ade80" fontSize={9} textAnchor="middle">Quiet</text>
        <text x={100} y={24}  fill="#38bdf8" fontSize={9} textAnchor="middle">Active</text>
        <text x={182} y={104} fill="#f87171" fontSize={9} textAnchor="middle">Storm</text>

        {/* Scale ticks 0–9 */}
        {Array.from({ length: 10 }, (_, i) => {
          const angle = kpToAngle(i);
          const [tx, ty] = polarToXY(angle, R + 12);
          return (
            <text key={i} x={tx} y={ty} fill="#1e3a5f" fontSize={8} textAnchor="middle" dominantBaseline="middle">
              {i}
            </text>
          );
        })}
      </svg>

      {/* Kp history sparkline */}
      {kpPoints.length > 0 && (
        <div className="mt-1 border-t border-[#1e3a5f] pt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[#7dd3fc]">24-hr history</p>
            {trend && <TrendBadge trend={trend.trend} changePercent={trend.changePercent} />}
          </div>
          <SparklineChart
            data={kpPoints.map((p) => ({ value: Number(p.kp) || 0, timestamp: p.timestamp }))}
            color={color}
            height={32}
            showTooltip
            unit="Kp"
          />
        </div>
      )}
    </div>
  );
}
