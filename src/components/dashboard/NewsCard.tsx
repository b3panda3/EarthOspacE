"use client";

import { motion } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { NewsItem } from "@/lib/types";

/* ── Category → Badge variant + label ───────────────────────────────────── */

type BadgeVariant = "blue" | "red" | "purple" | "green" | "gold" | "muted";

const CATEGORY_META: Record<
  NewsItem["category"],
  { variant: BadgeVariant; label: string }
> = {
  climate:     { variant: "blue",   label: "Weather"       },
  disaster:    { variant: "red",    label: "Incident"      },
  space:       { variant: "purple", label: "Space"         },
  astronomy:   { variant: "gold",   label: "Comet / Astro" },
  technology:  { variant: "muted",  label: "Transport"     },
  environment: { variant: "green",  label: "Environment"   },
  general:     { variant: "muted",  label: "General"       },
};

/* ── Relative time helper ────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Props ───────────────────────────────────────────────────────────────── */

interface NewsCardProps {
  item: NewsItem;
  index: number; // for staggered animation
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function NewsCard({ item, index }: NewsCardProps) {
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.general;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
      aria-label={item.title}
    >
      <Card
        variant="elevated"
        className="flex flex-col gap-3 h-full"
        role="article"
      >
        {/* Header: badge + time */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={meta.variant as Parameters<typeof Badge>[0]["variant"]}>
            {meta.label}
          </Badge>
          <time
            dateTime={item.timestamp}
            className="text-xs text-[#605943] shrink-0"
          >
            {relativeTime(item.timestamp)}
          </time>
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold text-[#e8e7e5] leading-snug line-clamp-2">
          {item.title}
        </h2>

        {/* Summary — 2-line clamp */}
        <p className="text-xs text-[#96938d] leading-relaxed line-clamp-2 flex-1">
          {item.summary}
        </p>

        {/* Divider */}
        <div className="h-px bg-[#3a3830]" aria-hidden="true" />

        {/* AI News Flash */}
        <div className="flex items-start gap-2">
          <Sparkles
            size={13}
            aria-hidden="true"
            className="text-[#e6c974] mt-0.5 shrink-0"
          />
          <p
            className="text-xs italic leading-relaxed text-[#e6c974] line-clamp-3"
            aria-label="AI News Flash commentary"
          >
            {item.flashCommentary}
          </p>
        </div>

        {/* Footer: source */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-xs text-[#605943]">{item.source}</span>
          <ExternalLink
            size={12}
            aria-hidden="true"
            className="text-[#605943]"
          />
        </div>
      </Card>
    </motion.article>
  );
}
