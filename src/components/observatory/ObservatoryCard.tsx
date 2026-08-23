"use client";

import { motion } from "framer-motion";
import { ExternalLink, Sparkles, Calendar, Star } from "lucide-react";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { ObservatoryNews, ObservatoryAgency } from "@/lib/types";

/* ── Agency theme colours ────────────────────────────────────────────────── */
type BadgeVariant = "blue" | "purple" | "red" | "gold" | "green" | "muted";

const AGENCY_META: Record<
  ObservatoryAgency,
  { variant: BadgeVariant; color: string; abbr: string }
> = {
  NASA:           { variant: "blue",   color: "#38bdf8", abbr: "NASA"  },
  ESA:            { variant: "purple", color: "#a78bfa", abbr: "ESA"   },
  JAXA:           { variant: "red",    color: "#ef4444", abbr: "JAXA"  },
  ISRO:           { variant: "gold",   color: "#f97316", abbr: "ISRO"  },
  CSA:            { variant: "green",  color: "#34d399", abbr: "CSA"   },
  SpaceFlightNow: { variant: "muted",  color: "#7dd3fc", abbr: "SFN"   },
  Other:          { variant: "muted",  color: "#1e3a5f", abbr: "OTHER" },
};

/* ── Relevance score bar ─────────────────────────────────────────────────── */
function RelevanceBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#38bdf8" : score >= 5 ? "#a78bfa" : "#1e3a5f";
  return (
    <div className="flex items-center gap-2" aria-label={`Relevance score: ${score} out of 10`}>
      <span className="text-[10px] text-[#1e3a5f] shrink-0">Relevance</span>
      <div className="flex-1 h-1 rounded-full bg-[#1e3a5f] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] tabular-nums shrink-0" style={{ color }}>
        {score}/10
      </span>
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────── */
interface ObservatoryCardProps {
  item: ObservatoryNews;
  index: number;
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function ObservatoryCard({ item, index }: ObservatoryCardProps) {
  const meta = AGENCY_META[item.agency] ?? AGENCY_META.Other;

  const dateLabel = new Date(item.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      aria-label={item.title}
      className="h-full"
    >
      <Card variant="elevated" noPadding className="flex flex-col overflow-hidden h-full">
        {/* ── Image thumbnail ─────────────────────────────────────────── */}
        {item.imageUrl ? (
          <div className="relative w-full h-36 shrink-0 overflow-hidden bg-[#1a1916]">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover opacity-80"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111f36] via-transparent to-transparent" />
            {/* Agency badge over image */}
            <div className="absolute bottom-2 left-3">
              <Badge variant={meta.variant}>{meta.abbr}</Badge>
            </div>
          </div>
        ) : (
          /* No-image placeholder with agency colour accent */
          <div
            className="flex h-10 w-full shrink-0 items-center px-4"
            style={{ background: `${meta.color}14`, borderBottom: `1px solid ${meta.color}30` }}
          >
            <Badge variant={meta.variant}>{meta.abbr}</Badge>
          </div>
        )}

        {/* ── Card body ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 p-4 flex-1">
          {/* Header: agency (if image shown) + date */}
          <div className="flex items-center justify-between gap-2">
            {item.imageUrl ? (
              <div /> /* badge already shown on image */
            ) : (
              <span className="text-xs text-[#1e3a5f]">{item.agency}</span>
            )}
            <time
              dateTime={item.date}
              className="ml-auto flex items-center gap-1 text-[10px] text-[#1e3a5f]"
            >
              <Calendar size={10} aria-hidden="true" />
              {dateLabel}
            </time>
          </div>

          {/* Title */}
          <h2 className="text-sm font-semibold text-[#e0f2fe] leading-snug line-clamp-2">
            {item.title}
          </h2>

          {/* Original summary */}
          <p className="text-xs text-[#7dd3fc] leading-relaxed line-clamp-3 flex-1">
            {item.summary}
          </p>

          {/* AI Context highlight */}
          <div
            className="rounded-lg px-3 py-2.5"
            style={{
              background: "rgba(230,201,116,0.06)",
              border: "1px solid rgba(230,201,116,0.18)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={11} aria-hidden="true" className="text-[#38bdf8]" />
              <span className="text-[10px] font-semibold text-[#0ea5e9]">
                AI Context
              </span>
            </div>
            <p className="text-xs text-[#e0f2fe] leading-relaxed line-clamp-3">
              {item.aiContext}
            </p>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#050a14] text-[#7dd3fc] border border-[#1e3a5f]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: relevance + link */}
          <div className="flex items-center justify-between gap-3 mt-auto pt-1">
            <RelevanceBar score={item.relevanceScore} />
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Read full article: ${item.title}`}
                className="shrink-0 rounded-lg p-1.5 text-[#1e3a5f] hover:text-[#38bdf8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </Card>
    </motion.article>
  );
}
