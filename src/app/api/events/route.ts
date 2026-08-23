import { NextResponse } from "next/server";

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface EonetEvent {
  id: string;
  title: string;
  type: string;
  date: string;
  coordinates: [number, number] | null; // [lng, lat]
}

export interface NearEarthComet {
  id: string;
  name: string;
  closeApproachDate: string;
  distanceAU: string;
  velocityKmh: string;
}

interface EonetCategory { id: string; title: string }
interface EonetGeometry { date: string; coordinates: unknown }
interface EonetRawEvent {
  id: string;
  title: string;
  categories: EonetCategory[];
  geometry: EonetGeometry[];
}

interface NasaEonetResponse {
  events: EonetRawEvent[];
}

interface NeoWsCloseApproach {
  close_approach_date: string;
  relative_velocity: { kilometers_per_hour: string };
  miss_distance: { astronomical: string };
}

interface NeoWsObject {
  id: string;
  name: string;
  close_approach_data: NeoWsCloseApproach[];
  is_potentially_hazardous_asteroid: boolean;
}

interface NeoWsResponse {
  near_earth_objects: Record<string, NeoWsObject[]>;
}

/* ── GET /api/events ─────────────────────────────────────────────────────── */

export async function GET() {
  const nasaKey = process.env.NEXT_PUBLIC_NASA_API_KEY;
  const hasKey = nasaKey && !nasaKey.startsWith("your_");

  /* ── EONET natural events ─────────────────────────────────────────────── */
  let eonetEvents: EonetEvent[] = [];
  try {
    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20";
    const res = await fetch(url, { next: { revalidate: 180 } });
    if (res.ok) {
      const data = (await res.json()) as NasaEonetResponse;
      eonetEvents = data.events.map((ev) => {
        const geo = ev.geometry[0];
        let coords: [number, number] | null = null;
        if (geo && Array.isArray(geo.coordinates)) {
          const c = geo.coordinates as number[];
          if (c.length >= 2) coords = [c[0], c[1]];
        }
        return {
          id: ev.id,
          title: ev.title,
          type: ev.categories[0]?.title ?? "Unknown",
          date: geo?.date ?? new Date().toISOString(),
          coordinates: coords,
        };
      });
    }
  } catch { /* use empty */ }

  /* ── NeoWs near-Earth objects (comets / asteroids) ───────────────────── */
  let comets: NearEarthComet[] = [];
  try {
    const today = new Date().toISOString().slice(0, 10);
    const plusWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const apiParam = hasKey ? `&api_key=${nasaKey}` : "&api_key=DEMO_KEY";
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${plusWeek}${apiParam}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as NeoWsResponse;
      const allObjects = Object.values(data.near_earth_objects).flat();
      comets = allObjects
        .filter((o) => o.close_approach_data.length > 0)
        .slice(0, 8)
        .map((o) => {
          const ca = o.close_approach_data[0];
          return {
            id: o.id,
            name: o.name.replace(/[()]/g, "").trim(),
            closeApproachDate: ca.close_approach_date,
            distanceAU: parseFloat(ca.miss_distance.astronomical).toFixed(3),
            velocityKmh: Math.round(
              parseFloat(ca.relative_velocity.kilometers_per_hour)
            ).toLocaleString(),
          };
        });
    }
  } catch { /* use empty */ }

  /* Seed demo data if both APIs returned nothing */
  if (eonetEvents.length === 0) {
    eonetEvents = [
      { id: "EONET_5678", title: "Tropical Storm Ana", type: "Severe Storms", date: new Date().toISOString(), coordinates: [-85.2, 18.4] },
      { id: "EONET_5679", title: "Kīlauea Volcanic Activity", type: "Volcanoes", date: new Date().toISOString(), coordinates: [-155.3, 19.4] },
      { id: "EONET_5680", title: "Thomas Fire Progression", type: "Wildfires", date: new Date().toISOString(), coordinates: [-119.1, 34.3] },
    ];
  }
  if (comets.length === 0) {
    comets = [
      { id: "neo_1", name: "2024 BX1", closeApproachDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0,10), distanceAU: "0.021", velocityKmh: "52,400" },
      { id: "neo_2", name: "2024 CD3", closeApproachDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0,10), distanceAU: "0.048", velocityKmh: "38,900" },
      { id: "neo_3", name: "433 Eros", closeApproachDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0,10), distanceAU: "0.112", velocityKmh: "29,100" },
    ];
  }

  /* Stats counts for the dashboard */
  const stats = {
    activeSpaceEvents: eonetEvents.length,
    weatherAlerts: eonetEvents.filter((e) =>
      ["Severe Storms", "Floods"].includes(e.type)
    ).length,
    upcomingComets: comets.length,
  };

  return NextResponse.json({ events: eonetEvents, comets, stats });
}
