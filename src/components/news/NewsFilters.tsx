"use client";

import { Search, X, LayoutGrid, List, ChevronDown } from "lucide-react";
import type { NewsCategory } from "@/lib/types";

/* ── Types ───────────────────────────────────────────────────────────────── */

export type NewsFilterCategory = NewsCategory | "all" | "saved";
export type SortOrder = "newest" | "relevant" | "discussed";
export type ViewMode = "grid" | "list";

const CATEGORY_TABS: { id: NewsFilterCategory; label: string }[] = [
  { id: "all",         label: "All"           },
  { id: "climate",     label: "Weather"       },
  { id: "disaster",    label: "Air Incidents" },
  { id: "space",       label: "Space Events"  },
  { id: "astronomy",   label: "Comets"        },
  { id: "technology",  label: "Transportation"},
  { id: "environment", label: "Research"      },
  { id: "saved",       label: "⭐ Saved"      },
];

const SORT_OPTIONS: { id: SortOrder; label: string }[] = [
  { id: "newest",   label: "Newest First"   },
  { id: "relevant", label: "Most Relevant"  },
  { id: "discussed",label: "Most Discussed" },
];

/* ── Props ───────────────────────────────────────────────────────────────── */

interface NewsFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: NewsFilterCategory;
  onCategoryChange: (v: NewsFilterCategory) => void;
  sortOrder: SortOrder;
  onSortChange: (v: SortOrder) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  resultCount: number;
  savedCount: number;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function NewsFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  savedCount,
}: NewsFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: search + sort + view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <label htmlFor="news-search" className="sr-only">Search news</label>
          <Search
            size={14}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1e3a5f] pointer-events-none"
          />
          <input
            id="news-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search titles and summaries…"
            className="h-9 w-full rounded-lg pl-9 pr-8 text-sm bg-[#050a14] border border-[#1e3a5f] text-[#e0f2fe] placeholder-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/60 focus:border-[#38bdf8]/60 transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1e3a5f] hover:text-[#e0f2fe]"
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <label htmlFor="news-sort" className="sr-only">Sort order</label>
          <select
            id="news-sort"
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            className="h-9 appearance-none rounded-lg pl-3 pr-8 text-sm bg-[#050a14] border border-[#1e3a5f] text-[#7dd3fc] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/60 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <ChevronDown
            size={13}
            aria-hidden="true"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1e3a5f] pointer-events-none"
          />
        </div>

        {/* View mode toggle */}
        <div
          role="group"
          aria-label="View mode"
          className="flex items-center rounded-lg border border-[#1e3a5f] overflow-hidden bg-[#050a14]"
        >
          <button
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid view"
            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-[#38bdf8]/15 text-[#38bdf8]" : "text-[#1e3a5f] hover:text-[#7dd3fc]"}`}
          >
            <LayoutGrid size={15} aria-hidden="true" />
          </button>
          <button
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
            aria-label="List view"
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-[#38bdf8]/15 text-[#38bdf8]" : "text-[#1e3a5f] hover:text-[#7dd3fc]"}`}
          >
            <List size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Result count */}
        {resultCount >= 0 && (
          <span className="text-xs text-[#1e3a5f] shrink-0 hidden sm:block">
            {resultCount} article{resultCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Row 2: category tabs */}
      <nav aria-label="Filter by category" className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map(({ id, label }) => {
          const isActive = id === category;
          const displayLabel = id === "saved" ? `${label} (${savedCount})` : label;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onCategoryChange(id)}
              className={[
                "relative flex shrink-0 items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]",
                isActive
                  ? "bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30"
                  : "text-[#1e3a5f] hover:text-[#7dd3fc] border border-transparent",
              ].join(" ")}
            >
              {displayLabel}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
