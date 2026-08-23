"use client";

/**
 * NEOTrackerWidget
 *
 * Displays the day's closest Near-Earth Object approaches from NASA NeoWs.
 * Renders an approach dates table sorted by distance (closest first).
 * Potentially hazardous asteroids are highlighted in red.
 *
 * Props:
 *   neos       — NeoObject[] from NASA adapter
 *   isLoading
 */

import type { NeoObject } from "@/lib/types";

interface NEOTrackerWidgetProps {
  neos: NeoObject[];
  isLoading?: boolean;
}

function formatDist(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} M km`;
  return `${Math.round(km / 1000).toLocaleString()} k km`;
}

function formatVelocity(kmh: number): string {
  return `${Math.round(kmh / 1000).toLocaleString()} k km/h`;
}

function hazardLevel(neo: NeoObject): "safe" | "watch" | "hazardous" {
  if (neo.isPotentiallyHazardous) return "hazardous";
  if (neo.distanceAU < 0.05)      return "watch";
  return "safe";
}

const HAZARD_STYLES = {
  safe:      { badge: "#4ade80", bg: "transparent",          text: "#e0f2fe" },
  watch:     { badge: "#38bdf8", bg: "rgba(230,201,116,0.05)", text: "#38bdf8" },
  hazardous: { badge: "#f87171", bg: "rgba(248,113,113,0.08)", text: "#f87171" },
};

function diameterLabel(d: NeoObject["diameter"]): string {
  const avg = (d.minKm + d.maxKm) / 2;
  if (avg < 1) return `${(avg * 1000).toFixed(0)} m`;
  return `${avg.toFixed(2)} km`;
}

export default function NEOTrackerWidget({
  neos,
  isLoading = false,
}: NEOTrackerWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 animate-pulse space-y-3">
        <div className="h-4 w-44 rounded bg-[#1e3a5f]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-[#1e3a5f]" />
        ))}
      </div>
    );
  }

  const sorted = [...neos].sort((a, b) => a.distanceKm - b.distanceKm);
  const hazardous = sorted.filter((n) => n.isPotentiallyHazardous);

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#e0f2fe]">
            Near-Earth Objects
          </h3>
          <p className="text-xs text-[#7dd3fc] mt-0.5">NASA NeoWs — next 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-bold text-[#38bdf8]">{sorted.length}</p>
          <p className="text-[10px] text-[#7dd3fc]">objects</p>
        </div>
      </div>

      {/* Hazardous count banner */}
      {hazardous.length > 0 && (
        <div className="mb-3 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[#f87171] border-opacity-30 px-3 py-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#f87171] animate-pulse flex-shrink-0" />
          <p className="text-xs text-[#f87171]">
            <strong>{hazardous.length}</strong> potentially hazardous asteroid
            {hazardous.length > 1 ? "s" : ""} in approach window
          </p>
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-xs text-[#7dd3fc] py-4 text-center">No NEO data available</p>
      )}

      {/* Approach table */}
      <div className="space-y-1">
        {sorted.slice(0, 8).map((neo) => {
          const level  = hazardLevel(neo);
          const styles = HAZARD_STYLES[level];

          return (
            <div
              key={neo.id}
              className="rounded-lg px-3 py-2 border"
              style={{
                backgroundColor: styles.bg,
                borderColor: level === "hazardous"
                  ? "rgba(248,113,113,0.3)"
                  : level === "watch"
                  ? "rgba(230,201,116,0.2)"
                  : "#1e3a5f",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                {/* Name + close approach date */}
                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: styles.text }}
                  >
                    {neo.name.replace(/[()]/g, "")}
                  </p>
                  <p className="text-[10px] text-[#7dd3fc]">
                    {new Date(neo.closeApproachDate).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}Ø {diameterLabel(neo.diameter)}
                  </p>
                </div>

                {/* Distance + velocity */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-mono text-[#e0f2fe]">
                    {formatDist(neo.distanceKm)}
                  </p>
                  <p className="text-[10px] text-[#7dd3fc]">
                    {formatVelocity(neo.velocityKmh)}
                  </p>
                </div>

                {/* Hazard badge */}
                <span
                  className="flex-shrink-0 mt-0.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: styles.badge }}
                  title={level}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length > 8 && (
        <p className="mt-2 text-[10px] text-[#1e3a5f] text-right">
          +{sorted.length - 8} more objects
        </p>
      )}

      <p className="mt-3 text-[10px] text-[#1e3a5f]">
        Magnitudes H &lt; 22. Source: NASA NeoWs API.
      </p>
    </div>
  );
}
