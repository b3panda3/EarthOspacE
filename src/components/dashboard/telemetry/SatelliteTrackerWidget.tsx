"use client";

/**
 * SatelliteTrackerWidget
 *
 * Displays orbital parameters and status for the static TRACKED_SATELLITES list.
 * Each row shows agency badge, name, altitude, inclination, orbital period,
 * and a colour-coded status dot.
 *
 * Props:
 *   satellites  — TrackedSatellite[] from TRACKED_SATELLITES static catalog
 *   isLoading
 */

import type { TrackedSatellite } from "@/lib/types";

interface SatelliteTrackerWidgetProps {
  satellites: TrackedSatellite[];
  isLoading?: boolean;
}

const STATUS_STYLES: Record<TrackedSatellite["status"], { dot: string; label: string }> = {
  active:   { dot: "#4ade80", label: "Active"   },
  inactive: { dot: "#7dd3fc", label: "Inactive" },
  decaying: { dot: "#fb923c", label: "Decaying" },
  unknown:  { dot: "#1e3a5f", label: "Unknown"  },
};

const AGENCY_COLORS: Record<string, string> = {
  NASA:           "#38bdf8",
  ESA:            "#a78bfa",
  NOAA:           "#60a5fa",
  "NOAA/NASA":    "#60a5fa",
  "NASA/Roscosmos": "#fb923c",
  USAF:           "#a3e635",
};

function agencyColor(agency: string): string {
  return AGENCY_COLORS[agency] ?? "#7dd3fc";
}

function altitudeBar(altKm: number): number {
  // ISS ≈ 408 km → short bar; GPS ≈ 20 200 km → full bar
  return Math.min(100, (altKm / 21_000) * 100);
}

export default function SatelliteTrackerWidget({
  satellites,
  isLoading = false,
}: SatelliteTrackerWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4 animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-[#1e3a5f]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-[#1e3a5f]" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#e0f2fe]">Tracked Satellites</h3>
          <p className="text-xs text-[#7dd3fc] mt-0.5">Static orbital catalog</p>
        </div>
        <span className="text-xs text-[#7dd3fc] tabular-nums">
          {satellites.filter((s) => s.status === "active").length}/{satellites.length} active
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="text-left text-[#7dd3fc] font-normal pb-1.5 pr-2">Satellite</th>
              <th className="text-right text-[#7dd3fc] font-normal pb-1.5 pr-2">Alt (km)</th>
              <th className="text-right text-[#7dd3fc] font-normal pb-1.5 pr-2">Inc (°)</th>
              <th className="text-right text-[#7dd3fc] font-normal pb-1.5">Period</th>
            </tr>
          </thead>
          <tbody>
            {satellites.map((sat) => {
              const st    = STATUS_STYLES[sat.status];
              const aClr  = agencyColor(sat.agency);
              const bar   = altitudeBar(sat.orbitAltitudeKm);
              const periodLabel =
                sat.periodMin >= 60
                  ? `${(sat.periodMin / 60).toFixed(1)} h`
                  : `${sat.periodMin.toFixed(1)} min`;

              return (
                <tr
                  key={sat.id}
                  className="border-b border-[#1e3a5f] last:border-0 hover:bg-[#111f36] transition-colors"
                >
                  {/* Name + agency + status */}
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: st.dot }}
                        title={st.label}
                      />
                      <div>
                        <p className="text-[#e0f2fe] font-medium leading-tight">{sat.name}</p>
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: aClr }}
                        >
                          {sat.agency}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Altitude + mini bar */}
                  <td className="py-2 pr-2 text-right">
                    <p className="text-[#e0f2fe] font-mono">
                      {sat.orbitAltitudeKm.toLocaleString()}
                    </p>
                    <div className="mt-0.5 h-0.5 rounded-full bg-[#1e3a5f] w-14 ml-auto">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${bar}%`, backgroundColor: aClr }}
                      />
                    </div>
                  </td>

                  {/* Inclination */}
                  <td className="py-2 pr-2 text-right text-[#7dd3fc] font-mono">
                    {sat.inclinationDeg.toFixed(1)}°
                  </td>

                  {/* Period */}
                  <td className="py-2 text-right text-[#7dd3fc] font-mono whitespace-nowrap">
                    {periodLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* NORAD note */}
      <p className="mt-3 text-[10px] text-[#1e3a5f]">
        NORAD IDs shown. No real-time TLE — static catalog only.
      </p>
    </div>
  );
}
