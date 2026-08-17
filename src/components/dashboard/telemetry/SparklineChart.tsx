"use client";

/**
 * SparklineChart
 *
 * Tiny Recharts LineChart used as an inline trend indicator.
 * No axes, no legend — pure signal.
 *
 * Props:
 *   data        — array of { value: number }
 *   color       — stroke colour (default: gold #e6c974)
 *   width/height— defaults 120 × 40
 *   trend       — "up" | "down" | "flat" → drives arrow + colour override
 */

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface SparklineProps {
  data: { value: number; timestamp?: string }[];
  color?: string;
  width?: number | string;
  height?: number;
  trend?: "up" | "down" | "flat";
  unit?: string;
  showTooltip?: boolean;
}

const TREND_COLORS = {
  up:   "#4ade80", // green
  down: "#f87171", // red
  flat: "#e6c974", // gold
};

export default function SparklineChart({
  data,
  color,
  width = "100%",
  height = 40,
  trend = "flat",
  unit = "",
  showTooltip = false,
}: SparklineProps) {
  const stroke = color ?? TREND_COLORS[trend];
  const numWidth = typeof width === "string" ? undefined : width;

  return (
    <ResponsiveContainer width={numWidth ?? "100%"} height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: "#24231f",
              border: "1px solid #605943",
              borderRadius: 6,
              fontSize: 11,
              color: "#e8e7e5",
            }}
            formatter={(v) => [`${(v as number).toFixed(1)} ${unit}`, ""]}
            labelFormatter={() => ""}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Trend arrow badge ─────────────────────────────────────────────────────────

export function TrendBadge({
  trend,
  changePercent,
}: {
  trend: "up" | "down" | "flat";
  changePercent: number;
}) {
  const arrow   = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const colorCls =
    trend === "up"   ? "text-green-400" :
    trend === "down" ? "text-red-400"   : "text-[#e6c974]";

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${colorCls}`}>
      {arrow} {Math.abs(changePercent).toFixed(1)}%
    </span>
  );
}
