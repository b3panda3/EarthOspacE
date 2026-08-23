"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Telescope,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  Newspaper,
} from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import ObservatoryCard from "@/components/observatory/ObservatoryCard";
import FeaturedDiscovery from "@/components/observatory/FeaturedDiscovery";
import AgencyFilterBar, {
  type AgencyFilter,
} from "@/components/observatory/AgencyFilterBar";
import TopicFilterBar from "@/components/observatory/TopicFilterBar";
import DateRangeFilter, {
  type DateRange,
  isWithinRange,
} from "@/components/observatory/DateRangeFilter";
import type { ObservatoryNews } from "@/lib/types";

/* ── API response type ───────────────────────────────────────────────────── */
interface ObservatoryResponse {
  items: ObservatoryNews[];
  total: number;
  updatedAt: string;
}

/* ── Skeleton loader ─────────────────────────────────────────────────────── */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-72 rounded-xl bg-[#111f36] border border-[#1e3a5f] animate-pulse"
        />
      ))}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#1e3a5f] bg-[#050a14]">
        <Telescope size={26} className="text-[#1e3a5f]" aria-hidden="true" />
      </div>
      <p className="text-sm text-[#1e3a5f] text-center max-w-xs">{message}</p>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ObservatoryPage() {
  const { profile } = useProfile();

  const [agencyFilter, setAgencyFilter] = useState<AgencyFilter>("All");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>("all");

  /* ── Build query params ─────────────────────────────────────────────── */
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("role", profile?.role ?? "Space Enthusiast");
    if (profile?.interests) {
      const topInterests = Object.entries(profile.interests)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([cat]) => cat)
        .join(", ");
      p.set("interests", topInterests);
    }
    return p.toString();
  }, [profile]);

  /* ── TanStack Query: 5-min cache, background refresh ───────────────── */
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["observatory", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/observatory?${queryParams}`);
      if (!res.ok) throw new Error("Observatory fetch failed");
      return res.json() as Promise<ObservatoryResponse>;
    },
    staleTime: 5 * 60 * 1000,      // 5 min cache
    refetchInterval: 5 * 60 * 1000, // background refresh
    refetchIntervalInBackground: true,
  });

  /* ── Derived state ──────────────────────────────────────────────────── */
  const allItems = data?.items ?? [];

  /* Collect all unique tags across all items */
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(allItems.flatMap((it) => it.tags))
      ).sort(),
    [allItems]
  );

  /* Agency counts for filter bar badges */
  const agencyCounts = useMemo(() => {
    const counts: Partial<Record<AgencyFilter, number>> = {};
    for (const item of allItems) {
      counts[item.agency] = (counts[item.agency] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  /* Apply all filters */
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (agencyFilter !== "All" && item.agency !== agencyFilter) return false;
      if (!isWithinRange(item.date, dateRange)) return false;
      if (activeTags.size > 0 && !item.tags.some((t) => activeTags.has(t))) return false;
      return true;
    });
  }, [allItems, agencyFilter, dateRange, activeTags]);

  /* Featured: highest relevance score from unfiltered items */
  const featured = useMemo(
    () =>
      allItems.length > 0
        ? allItems.reduce((best, cur) =>
            cur.relevanceScore > best.relevanceScore ? cur : best
          )
        : null,
    [allItems]
  );

  /* Cards: filtered items minus the featured one */
  const cardItems = useMemo(
    () => filteredItems.filter((it) => it.id !== featured?.id),
    [filteredItems, featured]
  );

  /* Tag toggle handlers */
  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }, []);

  const clearTags = useCallback(() => setActiveTags(new Set()), []);

  /* Formatted last-update timestamp */
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      }) + " UTC"
    : null;

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-screen-xl flex flex-col gap-6 pb-8">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a78bfa]/15 border border-[#a78bfa]/30">
            <Telescope size={20} className="text-[#a78bfa]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e0f2fe]">Space Observatories</h1>
            <p className="text-xs text-[#1e3a5f] mt-0.5 flex items-center gap-2">
              <Newspaper size={11} aria-hidden="true" />
              {isLoading ? "Loading…" : `${allItems.length} items`}
              {lastUpdated && (
                <>
                  <span>·</span>
                  <Clock size={11} aria-hidden="true" />
                  {lastUpdated}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Controls: date range + refresh */}
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh observatory news"
            className="rounded-lg p-2 text-[#1e3a5f] hover:text-[#e0f2fe] hover:bg-[#111f36] transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
              className={isFetching ? "animate-spin" : ""}
            />
          </button>
        </div>
      </motion.div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertCircle size={16} className="text-red-400 shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-400">
            Failed to load observatory data. Showing cached results if available.
          </p>
        </div>
      )}

      {/* ── Featured Discovery ──────────────────────────────────────────── */}
      {!isLoading && featured && <FeaturedDiscovery item={featured} />}

      {/* ── Agency filter bar ───────────────────────────────────────────── */}
      {!isLoading && (
        <AgencyFilterBar
          active={agencyFilter}
          onChange={setAgencyFilter}
          counts={agencyCounts}
        />
      )}

      {/* ── Topic filter bar ────────────────────────────────────────────── */}
      {!isLoading && allTags.length > 0 && (
        <TopicFilterBar
          allTags={allTags}
          activeTags={activeTags}
          onToggle={toggleTag}
          onClear={clearTags}
        />
      )}

      {/* ── Active filter summary ────────────────────────────────────────── */}
      {!isLoading && (agencyFilter !== "All" || activeTags.size > 0 || dateRange !== "all") && (
        <div className="flex items-center gap-2 text-xs text-[#7dd3fc]">
          <span>Showing {cardItems.length} result{cardItems.length !== 1 ? "s" : ""}</span>
          {agencyFilter !== "All" && (
            <span className="rounded-full bg-[#111f36] border border-[#1e3a5f] px-2 py-0.5">
              Agency: {agencyFilter}
            </span>
          )}
          {dateRange !== "all" && (
            <span className="rounded-full bg-[#111f36] border border-[#1e3a5f] px-2 py-0.5">
              {dateRange === "today" ? "Today" : dateRange === "week" ? "This Week" : "This Month"}
            </span>
          )}
          {activeTags.size > 0 && (
            <span className="rounded-full bg-[#111f36] border border-[#1e3a5f] px-2 py-0.5">
              {activeTags.size} topic{activeTags.size > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <GridSkeleton />
      ) : cardItems.length === 0 ? (
        <EmptyState
          message={
            agencyFilter !== "All" || activeTags.size > 0 || dateRange !== "all"
              ? "No items match the current filters. Try adjusting the agency, topic, or date range."
              : "No observatory news available right now. Refreshing shortly."
          }
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            role="feed"
            aria-label="Observatory news cards"
            aria-busy={isFetching}
          >
            {cardItems.map((item, i) => (
              <ObservatoryCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Background refresh indicator */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[#1e3a5f] bg-[#050a14]/90 px-4 py-2.5 text-xs text-[#7dd3fc] shadow-xl backdrop-blur-sm">
          <Loader2 size={13} className="animate-spin text-[#1e3a5f]" aria-hidden="true" />
          Refreshing data…
        </div>
      )}
    </div>
  );
}
