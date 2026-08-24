/**
 * /src/lib/api/sources/nasa.ts
 *
 * NASA Open Data API adapters:
 *   - NeoWs (Near Earth Objects)
 *   - DONKI (space weather / solar events)
 *   - EONET already handled in ingestion; only DONKI flares added here
 *
 * All adapters normalize into TelemetryData + domain-specific shapes.
 */

import { appCache, TTL, withCache } from "@/lib/api/cache";
import type {
  TelemetryData,
  TelemetryStatus,
  NeoObject,
  TelemetrySource,
} from "@/lib/types";

const NASA_KEY = () =>
  process.env.NEXT_PUBLIC_NASA_API_KEY &&
  !process.env.NEXT_PUBLIC_NASA_API_KEY.startsWith("your_")
    ? process.env.NEXT_PUBLIC_NASA_API_KEY
    : "DEMO_KEY";

/* ── NEO Demo fallback ───────────────────────────────────────────────────── */
const NEO_DEMO: NeoObject[] = [
  { id: "neo-1", name: "2024 BX1",   closeApproachDate: futureDate(2),  distanceKm: 3_145_000, distanceAU: 0.021, velocityKmh: 52_400, diameter: { minKm: 0.12, maxKm: 0.28 }, isPotentiallyHazardous: false, absoluteMagnitude: 24.3 },
  { id: "neo-2", name: "2024 CD3",   closeApproachDate: futureDate(5),  distanceKm: 7_192_000, distanceAU: 0.048, velocityKmh: 38_900, diameter: { minKm: 0.08, maxKm: 0.18 }, isPotentiallyHazardous: false, absoluteMagnitude: 25.1 },
  { id: "neo-3", name: "433 Eros",   closeApproachDate: futureDate(8),  distanceKm: 16_800_000, distanceAU: 0.112, velocityKmh: 29_100, diameter: { minKm: 8.5, maxKm: 34.4 }, isPotentiallyHazardous: false, absoluteMagnitude: 11.2 },
  { id: "neo-4", name: "1999 AN10",  closeApproachDate: futureDate(14), distanceKm: 22_300_000, distanceAU: 0.149, velocityKmh: 43_800, diameter: { minKm: 0.7, maxKm: 1.6 },  isPotentiallyHazardous: true,  absoluteMagnitude: 17.9 },
];

function futureDate(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

/* ── NeoWs adapter ───────────────────────────────────────────────────────── */

export async function fetchNeoData(): Promise<{
  neos: NeoObject[];
  telemetry: TelemetryData[];
}> {
  return withCache("nasa-neo", async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${endDate}&api_key=${NASA_KEY()}`;

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);

      if (!res.ok) throw new Error(`NeoWs HTTP ${res.status}`);

      interface NeoWsCA { close_approach_date: string; relative_velocity: { kilometers_per_hour: string }; miss_distance: { astronomical: string; kilometers: string } }
      interface NeoWsObj { id: string; name: string; close_approach_data: NeoWsCA[]; is_potentially_hazardous_asteroid: boolean; absolute_magnitude_h: number; estimated_diameter: { kilometers: { estimated_diameter_min: number; estimated_diameter_max: number } } }
      interface NeoWsResp { near_earth_objects: Record<string, NeoWsObj[]> }

      const data = (await res.json()) as NeoWsResp;
      const allObjects = Object.values(data.near_earth_objects).flat();

      const neos: NeoObject[] = allObjects
        .filter((o) => o.close_approach_data.length > 0)
        .slice(0, 8)
        .map((o): NeoObject => {
          const ca = o.close_approach_data[0];
          return {
            id: o.id,
            name: o.name.replace(/[()]/g, "").trim(),
            closeApproachDate: ca.close_approach_date,
            distanceKm: Math.round(parseFloat(ca.miss_distance.kilometers)),
            distanceAU: parseFloat(parseFloat(ca.miss_distance.astronomical).toFixed(4)),
            velocityKmh: Math.round(parseFloat(ca.relative_velocity.kilometers_per_hour)),
            diameter: {
              minKm: parseFloat(o.estimated_diameter.kilometers.estimated_diameter_min.toFixed(3)),
              maxKm: parseFloat(o.estimated_diameter.kilometers.estimated_diameter_max.toFixed(3)),
            },
            isPotentiallyHazardous: o.is_potentially_hazardous_asteroid,
            absoluteMagnitude: o.absolute_magnitude_h,
          };
        });

      const telemetry: TelemetryData[] = neos.map((neo): TelemetryData => ({
        id: `neo-tel-${neo.id}`,
        source: "NASA",
        type: "neo",
        timestamp: new Date().toISOString(),
        values: {
          distanceAU: neo.distanceAU,
          distanceKm: neo.distanceKm,
          velocityKmh: neo.velocityKmh,
          isPotentiallyHazardous: neo.isPotentiallyHazardous,
        },
        unit: "AU",
        status: neo.isPotentiallyHazardous ? "warning" : "nominal",
        label: neo.name,
      }));

      return { neos, telemetry };
    } catch (err) {
      console.warn("[nasa/neo] fetch failed, using demo:", (err as Error).message);
      const telemetry: TelemetryData[] = NEO_DEMO.map((neo): TelemetryData => ({
        id: `neo-tel-${neo.id}`,
        source: "Demo" as TelemetrySource,
        type: "neo",
        timestamp: new Date().toISOString(),
        values: { distanceAU: neo.distanceAU, velocityKmh: neo.velocityKmh, isPotentiallyHazardous: neo.isPotentiallyHazardous },
        unit: "AU",
        status: "nominal",
        label: neo.name,
      }));
      return { neos: NEO_DEMO, telemetry };
    }
  }, TTL.APOD /* 24 h for NEO — data changes slowly */);
}

/* ── DONKI solar flares adapter ──────────────────────────────────────────── */

export async function fetchDonkiFlares(): Promise<TelemetryData[]> {
  return withCache("nasa-donki-flares", async () => {
    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const url = `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_KEY()}`;

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);

      if (!res.ok) throw new Error(`DONKI HTTP ${res.status}`);

      interface DonkiFlare { flrID: string; beginTime: string; peakTime: string; classType: string; sourceLocation?: string }
      const flares = (await res.json()) as DonkiFlare[];

      const classToStatus = (cls: string): TelemetryStatus => {
        if (cls.startsWith("X")) return "critical";
        if (cls.startsWith("M")) return "warning";
        if (cls.startsWith("C")) return "elevated";
        return "nominal";
      };

      return flares.slice(0, 10).map((f): TelemetryData => ({
        id: `donki-flare-${f.flrID}`,
        source: "NASA",
        type: "solar_flare",
        timestamp: f.peakTime || f.beginTime,
        values: { classType: f.classType, sourceLocation: f.sourceLocation ?? "Unknown" },
        unit: "GOES class",
        status: classToStatus(f.classType),
        label: `Solar Flare ${f.classType}`,
      }));
    } catch (err) {
      console.warn("[nasa/donki] fetch failed, using demo:", (err as Error).message);
      return [
        { id: "donki-demo-1", source: "Demo" as TelemetrySource, type: "solar_flare", timestamp: new Date(Date.now() - 3600000).toISOString(), values: { classType: "M2.5", sourceLocation: "N12W34" }, unit: "GOES class", status: "warning", label: "Solar Flare M2.5" },
        { id: "donki-demo-2", source: "Demo" as TelemetrySource, type: "solar_flare", timestamp: new Date(Date.now() - 86400000).toISOString(), values: { classType: "C7.1", sourceLocation: "S05E12" }, unit: "GOES class", status: "elevated", label: "Solar Flare C7.1" },
      ];
    }
  }, TTL.NASA_RSS);
}
