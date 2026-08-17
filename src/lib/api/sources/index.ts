/**
 * /src/lib/api/sources/index.ts
 *
 * Barrel export + aggregated telemetry fetcher.
 * Runs all source adapters in parallel and returns a unified payload.
 */

export { fetchNeoData, fetchDonkiFlares } from "@/lib/api/sources/nasa";
export { fetchSolarWind, fetchKpIndex } from "@/lib/api/sources/noaa";
export { fetchCopernicusProducts } from "@/lib/api/sources/copernicus";

import { fetchNeoData, fetchDonkiFlares } from "@/lib/api/sources/nasa";
import { fetchSolarWind, fetchKpIndex } from "@/lib/api/sources/noaa";
import { fetchCopernicusProducts } from "@/lib/api/sources/copernicus";
import type { TelemetryData, NeoObject, TrackedSatellite } from "@/lib/types";
import type { SolarWindPoint, KpPoint } from "@/lib/api/sources/noaa";
import type { CopernicusProduct } from "@/lib/api/sources/copernicus";

/* ── Static satellite catalog (no free real-time TLE API without auth) ───── */
export const TRACKED_SATELLITES: TrackedSatellite[] = [
  { id: "iss",      name: "ISS (ZARYA)",      noradId: 25544, status: "active",   orbitAltitudeKm: 408,  inclinationDeg: 51.6, periodMin: 92.9,  agency: "NASA/Roscosmos", launchDate: "1998-11-20" },
  { id: "hubble",   name: "Hubble ST",         noradId: 20580, status: "active",   orbitAltitudeKm: 537,  inclinationDeg: 28.5, periodMin: 95.4,  agency: "NASA",           launchDate: "1990-04-24" },
  { id: "terra",    name: "Terra (EOS AM-1)",  noradId: 25994, status: "active",   orbitAltitudeKm: 705,  inclinationDeg: 98.2, periodMin: 98.9,  agency: "NASA",           launchDate: "1999-12-18" },
  { id: "aura",     name: "Aura",              noradId: 28376, status: "active",   orbitAltitudeKm: 705,  inclinationDeg: 98.2, periodMin: 98.8,  agency: "NASA",           launchDate: "2004-07-15" },
  { id: "sentinel2a", name: "Sentinel-2A",    noradId: 40697, status: "active",   orbitAltitudeKm: 786,  inclinationDeg: 98.6, periodMin: 100.6, agency: "ESA",            launchDate: "2015-06-23" },
  { id: "sentinel5p", name: "Sentinel-5P",    noradId: 42969, status: "active",   orbitAltitudeKm: 824,  inclinationDeg: 98.7, periodMin: 101.3, agency: "ESA",            launchDate: "2017-10-13" },
  { id: "gps-iif-2",  name: "GPS IIF-2",      noradId: 37753, status: "active",   orbitAltitudeKm: 20_200, inclinationDeg: 55.0, periodMin: 717.9, agency: "USAF",        launchDate: "2011-07-16" },
  { id: "noaa-20",    name: "NOAA-20",         noradId: 43013, status: "active",   orbitAltitudeKm: 824,  inclinationDeg: 98.7, periodMin: 101.3, agency: "NOAA/NASA",     launchDate: "2017-11-18" },
];

/* ── Aggregated response ─────────────────────────────────────────────────── */

export interface AggregatedTelemetry {
  telemetry: TelemetryData[];
  neos: NeoObject[];
  solarWind: SolarWindPoint[];
  kpPoints: KpPoint[];
  kpCurrent: number;
  satellites: TrackedSatellite[];
  copernicusProducts: CopernicusProduct[];
  fetchedAt: string;
}

export async function fetchAllTelemetry(): Promise<AggregatedTelemetry> {
  const [neoResult, flares, windResult, kpResult, copResult] = await Promise.allSettled([
    fetchNeoData(),
    fetchDonkiFlares(),
    fetchSolarWind(),
    fetchKpIndex(),
    fetchCopernicusProducts(),
  ]);

  const get = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const neo     = get(neoResult, { neos: [], telemetry: [] });
  const flareTel = get(flares, [] as TelemetryData[]);
  const wind    = get(windResult, { points: [], telemetry: [] });
  const kp      = get(kpResult, { points: [], current: 0, telemetry: { id: "kp-fallback", source: "Demo" as const, type: "kp_index" as const, timestamp: new Date().toISOString(), values: { kp: 0 }, unit: "Kp", status: "unknown" as const, label: "Kp Index" } });
  const cop     = get(copResult, { products: [], telemetry: [] });

  const allTelemetry: TelemetryData[] = [
    ...neo.telemetry,
    ...flareTel,
    ...wind.telemetry,
    kp.telemetry,
    ...cop.telemetry,
  ];

  return {
    telemetry:          allTelemetry,
    neos:               neo.neos,
    solarWind:          wind.points,
    kpPoints:           kp.points,
    kpCurrent:          kp.current,
    satellites:         TRACKED_SATELLITES,
    copernicusProducts: cop.products,
    fetchedAt:          new Date().toISOString(),
  };
}
