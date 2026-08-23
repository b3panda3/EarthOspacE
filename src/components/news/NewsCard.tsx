"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  MapPin,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NewsCardProps {
  item: NewsItem;
  index: number;
  /** "grid" = card layout, "list" = horizontal compact layout */
  viewMode?: "grid" | "list";
  onOpenDetail?: (item: NewsItem) => void;
}

export default function NewsCard({
  item,
  index,
  viewMode = "grid",
  onOpenDetail,
}: NewsCardProps) {
  const router = useRouter();
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.general;
  const { toggle, isBookmarked, isSyncing } = useBookmarks();
  const saved = isBookmarked(item.id);
  const syncing = isSyncing(item.id);

  function handleMapLink(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.coordinates) return;
    router.push(
      `/map?lat=${item.coordinates.lat}&lng=${item.coordinates.lng}&zoom=6`
    );
  }

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    toggle(item.id);
  }

  function handleReadMore(e: React.MouseEvent) {
    e.stopPropagation();
    if (onOpenDetail) onOpenDetail(item);
  }

  /* ── List view ─────────────────────────────────────────────────────────── */
  if (viewMode === "list") {
    return (
      <motion.article
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
        aria-label={item.title}
      >
        <Card
          variant="default"
          className="flex items-start gap-4"
          role="article"
        >
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <time dateTime={item.timestamp} className="text-xs text-[#1e3a5f]">
                {relativeTime(item.timestamp)}
              </time>
              <span className="text-xs text-[#1e3a5f]">{item.source}</span>
            </div>
            <button
              onClick={handleReadMore}
              className="text-left text-sm font-semibold text-[#e0f2fe] hover:text-[#38bdf8] transition-colors line-clamp-1 focus-visible:outline-none focus-visible:underline"
            >
              {item.title}
            </button>
            <p className="text-xs text-[#7dd3fc] line-clamp-1">{item.summary}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.coordinates && (
              <button
                onClick={handleMapLink}
                aria-label="View on map"
                className="rounded p-1.5 text-[#1e3a5f] hover:text-[#38bdf8] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]"
              >
                <MapPin size={14} aria-hidden="true" />
              </button>
            )}
            <button
              onClick={handleBookmark}
              aria-label={saved ? "Remove bookmark" : "Bookmark article"}
              aria-pressed={saved}
              disabled={syncing}
              className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8] disabled:opacity-50 ${saved ? "text-[#38bdf8]" : "text-[#1e3a5f] hover:text-[#38bdf8]"}`}
            >
              {saved
                ? <BookmarkCheck size={14} aria-hidden="true" />
                : <Bookmark size={14} aria-hidden="true" />}
            </button>
            <Link
              href={`/news/${item.id}`}
              aria-label={`Read full article: ${item.title}`}
              className="rounded p-1.5 text-[#1e3a5f] hover:text-[#e0f2fe] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]"
            >
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </motion.article>
    );
  }

  /* ── Grid view (default) ───────────────────────────────────────────────── */
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      aria-label={item.title}
      className="h-full"
    >
      <Card
        variant="elevated"
        className="flex flex-col gap-3 h-full"
        role="article"
      >
        {/* Header: category badge + time + actions */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <div className="flex items-center gap-1.5 ml-auto">
            <time dateTime={item.timestamp} className="text-[10px] text-[#1e3a5f]">
              {relativeTime(item.timestamp)}
            </time>
            {/* Map pin — only if coordinates present */}
            {item.coordinates && (
              <button
                onClick={handleMapLink}
                aria-label="View location on map"
                className="rounded p-1 text-[#1e3a5f] hover:text-[#38bdf8] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]"
              >
                <MapPin size={13} aria-hidden="true" />
              </button>
            )}
            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              aria-label={saved ? "Remove bookmark" : "Save article"}
              aria-pressed={saved}
              disabled={syncing}
              className={`rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8] disabled:opacity-50 ${saved ? "text-[#38bdf8]" : "text-[#1e3a5f] hover:text-[#38bdf8]"}`}
            >
              {saved
                ? <BookmarkCheck size={13} aria-hidden="true" />
                : <Bookmark size={13} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Title */}
        <button
          onClick={handleReadMore}
          className="text-left text-sm font-semibold text-[#e0f2fe] hover:text-[#38bdf8] transition-colors leading-snug line-clamp-2 focus-visible:outline-none focus-visible:underline"
        >
          {item.title}
        </button>

        {/* Summary */}
        <p className="text-xs text-[#7dd3fc] leading-relaxed line-clamp-2 flex-1">
          {item.summary}
        </p>

        {/* Divider */}
        <div className="h-px bg-[#1e3a5f]" aria-hidden="true" />

        {/* AI Flash */}
        <div className="flex items-start gap-2">
          <Sparkles size={12} aria-hidden="true" className="text-[#38bdf8] mt-0.5 shrink-0" />
          <p className="text-xs italic leading-relaxed text-[#38bdf8] line-clamp-2">
            {item.flashCommentary}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1 gap-2">
          <span className="text-[10px] text-[#1e3a5f] truncate">{item.source}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleReadMore}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-[#7dd3fc] hover:text-[#38bdf8] transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Read more
              <ArrowRight size={11} aria-hidden="true" />
            </button>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="External article"
                onClick={(e) => e.stopPropagation()}
                className="text-[#1e3a5f] hover:text-[#7dd3fc] transition-colors"
              >
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </Card>
    </motion.article>
  );
}
