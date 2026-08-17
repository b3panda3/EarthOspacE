"use client";

/**
 * SolarWindWidget
 *
 * Recharts AreaChart showing 20-point real-time solar wind speed + density.
 * Uses a gradient fill from gold → transparent.
 *
 * Props:
 *   points   — SolarWindPoint[] from NOAA adapter
 *   status   — current TelemetryStatus
 *   isLoading
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SolarWindPoint } from "@/lib/api/sources/noaa";
import type { TelemetryStatus } from "@/lib/types";
import SparklineChart, { TrendBadge } from "./SparklineChart";
import type { TrendAnalysis } from "@/lib/types";

interface SolarWindWidgetProps {
  points: SolarWindPoint[];
  status: TelemetryStatus;
  trend?: TrendAnalysis;
  isLoading?: boolean;
}

const STATUS_COLOR: Record<TelemetryStatus, string> = {
  nominal:  "#4ade80",
  elevated: "#e6c974",
  warning:  "#fb923c",
  critical: "#f87171",
  unknown:  "#96938d",
};

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

export default function SolarWindWidget({
  points,
  status,
  trend,
  isLoading = false,
}: SolarWindWidgetProps) {
  const latest    = points[points.length - 1];
  const color     = STATUS_COLOR[status];

  const chartData = points.map((p) => ({
    time:    fmt(p.timestamp),
    speed:   parseFloat(p.speedKms.toFixed(1)),
    density: parseFloat(p.densityN.toFixed(2)),
  }));

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#3a3830] bg-[#24231f] p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-[#3a3830] mb-3" />
        <div className="h-32 rounded bg-[#3a3830]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#605943] bg-[#24231f] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#e8e7e5]">Solar Wind</h3>
          <p className="text-xs text-[#96938d] mt-0.5">NOAA/DSCOVR real-time</p>
        </div>
        <div className="text-right">
          <span
            className="inline-block h-2 w-2 rounded-full mr-1"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs capitalize" style={{ color }}>
            {status}
          </span>
        </div>
      </div>

      {/* Current values row */}
      {latest && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-[#29271f] p-2">
            <p className="text-xs text-[#96938d]">Speed</p>
            <p className="text-lg font-mono font-bold text-[#e6c974]">
              {latest.speedKms.toFixed(0)}
            </p>
            <p className="text-xs text-[#96938d]">km/s</p>
            {trend && <TrendBadge trend={trend.trend} changePercent={trend.changePercent} />}
          </div>
          <div className="rounded-lg bg-[#29271f] p-2">
            <p className="text-xs text-[#96938d]">Density</p>
            <p className="text-lg font-mono font-bold text-[#8369ce]">
              {latest.densityN.toFixed(1)}
            </p>
            <p className="text-xs text-[#96938d]">n/cm³</p>
          </div>
          <div className="rounded-lg bg-[#29271f] p-2">
            <p className="text-xs text-[#96938d]">Temp</p>
            <p className="text-lg font-mono font-bold text-[#e8e7e5]">
              {(latest.tempK / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-[#96938d]">K</p>
          </div>
        </div>
      )}

      {/* Area chart */}
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#e6c974" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#e6c974" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8369ce" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#8369ce" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#3a3830" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#96938d", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#96938d", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#96938d", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "#24231f",
              border: "1px solid #605943",
              borderRadius: 8,
              fontSize: 11,
              color: "#e8e7e5",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#96938d", paddingTop: 4 }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="speed"
            name="Speed (km/s)"
            stroke="#e6c974"
            strokeWidth={1.5}
            fill="url(#speedGrad)"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="density"
            name="Density (n/cm³)"
            stroke="#8369ce"
            strokeWidth={1.5}
            fill="url(#densityGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Sparkline hint */}
      {trend && (
        <div className="mt-2 border-t border-[#3a3830] pt-2">
          <p className="text-xs text-[#96938d] mb-1">7-pt moving avg: {trend.movingAverage.toFixed(1)} km/s</p>
          <SparklineChart
            data={trend.dataPoints.map((d) => ({ value: d.value, timestamp: d.timestamp }))}
            trend={trend.trend}
            height={28}
            showTooltip
            unit="km/s"
          />
        </div>
      )}
    </div>
  );
}
