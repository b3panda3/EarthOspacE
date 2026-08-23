"use client";

import { motion } from "framer-motion";
import { Sparkles, ExternalLink, Star, TrendingUp } from "lucide-react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import type { ObservatoryNews, ObservatoryAgency } from "@/lib/types";

type BadgeVariant = "blue" | "purple" | "red" | "gold" | "green" | "muted";

const AGENCY_BADGE: Record<ObservatoryAgency, { variant: BadgeVariant; label: string }> = {
  NASA:           { variant: "blue",   label: "NASA"           },
  ESA:            { variant: "purple", label: "ESA"            },
  JAXA:           { variant: "red",    label: "JAXA"           },
  ISRO:           { variant: "gold",   label: "ISRO"           },
  CSA:            { variant: "green",  label: "CSA"            },
  SpaceFlightNow: { variant: "muted",  label: "SpaceFlightNow" },
  Other:          { variant: "muted",  label: "Other"          },
};

interface FeaturedDiscoveryProps {
  item: ObservatoryNews;
}

export default function FeaturedDiscovery({ item }: FeaturedDiscoveryProps) {
  const meta = AGENCY_BADGE[item.agency] ?? AGENCY_BADGE.Other;
  const dateLabel = new Date(item.date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Featured discovery"
      className="relative w-full overflow-hidden rounded-2xl border border-[#1e3a5f]"
      style={{ minHeight: 280 }}
    >
      {/* Background: image or gradient */}
      {item.imageUrl ? (
        <>
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
            priority
          />
          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#000000dd] via-[#000000aa] to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000cc] via-transparent to-transparent" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #111f36 0%, #050a14 40%, #1e1c18 100%)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-6 sm:p-8 gap-4">
        {/* Top-row badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#38bdf8]/15 border border-[#38bdf8]/40 px-3 py-1 text-xs font-bold text-[#38bdf8]">
            <TrendingUp size={11} aria-hidden="true" />
            Featured Discovery
          </span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span className="ml-auto flex items-center gap-1 text-xs text-[#7dd3fc]">
            <Star size={11} className="text-[#38bdf8]" aria-hidden="true" />
            {item.relevanceScore}/10 relevance
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-[#e0f2fe] leading-snug max-w-2xl">
          {item.title}
        </h2>

        {/* Summary */}
        <p className="text-sm text-[#7dd3fc] leading-relaxed max-w-xl line-clamp-3">
          {item.summary}
        </p>

        {/* AI Context — full width highlight */}
        <div
          className="rounded-xl px-4 py-3 max-w-2xl"
          style={{
            background: "rgba(230,201,116,0.08)",
            border: "1px solid rgba(230,201,116,0.25)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={12} aria-hidden="true" className="text-[#38bdf8]" />
            <span className="text-[10px] font-bold text-[#0ea5e9] tracking-wide uppercase">
              IBM Granite · AI Context
            </span>
          </div>
          <p className="text-sm text-[#e0f2fe] leading-relaxed">{item.aiContext}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[#000000]/60 text-[#7dd3fc] border border-[#1e3a5f]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <time dateTime={item.date} className="text-xs text-[#1e3a5f]">
              {dateLabel}
            </time>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-3 py-1.5 text-xs font-medium text-[#38bdf8] transition-colors hover:bg-[#38bdf8]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                aria-label="Read full article"
              >
                <ExternalLink size={12} aria-hidden="true" />
                Read Article
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
