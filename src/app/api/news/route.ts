import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/watsonx";
import type { NewsItem } from "@/lib/types";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface RawFeedItem {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  category: NewsItem["category"];
  source: string;
}

/* ── NASA RSS sources ────────────────────────────────────────────────────── */

const NASA_FEEDS: { url: string; category: NewsItem["category"]; source: string }[] = [
  {
    url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    category: "space",
    source: "NASA Breaking News",
  },
  {
    url: "https://earthobservatory.nasa.gov/feeds/earth-observatory.rss",
    category: "environment",
    source: "NASA Earth Observatory",
  },
  {
    url: "https://www.nasa.gov/rss/dyn/solar_flares.rss",
    category: "space",
    source: "NASA Solar Flares",
  },
];

/* ── Minimal XML→item parser (no external dep) ───────────────────────────── */

function parseRss(xml: string, category: NewsItem["category"], source: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return (m?.[1] ?? m?.[2] ?? "").trim();
    };
    const title = get("title");
    const desc = get("description") || get("summary");
    const link = get("link");
    const pubDate = get("pubDate") || get("dc:date") || new Date().toISOString();
    if (title) {
      items.push({ title, summary: desc.replace(/<[^>]+>/g, "").slice(0, 300), link, pubDate, category, source });
    }
  }
  return items.slice(0, 20);
}

/* ── Fetch a single feed with timeout ───────────────────────────────────── */

async function fetchFeed(
  url: string,
  category: NewsItem["category"],
  source: string
): Promise<RawFeedItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 120 },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, category, source);
  } catch {
    return [];
  }
}

/* ── NewsAPI integration ─────────────────────────────────────────────────── */

interface NewsApiArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

async function fetchNewsApi(): Promise<RawFeedItem[]> {
  const key = process.env.NEXT_PUBLIC_NEWS_API_KEY;
  if (!key || key.startsWith("your_")) return [];

  try {
    const params = new URLSearchParams({
      q: "space OR NASA OR astronomy OR satellite",
      sortBy: "publishedAt",
      pageSize: "100",
      apiKey: key,
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = (await res.json()) as NewsApiResponse;
    if (data.status !== "ok" || !data.articles) return [];

    return data.articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .slice(0, 50)
      .map((a) => ({
        title: a.title,
        summary: (a.description ?? "").replace(/<[^>]+>/g, "").slice(0, 300),
        link: a.url,
        pubDate: a.publishedAt,
        category: "space" as const,
        source: a.source?.name ?? "NewsAPI",
      }));
  } catch {
    return [];
  }
}

/* ── Generate Granite flash commentary ──────────────────────────────────── */

async function generateFlash(
  item: RawFeedItem,
  userRole: string,
  missionType: string
): Promise<string> {
  try {
    const prompt = `Given this news article about ${item.category} for a ${userRole} on a ${missionType}, generate a creative 2-sentence news flash commentary that provides unique insight or connects this event to broader space exploration themes. Be factual but engaging.

Article title: ${item.title}
Summary: ${item.summary}

News flash:`;

    const reply = await chatCompletion([
      {
        role: "system",
        content:
          "You are an insightful space exploration analyst. Write exactly 2 sentences. Be specific, factual, and engaging. No preamble.",
      },
      { role: "user", content: prompt },
    ]);
    return reply.content.trim().slice(0, 300);
  } catch {
    return `${item.title} — a development worth monitoring for its implications on ${missionType} operations.`;
  }
}

/* ── Score article relevance to user interests ───────────────────────────── */

function relevanceScore(
  item: RawFeedItem,
  interests: Record<string, number> | undefined
): number {
  if (!interests) return 0;
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const catMap: Record<string, string[]> = {
    "Weather Patterns": ["weather", "storm", "climate", "atmosphere"],
    "Air Incidents": ["aircraft", "aviation", "flight", "air incident"],
    "Space Events": ["launch", "mission", "rocket", "spacecraft", "iss"],
    "Comet Tracking": ["comet", "asteroid", "near-earth", "nea"],
    "Transportation Advances": ["transport", "vehicle", "rover", "module"],
    "Astronomy News": ["galaxy", "star", "telescope", "astronomy", "black hole"],
    "Satellite Telemetry": ["satellite", "telemetry", "orbit", "signal"],
    "Space Weather": ["solar", "flare", "radiation", "magnetosphere", "aurora"],
  };
  let score = 0;
  for (const [cat, keywords] of Object.entries(catMap)) {
    const weight = (interests as Record<string, number>)[cat] ?? 0;
    if (keywords.some((kw) => text.includes(kw))) score += weight;
  }
  return score;
}

/* ── GET /api/news ───────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const userRole = req.nextUrl.searchParams.get("role") ?? "Space Enthusiast";
  const missionType = req.nextUrl.searchParams.get("mission") ?? "Ground-based Research";
  let interests: Record<string, number> | undefined;
  try {
    const raw = req.nextUrl.searchParams.get("interests");
    if (raw) interests = JSON.parse(decodeURIComponent(raw)) as Record<string, number>;
  } catch { /* ignore */ }

  /* Fetch all sources concurrently: NewsAPI (primary) + RSS feeds */
  const [newsApiItems, ...feedResults] = await Promise.all([
    fetchNewsApi(),
    ...NASA_FEEDS.map((f) => fetchFeed(f.url, f.category, f.source)),
  ]);
  const rawItems = [...newsApiItems, ...feedResults.flat()];

  /* Fallback seed articles when all sources are unavailable (dev/offline) */
  if (rawItems.length === 0) {
    rawItems.push(
      {
        title: "Solar Activity Reaches Cycle 25 Peak",
        summary: "NASA reports solar cycle 25 is approaching its predicted maximum, with increased sunspot activity and solar flares impacting satellite operations globally.",
        link: "#",
        pubDate: new Date().toISOString(),
        category: "space",
        source: "NASA (Demo)",
      },
      {
        title: "ISS Crew Completes Emergency EVA",
        summary: "Astronauts aboard the International Space Station completed an unscheduled spacewalk to repair a cooling system component that showed anomalous readings.",
        link: "#",
        pubDate: new Date().toISOString(),
        category: "space",
        source: "NASA (Demo)",
      },
      {
        title: "Category 4 Hurricane Approaches Gulf Coast",
        summary: "A powerful hurricane has intensified rapidly over the warm waters of the Gulf of Mexico, prompting mass evacuations across coastal communities.",
        link: "#",
        pubDate: new Date().toISOString(),
        category: "climate",
        source: "NOAA (Demo)",
      },
      {
        title: "Comet C/2024 A1 Makes Close Earth Pass",
        summary: "A newly discovered comet will pass within 0.35 AU of Earth next month, offering amateur astronomers a rare naked-eye viewing opportunity.",
        link: "#",
        pubDate: new Date().toISOString(),
        category: "astronomy",
        source: "JPL (Demo)",
      },
      {
        title: "Air Traffic Incident Over North Atlantic",
        summary: "An unusual convergence of flight paths triggered TCAS alerts for three commercial airliners over the North Atlantic corridor during peak traffic hours.",
        link: "#",
        pubDate: new Date().toISOString(),
        category: "general",
        source: "FAA (Demo)",
      },
      {
        title: "Artemis III Hardware Integration Begins",
        summary: "NASA engineers have begun integrating the core stage components for the Artemis III lunar landing mission, targeting a 2026 launch window.",
        link: "#",
        pubDate: new Date().toISOString(),
        category: "space",
        source: "NASA (Demo)",
      }
    );
  }

  /* Sort by relevance then date */
  const sorted = rawItems.sort((a, b) => {
    const scoreDiff = relevanceScore(b, interests) - relevanceScore(a, interests);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  /* Generate Granite commentary for top 3 articles (rate-limit friendly) */
  const topItems = sorted.slice(0, 12);
  const flashItems = topItems.slice(0, 3);
  const commentaries = await Promise.allSettled(
    flashItems.map((item) => generateFlash(item, userRole, missionType))
  );

  const newsItems: NewsItem[] = topItems.map((item, i) => ({
    id: `${item.source}-${i}-${Date.now()}`,
    title: item.title,
    summary: item.summary,
    flashCommentary:
      i < 3 && commentaries[i]?.status === "fulfilled"
        ? commentaries[i].value
        : `Mission update: ${item.title}`,
    category: item.category,
    source: item.source,
    timestamp: new Date(item.pubDate).toISOString(),
  }));

  return NextResponse.json({ items: newsItems, total: newsItems.length });
}
