/**
 * /src/lib/api/ingestion.ts
 *
 * Unified data-ingestion pipeline.
 *
 * Defines typed DataSource interfaces for every external data provider and a
 * DataAggregator class that runs all sources concurrently, deduplicates the
 * results by cacheKey, and returns a single unified data object.
 *
 * Cache integration: each DataSource has a `ttl` (ms) used to store raw
 * results in the shared LRU cache so we never hammer external APIs.
 */

import { appCache, TTL, withCache } from "@/lib/api/cache";
import type {
  NewsItem,
  MapEvent,
  ObservatoryNews,
  NewsCategory,
  MapEventType,
  MapEventCategory,
  ObservatoryAgency,
} from "@/lib/types";

// ─── Base DataSource interface ────────────────────────────────────────────────

export interface DataSource<TItem> {
  /** Unique identifier — used as the LRU cache prefix. */
  readonly id: string;
  /** Cache TTL in milliseconds. */
  readonly ttl: number;
  /** Fetch + normalise data from the source. Never throws — returns [] on error. */
  fetch(): Promise<TItem[]>;
}

// ─── Specific source data types ───────────────────────────────────────────────

export type NormalizedNewsItem   = NewsItem;
export type NormalizedMapEvent   = MapEvent;
export type NormalizedObsNews    = ObservatoryNews;

export interface WeatherDataPoint {
  city: string;
  country: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  description: string;
  icon: string;
  windMs: number;
  /** cacheKey for deduplication */
  id: string;
}

// ─── NASA Breaking News DataSource ───────────────────────────────────────────

export class NasaNewsDataSource implements DataSource<NormalizedNewsItem> {
  readonly id = "nasa-news";
  readonly ttl = TTL.NASA_RSS;

  private readonly FEEDS = [
    { url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",                 category: "space" as NewsCategory },
    { url: "https://earthobservatory.nasa.gov/feeds/earth-observatory.rss",  category: "environment" as NewsCategory },
    { url: "https://www.nasa.gov/rss/dyn/solar_flares.rss",                  category: "space" as NewsCategory },
  ];

  private extractTag(block: string, tag: string): string {
    const m = block.match(
      new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`,
        "i"
      )
    );
    return (m?.[1] ?? m?.[2] ?? "").trim();
  }

  private parseRss(xml: string, category: NewsCategory, idx: number): NormalizedNewsItem[] {
    const items: NormalizedNewsItem[] = [];
    const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const b = m[1];
      const title = this.extractTag(b, "title");
      if (!title) continue;
      const rawDesc = this.extractTag(b, "description") || this.extractTag(b, "summary");
      const summary = rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
      const link = this.extractTag(b, "link");
      const pubDate = this.extractTag(b, "pubDate") || this.extractTag(b, "dc:date");
      items.push({
        id:             `nasa-${idx}-${items.length}-${Date.now()}`,
        title,
        summary,
        flashCommentary: "",
        category,
        source:         "NASA",
        link:           link || undefined,
        timestamp:      pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
    return items.slice(0, 5);
  }

  async fetch(): Promise<NormalizedNewsItem[]> {
    return withCache(this.id, async () => {
      const results = await Promise.allSettled(
        this.FEEDS.map(async ({ url, category }, idx) => {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5_000);
          try {
            const res = await fetch(url, { signal: ctrl.signal });
            clearTimeout(t);
            if (!res.ok) return [];
            return this.parseRss(await res.text(), category, idx);
          } catch { return []; }
        })
      );
      return results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
    }, this.ttl);
  }
}

// ─── Weather DataSource ───────────────────────────────────────────────────────

export class WeatherDataSource implements DataSource<WeatherDataPoint> {
  readonly id = "weather";
  readonly ttl = TTL.WEATHER;

  private readonly CITIES = [
    { name: "Houston",  country: "US" },
    { name: "Baikonur", country: "KZ" },
    { name: "Kourou",   country: "GF" },
  ];

  private readonly DEMO: WeatherDataPoint[] = [
    { id: "weather-Houston",  city: "Houston",  country: "US", tempC: 32, feelsLikeC: 36, humidity: 78, description: "partly cloudy", icon: "02d", windMs: 4.5 },
    { id: "weather-Baikonur", city: "Baikonur", country: "KZ", tempC: 18, feelsLikeC: 16, humidity: 42, description: "clear sky",     icon: "01d", windMs: 7.2 },
    { id: "weather-Kourou",   city: "Kourou",   country: "GF", tempC: 28, feelsLikeC: 33, humidity: 85, description: "light rain",    icon: "10d", windMs: 3.1 },
  ];

  async fetch(): Promise<WeatherDataPoint[]> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey.startsWith("your_")) return this.DEMO;

    return withCache(this.id, async () => {
      const settled = await Promise.allSettled(
        this.CITIES.map(async ({ name, country }) => {
          const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(name)},${country}&appid=${apiKey}&units=metric`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`OWM ${res.status}`);
          interface OWM {
            name: string;
            main: { temp: number; feels_like: number; humidity: number };
            weather: { description: string; icon: string }[];
            wind: { speed: number };
            sys: { country: string };
          }
          const d = (await res.json()) as OWM;
          return {
            id:          `weather-${d.name}`,
            city:        d.name,
            country:     d.sys.country,
            tempC:       Math.round(d.main.temp),
            feelsLikeC:  Math.round(d.main.feels_like),
            humidity:    d.main.humidity,
            description: d.weather[0]?.description ?? "",
            icon:        d.weather[0]?.icon ?? "01d",
            windMs:      d.wind.speed,
          } satisfies WeatherDataPoint;
        })
      );
      return settled.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
    }, this.ttl);
  }
}

// ─── EONET (NASA Events) DataSource ──────────────────────────────────────────

export class EonetDataSource implements DataSource<NormalizedMapEvent> {
  readonly id = "eonet";
  readonly ttl = TTL.EONET;

  async fetch(): Promise<NormalizedMapEvent[]> {
    return withCache(this.id, async () => {
      try {
        const res = await fetch(
          "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20"
        );
        if (!res.ok) return [];

        interface EonetRaw {
          events: Array<{
            id: string;
            title: string;
            categories: { title: string }[];
            geometry: { date: string; coordinates: unknown }[];
          }>;
        }
        const data = (await res.json()) as EonetRaw;

        return data.events
          .filter((e) => e.geometry?.length > 0)
          .map((e): NormalizedMapEvent | null => {
            const geo = e.geometry[0];
            const coords = geo?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) return null;
            const [lng, lat] = coords as [number, number];
            const catTitle = (e.categories[0]?.title ?? "").toLowerCase();

            let type: MapEventType = "other";
            let category: MapEventCategory = "incident";

            if (catTitle.includes("storm") || catTitle.includes("flood")) { type = "storm"; category = "weather"; }
            else if (catTitle.includes("wildfire") || catTitle.includes("fire")) { type = "wildfire"; category = "incident"; }
            else if (catTitle.includes("volcan")) { type = "volcano"; category = "incident"; }
            else if (catTitle.includes("drought")) { type = "drought"; category = "weather"; }
            else if (catTitle.includes("earthquake")) { type = "earthquake"; category = "incident"; }

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
          .filter((e): e is NormalizedMapEvent => e !== null);
      } catch { return []; }
    }, this.ttl);
  }
}

// ─── Observatory DataSource ───────────────────────────────────────────────────

export class ObservatoryDataSource implements DataSource<NormalizedObsNews> {
  readonly id = "observatory";
  readonly ttl = TTL.OBSERVATORY;

  /** Demo items when feeds are offline */
  private readonly DEMO: NormalizedObsNews[] = [
    {
      id: "obs-demo-1",
      agency: "NASA" as ObservatoryAgency,
      title: "Solar Cycle 25 Approaches Maximum Activity",
      summary: "NASA and NOAA predict Solar Cycle 25 will reach its peak intensity earlier and stronger than anticipated.",
      aiContext: "This solar maximum has direct implications for satellite operations and space weather monitoring.",
      relevanceScore: 8,
      tags: ["solar cycle", "space weather", "satellite"],
      date: new Date().toISOString(),
    },
    {
      id: "obs-demo-2",
      agency: "ESA" as ObservatoryAgency,
      title: "Euclid Mission Returns First Science Data",
      summary: "The European Space Agency's Euclid dark energy telescope has released its first tranche of science data.",
      aiContext: "Euclid's weak-lensing maps will reshape our understanding of dark matter distribution in the observable universe.",
      relevanceScore: 7,
      tags: ["dark energy", "telescope", "cosmology"],
      date: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  async fetch(): Promise<NormalizedObsNews[]> {
    return withCache(this.id, async () => {
      // In production this would call the /api/observatory endpoint;
      // we return demo data here so the pipeline works standalone.
      return this.DEMO;
    }, this.ttl);
  }
}

// ─── Aggregated output shape ──────────────────────────────────────────────────

export interface AggregatedData {
  news:        NormalizedNewsItem[];
  weather:     WeatherDataPoint[];
  mapEvents:   NormalizedMapEvent[];
  observatory: NormalizedObsNews[];
  /** ISO timestamp of when this aggregation was produced */
  aggregatedAt: string;
}

// ─── DataAggregator ───────────────────────────────────────────────────────────

export class DataAggregator {
  constructor(
    private readonly sources: {
      news:        DataSource<NormalizedNewsItem>;
      weather:     DataSource<WeatherDataPoint>;
      mapEvents:   DataSource<NormalizedMapEvent>;
      observatory: DataSource<NormalizedObsNews>;
    }
  ) {}

  /** Run all sources in parallel and deduplicate results by id. */
  async aggregate(): Promise<AggregatedData> {
    const [news, weather, mapEvents, observatory] = await Promise.all([
      this.sources.news.fetch(),
      this.sources.weather.fetch(),
      this.sources.mapEvents.fetch(),
      this.sources.observatory.fetch(),
    ]);

    return {
      news:        this.dedup(news,        "id"),
      weather:     this.dedup(weather,     "id"),
      mapEvents:   this.dedup(mapEvents,   "id"),
      observatory: this.dedup(observatory, "id"),
      aggregatedAt: new Date().toISOString(),
    };
  }

  private dedup<T extends { id: string }>(items: T[], _key: "id"): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }
}

// ─── Default singleton aggregator ────────────────────────────────────────────

export const defaultAggregator = new DataAggregator({
  news:        new NasaNewsDataSource(),
  weather:     new WeatherDataSource(),
  mapEvents:   new EonetDataSource(),
  observatory: new ObservatoryDataSource(),
});
