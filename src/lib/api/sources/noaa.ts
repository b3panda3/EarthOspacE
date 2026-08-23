/**
 * /src/lib/api/sources/noaa.ts
 *
 * NOAA Space Weather Prediction Center adapters:
 *   - Real-time solar wind (ACE/DSCOVR)
 *   - Kp geomagnetic index (3-hour planetary index)
 *   - Solar flare reports (SWPC)
 *
 * Primary endpoints:
 *   https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json
 *   https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json
 *   https://services.swpc.noaa.gov/json/planetary_k_index_1m.json
 */

import { withCache, TTL } from "@/lib/api/cache";
import type { TelemetryData, TelemetryStatus, TelemetrySource } from "@/lib/types";

const BASE = "https://services.swpc.noaa.gov";

/* ── Status helpers ──────────────────────────────────────────────────────── */

function kpStatus(kp: number): TelemetryStatus {
  if (kp >= 7) return "critical";
  if (kp >= 5) return "warning";
  if (kp >= 4) return "elevated";
  return "nominal";
}

function windSpeedStatus(speed: number): TelemetryStatus {
  if (speed > 800) return "critical";
  if (speed > 600) return "warning";
  if (speed > 450) return "elevated";
  return "nominal";
}

/* ── Solar Wind Plasma ───────────────────────────────────────────────────── */

export interface SolarWindPoint {
  timestamp: string;
  speedKms: number;      // bulk speed km/s
  densityN: number;      // proton density n/cm³
  tempK: number;         // proton temperature K
}

export async function fetchSolarWind(): Promise<{
  points: SolarWindPoint[];
  telemetry: TelemetryData[];
}> {
  return withCache("noaa-solar-wind", async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6_000);
      // plasma: [time_tag, density, speed, temperature]
      const res = await fetch(`${BASE}/products/solar-wind/plasma-2-hour.json`, { signal: ctrl.signal });
      clearTimeout(t);

      if (!res.ok) throw new Error(`NOAA plasma HTTP ${res.status}`);

      const raw = (await res.json()) as (string | number)[][];
      // First row is header
      const rows = raw.slice(1).filter(
        (r) => r[0] && r[2] && parseFloat(String(r[2])) > 0
      );

      const points: SolarWindPoint[] = rows.slice(-20).map((r) => ({
        timestamp: String(r[0]).replace(" ", "T") + "Z",
        densityN:  Number(parseFloat(String(r[1])).toFixed(2)) || 0,
        speedKms:  Number(parseFloat(String(r[2])).toFixed(1)) || 0,
        tempK:     parseFloat(parseFloat(String(r[3])).toFixed(0)),
      }));

      const latest = points[points.length - 1];
      const telemetry: TelemetryData[] = latest
        ? [
            {
              id:        "noaa-sw-speed",
              source:    "NOAA",
              type:      "solar_wind_speed",
              timestamp: latest.timestamp,
              values:    { speedKms: latest.speedKms },
              unit:      "km/s",
              status:    windSpeedStatus(latest.speedKms),
              label:     "Solar Wind Speed",
            },
            {
              id:        "noaa-sw-density",
              source:    "NOAA",
              type:      "solar_wind_density",
              timestamp: latest.timestamp,
              values:    { densityN: latest.densityN },
              unit:      "n/cm³",
              status:    latest.densityN > 20 ? "warning" : "nominal",
              label:     "Solar Wind Density",
            },
          ]
        : [];

      return { points, telemetry };
    } catch (err) {
      console.warn("[noaa/solar-wind] fetch failed, using demo:", (err as Error).message);
      const now = Date.now();
      const demoPoints: SolarWindPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(now - (19 - i) * 6 * 60_000).toISOString(),
        speedKms:  380 + Math.sin(i * 0.5) * 40 + Math.random() * 20,
        densityN:  5.2 + Math.sin(i * 0.3) * 2 + Math.random() * 1,
        tempK:     85_000 + Math.sin(i * 0.4) * 10_000,
      }));
      return {
        points: demoPoints,
        telemetry: [
          { id: "noaa-sw-speed",   source: "Demo" as TelemetrySource, type: "solar_wind_speed",   timestamp: new Date().toISOString(), values: { speedKms: 410 }, unit: "km/s", status: "nominal", label: "Solar Wind Speed"   },
          { id: "noaa-sw-density", source: "Demo" as TelemetrySource, type: "solar_wind_density", timestamp: new Date().toISOString(), values: { densityN: 6.1 }, unit: "n/cm³", status: "nominal", label: "Solar Wind Density" },
        ],
      };
    }
  }, TTL.WEATHER /* 5 min */);
}

/* ── Kp Index ────────────────────────────────────────────────────────────── */

export interface KpPoint {
  timestamp: string;
  kp: number;
}

export async function fetchKpIndex(): Promise<{
  points: KpPoint[];
  current: number;
  telemetry: TelemetryData;
}> {
  return withCache("noaa-kp", async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6_000);
      const res = await fetch(`${BASE}/json/planetary_k_index_1m.json`, { signal: ctrl.signal });
      clearTimeout(t);

      if (!res.ok) throw new Error(`NOAA Kp HTTP ${res.status}`);

      interface KpRow { time_tag: string; kp: number }
      const raw = (await res.json()) as KpRow[];

      const points: KpPoint[] = raw
        .filter((r) => r.kp != null)
        .slice(-20)
        .map((r) => ({ timestamp: r.time_tag, kp: Number(r.kp) || 0 }));

      const current = Number(points[points.length - 1]?.kp) || 0;

      return {
        points,
        current,
        telemetry: {
          id:        "noaa-kp",
          source:    "NOAA",
          type:      "kp_index",
          timestamp: points[points.length - 1]?.timestamp ?? new Date().toISOString(),
          values:    { kp: current },
          unit:      "Kp",
          status:    kpStatus(current),
          label:     "Geomagnetic Kp Index",
        },
      };
    } catch (err) {
      console.warn("[noaa/kp] fetch failed, using demo:", (err as Error).message);
      const now = Date.now();
      const demoKp = Number((2.3 + Math.random() * 1.5).toFixed(1));
      const demoPoints: KpPoint[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(now - (19 - i) * 3 * 3_600_000).toISOString(),
        kp: Math.max(0, Math.min(9, 2.5 + Math.sin(i * 0.4) * 1.2 + Math.random() * 0.8)),
      }));
      return {
        points: demoPoints,
        current: demoKp,
        telemetry: {
          id: "noaa-kp", source: "Demo" as TelemetrySource, type: "kp_index",
          timestamp: new Date().toISOString(), values: { kp: demoKp },
          unit: "Kp", status: kpStatus(demoKp), label: "Geomagnetic Kp Index",
        },
      };
    }
  }, TTL.WEATHER);
}
