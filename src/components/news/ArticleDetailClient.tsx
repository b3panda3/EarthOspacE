"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Building2,
  MapPin,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { useProfile } from "@/lib/hooks/useProfile";
import RelatedArticles from "@/components/news/RelatedArticles";
import type { NewsItem, NewsCategory } from "@/lib/types";

type BadgeVariant = "blue" | "red" | "purple" | "green" | "gold" | "muted";
const CATEGORY_META: Record<NewsCategory, { variant: BadgeVariant; label: string }> = {
  climate:     { variant: "blue",   label: "Weather"   },
  disaster:    { variant: "red",    label: "Incident"  },
  space:       { variant: "purple", label: "Space"     },
  astronomy:   { variant: "gold",   label: "Astro"     },
  technology:  { variant: "muted",  label: "Transport" },
  environment: { variant: "green",  label: "Environment" },
  general:     { variant: "muted",  label: "General"   },
};

interface DetailResponse {
  article: NewsItem;
  related: NewsItem[];
}

export default function ArticleDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { profile } = useProfile();
  const { toggle, isBookmarked, isSyncing } = useBookmarks();

  const role = encodeURIComponent(profile?.role ?? "Space Enthusiast");
  const mission = encodeURIComponent(profile?.missionType ?? "Ground-based Research");

  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: ["news-detail", id, role],
    queryFn: async () => {
      const res = await fetch(`/api/news/${id}?role=${role}&mission=${mission}`);
      if (!res.ok) throw new Error("Article not found");
      return res.json() as Promise<DetailResponse>;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={20} className="animate-spin text-[#1e3a5f]" aria-hidden="true" />
        <span className="text-sm text-[#1e3a5f]">Loading article…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-6 text-center">
        <AlertCircle size={24} className="text-red-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-red-400 mb-4">Article not found or failed to load.</p>
        <button
          onClick={() => router.push("/news")}
          className="inline-flex items-center gap-2 text-sm text-[#1e3a5f] hover:text-[#38bdf8] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to News
        </button>
      </div>
    );
  }

  const { article: full, related } = data;
  const meta = CATEGORY_META[full.category] ?? CATEGORY_META.general;
  const saved = isBookmarked(full.id);
  const syncing = isSyncing(full.id);

  const dateLabel = new Date(full.timestamp).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[#1e3a5f] bg-[#1a1916] p-6 sm:p-8 flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {full.location && (
            <span className="flex items-center gap-1 text-xs text-[#1e3a5f]">
              <MapPin size={11} aria-hidden="true" />
              {full.location}
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#e0f2fe] leading-snug">
          {full.title}
        </h1>
        <div className="flex items-center gap-3 flex-wrap text-xs text-[#1e3a5f]">
          <span className="flex items-center gap-1">
            <Calendar size={11} aria-hidden="true" />
            <time dateTime={full.timestamp}>{dateLabel}</time>
          </span>
          <span className="flex items-center gap-1">
            <Building2 size={11} aria-hidden="true" />
            {full.source}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-[#7dd3fc] leading-relaxed">{full.summary}</p>

      {/* AI Flash */}
      <div
        className="rounded-xl px-4 py-4"
        style={{ background: "rgba(230,201,116,0.06)", border: "1px solid rgba(230,201,116,0.18)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={13} aria-hidden="true" className="text-[#38bdf8]" />
          <span className="text-xs font-bold text-[#0ea5e9] uppercase tracking-wide">
            IBM Granite · AI News Flash
          </span>
        </div>
        <p className="text-sm italic text-[#38bdf8] leading-relaxed">{full.flashCommentary}</p>
      </div>

      {/* Extended analysis */}
      {full.extendedSummary && full.extendedSummary !== full.summary && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[#7dd3fc] uppercase tracking-wide">Deeper Analysis</p>
          <p className="text-sm text-[#e0f2fe] leading-relaxed">{full.extendedSummary}</p>
        </div>
      )}

      {/* Tags */}
      {full.tags && full.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {full.tags.map((tag) => (
            <span key={tag} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[#050a14] text-[#7dd3fc] border border-[#1e3a5f]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {full.coordinates && (
          <button
            onClick={() => router.push(`/map?lat=${full.coordinates!.lat}&lng=${full.coordinates!.lng}&zoom=6`)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-3 py-2 text-xs font-medium text-[#38bdf8] hover:bg-[#38bdf8]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
          >
            <MapPin size={13} aria-hidden="true" />
            View on Map
          </button>
        )}
        {full.link && (
          <a href={full.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1e3a5f] bg-[#050a14] px-3 py-2 text-xs font-medium text-[#7dd3fc] hover:border-[#38bdf8] hover:text-[#38bdf8] transition-colors"
          >
            <ExternalLink size={13} aria-hidden="true" />
            Read Original
          </a>
        )}
        <button
          onClick={() => toggle(full.id)}
          disabled={syncing}
          aria-pressed={saved}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] disabled:opacity-50 ${
            saved
              ? "border-[#38bdf8]/40 bg-[#38bdf8]/10 text-[#38bdf8]"
              : "border-[#1e3a5f] bg-[#050a14] text-[#7dd3fc] hover:border-[#38bdf8] hover:text-[#38bdf8]"
          }`}
        >
          {saved ? <><BookmarkCheck size={13} aria-hidden="true" /> Saved</> : <><Bookmark size={13} aria-hidden="true" /> Save Article</>}
        </button>
      </div>

      {/* Related */}
      {related.length > 0 && <RelatedArticles articles={related} />}
    </motion.article>
  );
}
