"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { NewsItem, NewsCategory } from "@/lib/types";

type BadgeVariant = "blue" | "red" | "purple" | "green" | "gold" | "muted";
const CATEGORY_META: Record<NewsCategory, { variant: BadgeVariant; label: string }> = {
  climate:     { variant: "blue",   label: "Weather"   },
  disaster:    { variant: "red",    label: "Incident"  },
  space:       { variant: "purple", label: "Space"     },
  astronomy:   { variant: "gold",   label: "Astro"     },
  technology:  { variant: "muted",  label: "Transport" },
  environment: { variant: "green",  label: "Env"       },
  general:     { variant: "muted",  label: "General"   },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "<1h ago";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface RelatedArticlesProps {
  articles: NewsItem[];
  onOpenDetail?: (item: NewsItem) => void;
}

export default function RelatedArticles({ articles, onOpenDetail }: RelatedArticlesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  }

  if (articles.length === 0) return null;

  return (
    <section aria-label="Related articles" className="flex flex-col gap-3 pt-2 border-t border-[#3a3830]">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[#96938d] uppercase tracking-wide">
          Related Articles
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="rounded p-1 text-[#605943] hover:text-[#e8e7e5] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6c974]"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="rounded p-1 text-[#605943] hover:text-[#e8e7e5] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6c974]"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory"
      >
        {articles.map((item) => {
          const meta = CATEGORY_META[item.category] ?? CATEGORY_META.general;
          return (
            <article
              key={item.id}
              className="w-56 shrink-0 snap-start rounded-xl border border-[#3a3830] bg-[#24231f] p-3 flex flex-col gap-2 hover:border-[#605943] transition-colors cursor-pointer"
              onClick={() => onOpenDetail?.(item)}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                <time className="text-[10px] text-[#605943]" dateTime={item.timestamp}>
                  {relativeTime(item.timestamp)}
                </time>
              </div>
              <p className="text-xs font-semibold text-[#e8e7e5] leading-snug line-clamp-2">
                {item.title}
              </p>
              <div className="flex items-start gap-1.5 mt-auto">
                <Sparkles size={10} className="text-[#e6c974] mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-[10px] italic text-[#e6c974] line-clamp-2 leading-relaxed">
                  {item.flashCommentary}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
