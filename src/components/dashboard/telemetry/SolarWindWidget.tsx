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
  elevated: "#38bdf8",
  warning:  "#fb923c",
  critical: "#f87171",
  unknown:  "#7dd3fc",
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
      <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-[#1e3a5f] mb-3" />
        <div className="h-32 rounded bg-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#e0f2fe]">Solar Wind</h3>
          <p className="text-xs text-[#7dd3fc] mt-0.5">NOAA/DSCOVR real-time</p>
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
          <div className="rounded-lg bg-[#111f36] p-2">
            <p className="text-xs text-[#7dd3fc]">Speed</p>
            <p className="text-lg font-mono font-bold text-[#38bdf8]">
              {latest.speedKms.toFixed(0)}
            </p>
            <p className="text-xs text-[#7dd3fc]">km/s</p>
            {trend && <TrendBadge trend={trend.trend} changePercent={trend.changePercent} />}
          </div>
          <div className="rounded-lg bg-[#111f36] p-2">
            <p className="text-xs text-[#7dd3fc]">Density</p>
            <p className="text-lg font-mono font-bold text-[#a78bfa]">
              {latest.densityN.toFixed(1)}
            </p>
            <p className="text-xs text-[#7dd3fc]">n/cm³</p>
          </div>
          <div className="rounded-lg bg-[#111f36] p-2">
            <p className="text-xs text-[#7dd3fc]">Temp</p>
            <p className="text-lg font-mono font-bold text-[#e0f2fe]">
              {(latest.tempK / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-[#7dd3fc]">K</p>
          </div>
        </div>
      )}

      {/* Area chart */}
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#7dd3fc", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#7dd3fc", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#7dd3fc", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "#050a14",
              border: "1px solid #1e3a5f",
              borderRadius: 8,
              fontSize: 11,
              color: "#e0f2fe",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#7dd3fc", paddingTop: 4 }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="speed"
            name="Speed (km/s)"
            stroke="#38bdf8"
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
            stroke="#a78bfa"
            strokeWidth={1.5}
            fill="url(#densityGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Sparkline hint */}
      {trend && (
        <div className="mt-2 border-t border-[#1e3a5f] pt-2">
          <p className="text-xs text-[#7dd3fc] mb-1">7-pt moving avg: {trend.movingAverage.toFixed(1)} km/s</p>
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
