import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/watsonx";
import type { NewsItem } from "@/lib/types";

/* ── Seed articles (same demo data used by the list route) ───────────────── */
const DEMO_ARTICLES: NewsItem[] = [
  {
    id: "demo-1",
    title: "Solar Activity Reaches Cycle 25 Peak",
    summary: "NASA reports solar cycle 25 is approaching its predicted maximum, with increased sunspot activity and solar flares impacting satellite operations globally.",
    flashCommentary: "Cycle 25 is proving stronger than forecast — a boon for aurora chasers but a challenge for satellite operators worldwide.",
    category: "space",
    source: "NASA (Demo)",
    timestamp: new Date().toISOString(),
    tags: ["solar cycle", "satellite", "space weather"],
  },
  {
    id: "demo-2",
    title: "ISS Crew Completes Emergency EVA",
    summary: "Astronauts aboard the International Space Station completed an unscheduled spacewalk to repair a cooling system component that showed anomalous readings.",
    flashCommentary: "Quick-turnaround EVA demonstrates the rigorous contingency training that keeps humanity's orbital outpost continuously crewed.",
    category: "space",
    source: "NASA (Demo)",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    tags: ["ISS", "EVA", "crewed spaceflight"],
  },
  {
    id: "demo-3",
    title: "Category 4 Hurricane Approaches Gulf Coast",
    summary: "A powerful hurricane has intensified rapidly over the warm waters of the Gulf of Mexico, prompting mass evacuations across coastal communities.",
    flashCommentary: "Rapid intensification over record-warm Gulf waters underscores how climate change is reshaping hurricane behaviour.",
    category: "climate",
    source: "NOAA (Demo)",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    coordinates: { lat: 25.0, lng: -90.0 },
    tags: ["hurricane", "climate", "weather alert"],
  },
  {
    id: "demo-4",
    title: "Comet C/2024 A1 Makes Close Earth Pass",
    summary: "A newly discovered comet will pass within 0.35 AU of Earth next month, offering amateur astronomers a rare naked-eye viewing opportunity.",
    flashCommentary: "A pristine visitor from the Oort Cloud, C/2024 A1 carries frozen records of the early solar system straight to our telescopes.",
    category: "astronomy",
    source: "JPL (Demo)",
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    tags: ["comet", "near-Earth", "astronomy"],
  },
  {
    id: "demo-5",
    title: "Air Traffic Incident Over North Atlantic",
    summary: "An unusual convergence of flight paths triggered TCAS alerts for three commercial airliners over the North Atlantic corridor during peak traffic hours.",
    flashCommentary: "North Atlantic track congestion is reaching new limits — a wake-up call for next-gen air traffic management systems.",
    category: "disaster",
    source: "FAA (Demo)",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    coordinates: { lat: 52.0, lng: -30.0 },
    tags: ["aviation", "air traffic", "incident"],
  },
  {
    id: "demo-6",
    title: "Artemis III Hardware Integration Begins",
    summary: "NASA engineers have begun integrating the core stage components for the Artemis III lunar landing mission, targeting a 2026 launch window.",
    flashCommentary: "With Artemis III hardware taking shape, humanity's return to the lunar surface moves from blueprint to reality.",
    category: "space",
    source: "NASA (Demo)",
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    tags: ["Artemis", "lunar", "NASA"],
  },
];

/* ── GET /api/news/[id] ──────────────────────────────────────────────────── */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userRole = req.nextUrl.searchParams.get("role") ?? "Space Enthusiast";
  const missionType = req.nextUrl.searchParams.get("mission") ?? "Ground-based Research";

  /* Find the article — in production this would hit a DB / cache.
     For now we serve from the deterministic demo set. */
  const article = DEMO_ARTICLES.find((a) => a.id === id);

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  /* Generate AI extended summary if not already present */
  let extendedSummary = article.extendedSummary ?? "";
  if (!extendedSummary) {
    try {
      const reply = await chatCompletion([
        {
          role: "system",
          content:
            "You are a space science journalist. Write clear, factual, engaging prose. No lists, no markdown.",
        },
        {
          role: "user",
          content:
            `Provide a detailed 4-6 sentence summary of this article for a ${userRole}. ` +
            `Highlight key facts, implications, and relevance to ${missionType}.\n\n` +
            `Title: ${article.title}\nSummary: ${article.summary}`,
        },
      ]);
      extendedSummary = reply.content.trim();
    } catch {
      extendedSummary = article.summary;
    }
  }

  /* Related articles: same category, exclude self */
  const related = DEMO_ARTICLES.filter(
    (a) => a.id !== id && a.category === article.category
  ).slice(0, 3);

  return NextResponse.json({
    article: { ...article, extendedSummary },
    related,
  });
}
