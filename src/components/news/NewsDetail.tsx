"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  MapPin,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import { useProfile } from "@/lib/hooks/useProfile";
import RelatedArticles from "@/components/news/RelatedArticles";
import type { NewsItem, NewsCategory } from "@/lib/types";

/* ── Category meta ───────────────────────────────────────────────────────── */
type BadgeVariant = "blue" | "red" | "purple" | "green" | "gold" | "muted";
const CATEGORY_META: Record<NewsCategory, { variant: BadgeVariant; label: string }> = {
  climate:     { variant: "blue",   label: "Weather"       },
  disaster:    { variant: "red",    label: "Incident"      },
  space:       { variant: "purple", label: "Space"         },
  astronomy:   { variant: "gold",   label: "Comet / Astro" },
  technology:  { variant: "muted",  label: "Transport"     },
  environment: { variant: "green",  label: "Environment"   },
  general:     { variant: "muted",  label: "General"       },
};

interface DetailResponse {
  article: NewsItem;
  related: NewsItem[];
}

interface NewsDetailProps {
  /** The article to display (used as initial/placeholder data) */
  article: NewsItem;
  onClose: () => void;
}

export default function NewsDetail({ article, onClose }: NewsDetailProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const { toggle, isBookmarked, isSyncing } = useBookmarks();
  const saved = isBookmarked(article.id);
  const syncing = isSyncing(article.id);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Focus close button on open */
  useEffect(() => { closeRef.current?.focus(); }, []);

  /* Trap Escape key */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Prevent body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Fetch full detail (extended summary + related) */
  const role = encodeURIComponent(profile?.role ?? "Space Enthusiast");
  const mission = encodeURIComponent(profile?.missionType ?? "Ground-based Research");

  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: ["news-detail", article.id, role],
    queryFn: async () => {
      const res = await fetch(`/api/news/${article.id}?role=${role}&mission=${mission}`);
      if (!res.ok) throw new Error("Failed to load article detail");
      return res.json() as Promise<DetailResponse>;
    },
    initialData: { article, related: [] },
    staleTime: 10 * 60 * 1000,
  });

  const full = data.article;
  const related = data.related;
  const meta = CATEGORY_META[full.category] ?? CATEGORY_META.general;

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
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={full.title}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-8"
        style={{ background: "rgba(16,15,14,0.85)", backdropFilter: "blur(6px)" }}
      >
        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#605943] shadow-2xl"
          style={{ background: "#1a1916" }}
        >
          {/* ── Close button ──────────────────────────────────────────── */}
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close article"
            className="absolute top-4 right-4 z-10 rounded-lg p-1.5 text-[#605943] hover:bg-[#29271f] hover:text-[#e8e7e5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974]"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="p-6 sm:p-8 flex flex-col gap-5">
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={meta.variant}>{meta.label}</Badge>
                {full.location && (
                  <span className="flex items-center gap-1 text-xs text-[#605943]">
                    <MapPin size={11} aria-hidden="true" />
                    {full.location}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-[#e8e7e5] leading-snug">
                {full.title}
              </h1>
              <div className="flex items-center gap-3 flex-wrap text-xs text-[#605943]">
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

            {/* ── Summary ───────────────────────────────────────────── */}
            <p className="text-sm text-[#96938d] leading-relaxed">{full.summary}</p>

            {/* ── AI Extended Summary ────────────────────────────────── */}
            <div
              className="rounded-xl px-4 py-4"
              style={{ background: "rgba(230,201,116,0.06)", border: "1px solid rgba(230,201,116,0.18)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} aria-hidden="true" className="text-[#e6c974]" />
                <span className="text-xs font-bold text-[#c3ac6a] tracking-wide uppercase">
                  IBM Granite · AI News Flash
                </span>
              </div>
              <p className="text-sm italic text-[#e6c974] leading-relaxed">
                {full.flashCommentary}
              </p>
            </div>

            {/* ── Extended analysis ──────────────────────────────────── */}
            {isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 size={14} className="animate-spin text-[#605943]" aria-hidden="true" />
                <span className="text-xs text-[#605943]">Generating deeper analysis…</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={13} aria-hidden="true" />
                Could not load extended analysis.
              </div>
            ) : full.extendedSummary && full.extendedSummary !== full.summary ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-[#96938d] uppercase tracking-wide">
                  Deeper Analysis
                </p>
                <p className="text-sm text-[#e8e7e5] leading-relaxed">{full.extendedSummary}</p>
              </div>
            ) : null}

            {/* ── Tags ──────────────────────────────────────────────── */}
            {full.tags && full.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {full.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[#24231f] text-[#96938d] border border-[#3a3830]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── Action buttons ─────────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
              {full.coordinates && (
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/map?lat=${full.coordinates!.lat}&lng=${full.coordinates!.lng}&zoom=6`);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-3 py-2 text-xs font-medium text-[#38bdf8] hover:bg-[#38bdf8]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                >
                  <MapPin size={13} aria-hidden="true" />
                  View on Map
                </button>
              )}
              {full.link && (
                <a
                  href={full.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#605943] bg-[#24231f] px-3 py-2 text-xs font-medium text-[#96938d] hover:border-[#e6c974] hover:text-[#e6c974] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974]"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Read Original
                </a>
              )}
              <button
                onClick={() => toggle(full.id)}
                disabled={syncing}
                aria-pressed={saved}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974] disabled:opacity-50 ${
                  saved
                    ? "border-[#e6c974]/40 bg-[#e6c974]/10 text-[#e6c974]"
                    : "border-[#605943] bg-[#24231f] text-[#96938d] hover:border-[#e6c974] hover:text-[#e6c974]"
                }`}
              >
                {saved
                  ? <><BookmarkCheck size={13} aria-hidden="true" /> Saved</>
                  : <><Bookmark size={13} aria-hidden="true" /> Save Article</>}
              </button>
            </div>

            {/* ── Related Articles ───────────────────────────────────── */}
            {related.length > 0 && <RelatedArticles articles={related} />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
