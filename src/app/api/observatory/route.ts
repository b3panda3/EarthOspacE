import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, extractFirstJson } from "@/lib/ai/watsonx";
import { isDemoMode } from "@/lib/utils/demo";
import type { ObservatoryNews, ObservatoryAgency } from "@/lib/types";

/* ── HTML entity decoder (server-side) ────────────────────────────────── */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#8217;|&#39;/g, "'")
    .replace(/&#8216;|&#8218;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, "-")
    .replace(/&#8230;/g, "...")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/* ── Feed registry ───────────────────────────────────────────────────────── */

interface FeedDef {
  url: string;
  agency: ObservatoryAgency;
}

const FEEDS: FeedDef[] = [
  { url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",                 agency: "NASA"          },
  { url: "https://www.nasa.gov/rss/dyn/solar_flares.rss",                  agency: "NASA"          },
  { url: "https://earthobservatory.nasa.gov/feeds/earth-observatory.rss",  agency: "NASA"          },
  { url: "https://www.esa.int/rssfeed/Our_Activities/Space_Science",       agency: "ESA"           },
  { url: "https://spaceflightnow.com/feed/",                               agency: "SpaceFlightNow"},
  { url: "https://www.isro.gov.in/rss-feeds/latest-press-releases",       agency: "ISRO"          },
];

/* ── Minimal RSS → item array (no external dep) ─────────────────────────── */

interface RawItem {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  imageUrl: string;
  agency: ObservatoryAgency;
}

function extractTag(block: string, tag: string): string {
  const pattern = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>` +
    `|<${tag}[^>]*>([^<]*)<\\/${tag}>`,
    "i"
  );
  return (block.match(pattern)?.[1] ?? block.match(pattern)?.[2] ?? "").trim();
}

function extractImageUrl(block: string): string {
  // media:content, enclosure, or og:image fallback
  const media = block.match(/media:content[^/]*url="([^"]+)"/i)?.[1]
    ?? block.match(/<enclosure[^>]+url="([^"]+)"/i)?.[1]
    ?? block.match(/<img[^>]+src="([^"]+)"/i)?.[1]
    ?? "";
  return media;
}

function parseRss(xml: string, agency: ObservatoryAgency): RawItem[] {
  const items: RawItem[] = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const title = decodeHtmlEntities(extractTag(b, "title"));
    if (!title) continue;
    const raw = extractTag(b, "description") || extractTag(b, "summary") || extractTag(b, "content:encoded");
    const summary = decodeHtmlEntities(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500));
    const link = extractTag(b, "link");
    const pubDate = extractTag(b, "pubDate") || extractTag(b, "dc:date") || new Date().toISOString();
    const imageUrl = extractImageUrl(b);
    items.push({ title, summary, link, pubDate, imageUrl, agency });
  }
  return items.slice(0, 6);
}

/* ── Fetch a feed with 5 s timeout + Next.js revalidation ───────────────── */

async function fetchFeed(def: FeedDef): Promise<RawItem[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(def.url, { signal: ctrl.signal, next: { revalidate: 300 } });
    clearTimeout(t);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, def.agency);
  } catch { return []; }
}

/* ── NASA APOD (Image of the Day) ────────────────────────────────────────── */

async function fetchApod(): Promise<RawItem | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NASA_API_KEY;
    const key = apiKey && !apiKey.startsWith("your_") ? apiKey : "DEMO_KEY";
    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${key}`,
      { next: { revalidate: 86400 } }          // refresh once a day
    );
    if (!res.ok) return null;
    const d = await res.json() as {
      title: string; explanation: string; date: string; url: string; hdurl?: string; media_type: string;
    };
    return {
      title: `APOD: ${d.title}`,
      summary: d.explanation.slice(0, 500),
      link: "https://apod.nasa.gov/apod/astropix.html",
      pubDate: new Date(d.date).toISOString(),
      imageUrl: d.media_type === "image" ? (d.hdurl ?? d.url) : "",
      agency: "NASA" as ObservatoryAgency,
    };
  } catch { return null; }
}

/* ── Granite AI context enrichment ──────────────────────────────────────── */

interface AiEnrichment {
  aiContext: string;
  relevanceScore: number;
  tags: string[];
}

async function enrichWithGranite(
  item: RawItem,
  userRole: string,
  userInterests: string
): Promise<AiEnrichment> {
  const fallback: AiEnrichment = {
    aiContext: `${item.title} — a significant development in space science that merits attention for its broader implications.`,
    relevanceScore: 5,
    tags: [item.agency],
  };

  try {
    const prompt = `You are a space science communicator. Given this observatory news item from ${item.agency}, provide:
(a) a 2-sentence AI Context that explains why this matters for a ${userRole}
(b) a relevance score from 1-10 based on these interests: ${userInterests}
(c) up to 3 related topic tags as short strings

News title: ${item.title}
Summary: ${item.summary.slice(0, 250)}

Respond ONLY with valid JSON in this exact format:
{"aiContext":"...","relevanceScore":7,"tags":["tag1","tag2"]}`;

    const reply = await chatCompletion([
      { role: "system", content: "You are a concise space science AI. Respond only with the JSON object requested, no markdown, no extra text." },
      { role: "user", content: prompt },
    ]);

    const raw = extractFirstJson(reply.content);

    const parsed = JSON.parse(raw) as Partial<AiEnrichment>;
    return {
      aiContext: typeof parsed.aiContext === "string" ? parsed.aiContext : fallback.aiContext,
      relevanceScore: typeof parsed.relevanceScore === "number"
        ? Math.max(1, Math.min(10, Math.round(parsed.relevanceScore)))
        : 5,
      tags: Array.isArray(parsed.tags)
        ? (parsed.tags as string[]).slice(0, 3)
        : fallback.tags,
    };
  } catch {
    return fallback;
  }
}

/* ── GET /api/observatory ────────────────────────────────────────────────── */

// ─── Demo observatory items ────────────────────────────────────────────────

const DEMO_OBS_ITEMS: ObservatoryNews[] = [
  { id: "demo-obs-1", agency: "NASA", title: "APOD: Pillars of Creation (Webb Infrared)", summary: "The James Webb Space Telescope delivered a new infrared view of the iconic Pillars of Creation, revealing previously unseen protostars embedded within the towering columns of gas and dust in the Eagle Nebula.", aiContext: "This Webb image marks a new chapter in stellar nursery science — the infrared penetration reveals star-formation timescales previously inaccessible to Hubble-era instruments.", relevanceScore: 10, tags: ["JWST", "Star Formation", "Eagle Nebula"], date: new Date(Date.now() - 86400000).toISOString() },
  { id: "demo-obs-2", agency: "NASA", title: "Solar Cycle 25 Approaches Predicted Maximum", summary: "NOAA and NASA predict Solar Cycle 25 will reach its peak intensity earlier and stronger than anticipated, with implications for satellite operations, GPS accuracy, and aurora visibility at lower latitudes.", aiContext: "A stronger-than-forecast solar maximum is a critical planning factor for satellite operators and mission schedulers — radiation hardening and orbital decay budgets need recalibration.", relevanceScore: 9, tags: ["Solar Cycle", "Space Weather", "NOAA"], date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "demo-obs-3", agency: "ESA",  title: "Euclid Dark Energy Telescope: First Science Release", summary: "ESA's Euclid mission released its first science data tranche, including weak gravitational lensing maps spanning 100 square degrees — unprecedented detail for cosmological parameter constraints.", aiContext: "Euclid's lensing maps will constrain the dark energy equation of state parameter w to better than 1% — a tenfold improvement over prior surveys and a landmark for precision cosmology.", relevanceScore: 9, tags: ["Dark Energy", "Euclid", "Cosmology"], date: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "demo-obs-4", agency: "NASA", title: "Artemis III Hardware Integration Begins at KSC",  summary: "NASA engineers have commenced integration of Artemis III core stage hardware at Kennedy Space Center, targeting a crewed lunar South Pole landing in 2026.", aiContext: "Artemis III represents NASA's first crewed lunar landing attempt since Apollo 17 in 1972, targeting science-rich South Pole terrain that may harbour water-ice deposits.", relevanceScore: 8, tags: ["Artemis", "Moon", "SLS"], date: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "demo-obs-5", agency: "ISRO", title: "NISAR Launch Window Confirmed for 2025",           summary: "ISRO confirmed the launch window for NISAR, a joint NASA–ISRO SAR satellite that will map global surface deformation with unprecedented 12-day repeat coverage.", aiContext: "NISAR's 12-day repeat cycle will enable detection of ground deformation down to 1 cm — critical for earthquake early warning, glacier monitoring, and urban subsidence tracking.", relevanceScore: 7, tags: ["NISAR", "SAR", "Earth Observation"], date: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "demo-obs-6", agency: "SpaceFlightNow", title: "SpaceX Starship IFT-7 Achieves Full Booster Catch", summary: "SpaceX successfully completed its 7th Starship integrated flight test, capturing the Super Heavy booster with the Mechazilla arms — the first full catch of an orbital-class rocket.", aiContext: "Rapid full-stack reusability changes the fundamental economics of space access — Starship's per-launch cost target of under $10M could democratise beyond-LEO missions.", relevanceScore: 8, tags: ["Starship", "Reusability", "SpaceX"], date: new Date(Date.now() - 6 * 86400000).toISOString() },
];

export async function GET(req: NextRequest) {
  const userRole = req.nextUrl.searchParams.get("role") ?? "Space Enthusiast";
  const userInterests = req.nextUrl.searchParams.get("interests") ?? "astronomy, space exploration";

  // ── Demo mode: return pre-generated items instantly ───────────────────────
  if (isDemoMode()) {
    return NextResponse.json({
      items: DEMO_OBS_ITEMS,
      total: DEMO_OBS_ITEMS.length,
      updatedAt: new Date().toISOString(),
      demo: true,
    });
  }

  /* Fetch all feeds + APOD concurrently */
  const [feedArrays, apod] = await Promise.all([
    Promise.all(FEEDS.map(fetchFeed)),
    fetchApod(),
  ]);

  let rawItems: RawItem[] = feedArrays.flat();
  if (apod) rawItems.unshift(apod);

  /* Deduplicate by title */
  const seen = new Set<string>();
  rawItems = rawItems.filter((it) => {
    const key = it.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* Seed demo items when all feeds are offline */
  if (rawItems.length === 0) {
    rawItems = [
      { title: "APOD: Pillars of Creation Revisited", summary: "The James Webb Space Telescope has delivered a stunning new infrared view of the iconic Pillars of Creation in the Eagle Nebula, revealing previously unseen protostars embedded within the towering columns of gas and dust.", link: "https://apod.nasa.gov", pubDate: new Date().toISOString(), imageUrl: "", agency: "NASA" },
      { title: "Solar Cycle 25 Approaches Maximum Activity", summary: "NOAA and NASA predict that Solar Cycle 25 will reach its peak intensity earlier and stronger than anticipated, with implications for satellite operations, GPS accuracy, and aurora visibility at lower latitudes.", link: "#", pubDate: new Date(Date.now() - 86400000).toISOString(), imageUrl: "", agency: "NASA" },
      { title: "ESA's Euclid Mission Returns First Science Data", summary: "The European Space Agency's Euclid dark energy telescope has released its first tranche of science data, including detailed weak gravitational lensing maps spanning over 100 square degrees of sky.", link: "#", pubDate: new Date(Date.now() - 2 * 86400000).toISOString(), imageUrl: "", agency: "ESA" },
      { title: "Artemis III Hardware Integration Begins", summary: "NASA engineers have commenced integration of the core stage for Artemis III, the mission targeting a crewed lunar landing in the South Pole region, with hardware arriving at Kennedy Space Center.", link: "#", pubDate: new Date(Date.now() - 3 * 86400000).toISOString(), imageUrl: "", agency: "NASA" },
      { title: "ISRO Announces NISAR Launch Window", summary: "The Indian Space Research Organisation confirmed the launch window for NISAR, a joint NASA–ISRO synthetic aperture radar satellite that will map global surface deformation with unprecedented resolution.", link: "#", pubDate: new Date(Date.now() - 4 * 86400000).toISOString(), imageUrl: "", agency: "ISRO" },
      { title: "SpaceX Starship IFT-7 Mission Profile Released", summary: "SpaceX has published the flight profile for Integrated Flight Test 7, featuring the first attempt at payload deployment from the rapidly reusable Starship upper stage in a sub-orbital trajectory.", link: "#", pubDate: new Date(Date.now() - 5 * 86400000).toISOString(), imageUrl: "", agency: "SpaceFlightNow" },
    ];
  }

  /* Enrich top 2 items with Granite (rate-limit friendly) */
  const topItems = rawItems.slice(0, 8);
  const enrichItems = topItems.slice(0, 2);
  const enrichments = await Promise.allSettled(
    enrichItems.map((it) => enrichWithGranite(it, userRole, userInterests))
  );

  const now = new Date().toISOString();
  const newsItems: ObservatoryNews[] = topItems.map((it, i): ObservatoryNews => {
    const enrich: AiEnrichment =
      i < 2 && enrichments[i]?.status === "fulfilled"
        ? enrichments[i].value
        : { aiContext: `${it.title} — significant development from ${it.agency}.`, relevanceScore: 5, tags: [it.agency] };

    return {
      id: `obs-${it.agency}-${i}-${Date.now()}`,
      agency: it.agency,
      title: it.title,
      summary: it.summary,
      link: it.link || undefined,
      aiContext: enrich.aiContext,
      relevanceScore: enrich.relevanceScore,
      tags: enrich.tags,
      date: (() => { try { return new Date(it.pubDate).toISOString(); } catch { return now; } })(),
      imageUrl: it.imageUrl || undefined,
    };
  });

  /* Sort by relevance score descending */
  newsItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return NextResponse.json({
    items: newsItems,
    total: newsItems.length,
    updatedAt: now,
  });
}
