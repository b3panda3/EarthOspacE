/**
 * /src/app/news/[id]/page.tsx
 *
 * Full-page article detail view (navigated to directly, e.g. from map pin).
 * The same article data is also displayed in a modal from NewsDetail.tsx —
 * this page is the deep-link / shareable URL version.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ArticleDetailClient from "@/components/news/ArticleDetailClient";

/* ── Metadata ─────────────────────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Article ${id} · EarthOspacE`,
    description: "Detailed space and Earth news article with AI-generated analysis.",
  };
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate the ID is plausible before rendering the client component
  if (!id || id.length < 1) notFound();

  return (
    <div className="mx-auto max-w-2xl py-6">
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-sm text-[#605943] hover:text-[#e6c974] transition-colors mb-6 focus-visible:outline-none focus-visible:underline"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to News
      </Link>

      {/* Client component owns all data fetching and interaction */}
      <ArticleDetailClient id={id} />
    </div>
  );
}
