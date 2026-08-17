import { NextResponse } from "next/server";
import type { MapEvent, MapEventCategory, MapEventType } from "@/lib/types";

/* ── Known observatory positions ────────────────────────────────────────── */
const OBSERVATORIES: MapEvent[] = [
  {
    id: "obs-nasa-hq",
    type: "observatory",
    category: "observatory",
    lat: 38.88,
    lng: -77.01,
    title: "NASA Headquarters",
    description: "NASA HQ — Washington D.C. Space administration & mission control coordination.",
    severity: "low",
  },
  {
    id: "obs-esa",
    type: "observatory",
    category: "observatory",
    lat: 49.58,
    lng: 8.67,
    title: "ESA ESOC",
    description: "European Space Agency Operations Centre — Darmstadt, Germany.",
    severity: "low",
  },
  {
    id: "obs-jaxa",
    type: "observatory",
    category: "observatory",
    lat: 36.11,
    lng: 140.1,
    title: "JAXA Tsukuba Space Center",
    description: "Japan Aerospace Exploration Agency — Tsukuba Science City, Japan.",
    severity: "low",
  },
  {
    id: "obs-isro",
    type: "observatory",
    category: "observatory",
    lat: 13.02,
    lng: 80.27,
    title: "ISRO SHAR",
    description: "Indian Space Research Organisation launch centre — Sriharikota, India.",
    severity: "low",
  },
  {
    id: "obs-csa",
    type: "observatory",
    category: "observatory",
    lat: 45.52,
    lng: -73.38,
    title: "CSA Headquarters",
    description: "Canadian Space Agency — Longueuil, Québec, Canada.",
    severity: "low",
  },
  {
    id: "obs-jsc",
    type: "observatory",
    category: "observatory",
    lat: 29.55,
    lng: -95.09,
    title: "NASA Johnson Space Center",
    description: "Mission control for crewed spaceflight including ISS operations — Houston, TX.",
    severity: "low",
  },
  {
    id: "obs-ksc",
    type: "observatory",
    category: "observatory",
    lat: 28.57,
    lng: -80.65,
    title: "NASA Kennedy Space Center",
    description: "Primary launch facility for NASA missions — Cape Canaveral, FL.",
    severity: "low",
  },
  {
    id: "obs-baikonur",
    type: "observatory",
    category: "observatory",
    lat: 45.92,
    lng: 63.34,
    title: "Baikonur Cosmodrome",
    description: "World's first and largest operational space launch facility — Kazakhstan.",
    severity: "low",
  },
  {
    id: "obs-kourou",
    type: "observatory",
    category: "observatory",
    lat: 5.24,
    lng: -52.77,
    title: "Guiana Space Centre",
    description: "ESA / Arianespace launch facility — Kourou, French Guiana.",
    severity: "low",
  },
];

/* ── Static space weather monitoring stations ────────────────────────────── */
const SPACE_EVENTS: MapEvent[] = [
  {
    id: "sw-noaa-swpc",
    type: "space",
    category: "space",
    lat: 38.99,
    lng: -105.18,
    title: "NOAA Space Weather Center",
    description: "Monitors solar activity, geomagnetic storms and issues space weather alerts.",
    severity: "medium",
  },
  {
    id: "sw-arecibo-alt",
    type: "space",
    category: "space",
    lat: 37.69,
    lng: -122.17,
    title: "Chabot Space & Science Center",
    description: "Bay Area space science center tracking near-Earth objects.",
    severity: "low",
  },
];

/* ── Demo incident / weather events (supplement live EONET data) ─────────── */
const STATIC_INCIDENTS: MapEvent[] = [
  {
    id: "inc-sahara-dust",
    type: "weather",
    category: "weather",
    lat: 23.0,
    lng: 12.0,
    title: "Saharan Dust Plume",
    description: "Large dust aerosol plume tracked across North Africa, impacting aviation.",
    severity: "medium",
  },
  {
    id: "inc-pacific-storm",
    type: "storm",
    category: "weather",
    lat: 18.4,
    lng: 140.2,
    title: "Western Pacific Typhoon Activity",
    description: "Active typhoon development zone — multiple low-pressure systems being monitored.",
    severity: "high",
  },
];

/* ── Fetch live EONET events and convert to MapEvents ───────────────────── */
async function fetchEonetEvents(): Promise<MapEvent[]> {
  try {
    const res = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=25",
      { next: { revalidate: 180 } }
    );
    if (!res.ok) return [];

    interface EonetRaw {
      events: Array<{
        id: string;
        title: string;
        categories: { id: string; title: string }[];
        geometry: { date: string; coordinates: unknown }[];
      }>;
    }

    const data = (await res.json()) as EonetRaw;

    return data.events
      .filter((e) => e.geometry?.length > 0)
      .map((e): MapEvent | null => {
        const geo = e.geometry[0];
        const coords = geo?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const [lng, lat] = coords as [number, number];

        const catTitle = (e.categories[0]?.title ?? "").toLowerCase();
        let type: MapEventType = "other";
        let category: MapEventCategory = "incident";

        if (catTitle.includes("storm") || catTitle.includes("flood")) {
          type = "storm"; category = "weather";
        } else if (catTitle.includes("wildfire") || catTitle.includes("fire")) {
          type = "wildfire"; category = "incident";
        } else if (catTitle.includes("volcan")) {
          type = "volcano"; category = "incident";
        } else if (catTitle.includes("drought")) {
          type = "drought"; category = "weather";
        } else if (catTitle.includes("earthquake")) {
          type = "earthquake"; category = "incident";
        }

        return {
          id: e.id,
          type,
          category,
          lat,
          lng,
          title: e.title,
          description: `${e.categories[0]?.title ?? "Natural event"} — ${new Date(geo.date as string).toLocaleDateString("en-GB", { timeZone: "UTC" })}`,
          severity: catTitle.includes("storm") || catTitle.includes("wildfire") ? "high" : "medium",
        };
      })
      .filter((e): e is MapEvent => e !== null);
  } catch {
    return [];
  }
}

/* ── GET /api/map ────────────────────────────────────────────────────────── */
export async function GET() {
  const liveEvents = await fetchEonetEvents();

  const allEvents: MapEvent[] = [
    ...OBSERVATORIES,
    ...SPACE_EVENTS,
    ...STATIC_INCIDENTS,
    ...liveEvents,
  ];

  /* Deduplicate by id */
  const seen = new Set<string>();
  const unique = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const stats = {
    total: unique.length,
    byCategory: unique.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return NextResponse.json({ events: unique, stats });
}
