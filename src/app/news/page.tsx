"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Newspaper, AlertCircle, CheckCircle2 } from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useBookmarks } from "@/lib/hooks/useBookmarks";
import NewsCard from "@/components/news/NewsCard";
import NewsDetail from "@/components/news/NewsDetail";
import NewsFilters, {
  type NewsFilterCategory,
  type SortOrder,
  type ViewMode,
} from "@/components/news/NewsFilters";
import type { NewsItem } from "@/lib/types";

/* ── Pagination constants ────────────────────────────────────────────────── */
const INITIAL_PAGE_SIZE = 12;
const NEXT_PAGE_SIZE = 8;

/* ── API response ────────────────────────────────────────────────────────── */
interface NewsResponse {
  items: NewsItem[];
  total: number;
}

/* ── Client sort helper ──────────────────────────────────────────────────── */
function applySort(items: NewsItem[], sort: SortOrder): NewsItem[] {
  const copy = [...items];
  if (sort === "newest") {
    return copy.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  if (sort === "relevant") {
    // Prefer items with tags and longer summaries (proxy for richer content)
    return copy.sort(
      (a, b) => (b.tags?.length ?? 0) * 2 + b.summary.length / 100
           - (a.tags?.length ?? 0) * 2 - a.summary.length / 100
    );
  }
  // "discussed" — items with coordinates and links first (proxy for notable)
  return copy.sort(
    (a, b) => (+!!b.coordinates + +!!b.link) - (+!!a.coordinates + +!!a.link)
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function NewsPage() {
  const { profile } = useProfile();
  const { bookmarked, isBookmarked } = useBookmarks();

  /* Filters state */
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<NewsFilterCategory>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  /* Detail modal */
  const [detailItem, setDetailItem] = useState<NewsItem | null>(null);

  /* Infinite scroll sentinel */
  const sentinelRef = useRef<HTMLDivElement>(null);

  /* ── Build params ─────────────────────────────────────────────────────── */
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("role", profile?.role ?? "Space Enthusiast");
    p.set("mission", profile?.missionType ?? "Ground-based Research");
    if (profile?.interests) {
      p.set("interests", encodeURIComponent(JSON.stringify(profile.interests)));
    }
    return p.toString();
  }, [profile]);

  /* ── TanStack infinite query ──────────────────────────────────────────── */
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["news-infinite", queryParams],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/news?${queryParams}`);
      if (!res.ok) throw new Error("News fetch failed");
      const body = (await res.json()) as NewsResponse;
      const offset = pageParam as number;
      return {
        items: body.items.slice(offset, offset + (offset === 0 ? INITIAL_PAGE_SIZE : NEXT_PAGE_SIZE)),
        nextOffset: offset === 0
          ? (body.items.length > INITIAL_PAGE_SIZE ? INITIAL_PAGE_SIZE : null)
          : (offset + NEXT_PAGE_SIZE < body.items.length ? offset + NEXT_PAGE_SIZE : null),
        total: body.items.length,
        allItems: body.items, // carry full list for client filtering
      };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  /* ── Flatten all loaded pages ─────────────────────────────────────────── */
  // We use allItems from the first page (the full server response) for client-side
  // filtering; paginatedItems is what we show before filtering.
  const allServerItems = data?.pages[0]?.allItems ?? [];
  const paginatedItems = data?.pages.flatMap((p) => p.items) ?? [];

  /* ── Client-side filter + sort ────────────────────────────────────────── */
  const filteredItems = useMemo(() => {
    let items = paginatedItems;

    // Category filter
    if (category === "saved") {
      items = allServerItems.filter((it) => isBookmarked(it.id));
    } else if (category !== "all") {
      items = items.filter((it) => it.category === category);
    }

    // Text search (title + summary)
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.summary.toLowerCase().includes(q)
      );
    }

    return applySort(items, sortOrder);
  }, [paginatedItems, allServerItems, category, search, sortOrder, isBookmarked]);

  const savedCount = useMemo(
    () => allServerItems.filter((it) => isBookmarked(it.id)).length,
    [allServerItems, isBookmarked, bookmarked] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── IntersectionObserver for infinite scroll ─────────────────────────── */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const closeDetail = useCallback(() => setDetailItem(null), []);

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Detail modal — portal rendered above everything */}
      <AnimatePresence>
        {detailItem && (
          <NewsDetail article={detailItem} onClose={closeDetail} />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-screen-xl flex flex-col gap-5 pb-10">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6c974]/10 border border-[#e6c974]/30">
            <Newspaper size={20} className="text-[#e6c974]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e8e7e5]">News Explorer</h1>
            <p className="text-xs text-[#605943]">
              Live space & Earth news · AI-enhanced · auto-refreshes every 30 s
            </p>
          </div>
        </motion.div>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <NewsFilters
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          resultCount={isLoading ? -1 : filteredItems.length}
          savedCount={savedCount}
        />

        {/* ── Error ────────────────────────────────────────────────────── */}
        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertCircle size={16} className="text-red-400 shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-400">
              Failed to load news. Check your API configuration.
            </p>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#605943]" aria-label="Loading news" />
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Newspaper size={28} className="text-[#3a3830]" aria-hidden="true" />
            <p className="text-sm text-[#605943]">
              {search
                ? `No articles match "${search}"`
                : category === "saved"
                ? "No saved articles yet. Bookmark articles to see them here."
                : "No articles found for the selected filters."}
            </p>
          </div>
        )}

        {/* ── Article grid / list ───────────────────────────────────────── */}
        {!isLoading && filteredItems.length > 0 && (
          <div
            role="feed"
            aria-label="News articles"
            aria-busy={isLoading}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                : "flex flex-col gap-2"
            }
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  index={i}
                  viewMode={viewMode}
                  onOpenDetail={setDetailItem}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Infinite scroll sentinel ──────────────────────────────────── */}
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />

        {/* ── Load-more state ───────────────────────────────────────────── */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 size={16} className="animate-spin text-[#605943]" aria-hidden="true" />
            <span className="text-xs text-[#605943]">Loading more articles…</span>
          </div>
        )}

        {!hasNextPage && !isLoading && paginatedItems.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-6">
            <CheckCircle2 size={14} className="text-[#605943]" aria-hidden="true" />
            <span className="text-xs text-[#605943]">
              All {data?.pages[0]?.total ?? paginatedItems.length} articles loaded
            </span>
          </div>
        )}
      </div>
    </>
  );
}
