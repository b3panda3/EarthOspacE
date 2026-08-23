"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Satellite,
  CloudLightning,
  Newspaper,
  Orbit,
  RefreshCw,
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import NewsCard from "@/components/dashboard/NewsCard";
import StatCard from "@/components/dashboard/StatCard";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import CometList from "@/components/dashboard/CometList";
import CategoryTabs, {
  type FilterCategory,
} from "@/components/dashboard/CategoryTabs";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { NewsItem, QuickAssessment } from "@/lib/types";
import type { EonetEvent } from "@/app/api/events/route";

/* ── API response types ──────────────────────────────────────────────────── */

interface NewsResponse {
  items: NewsItem[];
  total: number;
}

interface EventsResponse {
  events: EonetEvent[];
  comets: unknown[];
  stats: {
    activeSpaceEvents: number;
    weatherAlerts: number;
    upcomingComets: number;
  };
}

/* ── UTC date helper ─────────────────────────────────────────────────────── */

function utcDateString(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }) + " UTC";
}

/* ── Hero section ────────────────────────────────────────────────────────── */

function HeroSection({
  profile,
  briefing,
  briefingLoading,
}: {
  profile: { role: string; personalitySummary: string } | null;
  briefing: string;
  briefingLoading: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      aria-label="Welcome section"
      className="rounded-2xl border border-[#1e3a5f] bg-gradient-to-br from-[#111f36] via-[#050a14] to-[#1a1916] p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-[#1e3a5f] mb-1">{utcDateString()}</p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#e0f2fe]">
            Welcome back,{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #38bdf8, #0ea5e9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {profile?.role ?? "Explorer"}
            </span>
          </h1>
          <p className="text-sm text-[#7dd3fc] mt-1 max-w-xl">
            {profile?.personalitySummary ??
              "Configure your profile to get a personalised mission briefing."}
          </p>
        </div>
        <div className="shrink-0">
          <Badge variant="purple">
            <Sparkles size={11} className="mr-1" aria-hidden="true" />
            IBM Granite
          </Badge>
        </div>
      </div>

      {/* Daily briefing */}
      <div className="mt-5 rounded-xl border border-[#38bdf8]/20 bg-[#38bdf8]/5 px-4 py-3">
        <p className="text-xs text-[#0ea5e9] font-semibold mb-1.5">
          Daily Briefing
        </p>
        {briefingLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-[#1e3a5f]" aria-hidden="true" />
            <p className="text-sm text-[#1e3a5f] italic">
              Generating mission briefing…
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#e0f2fe] leading-relaxed italic">
            {briefing}
          </p>
        )}
      </div>
    </motion.section>
  );
}

/* ── Quick Assessment Widget ─────────────────────────────────────────────── */

interface QuickAssessmentResponse {
  quickAssessment: QuickAssessment;
}

function QuickAssessmentWidget() {
  const { data, isLoading } = useQuery<QuickAssessmentResponse>({
    queryKey: ["quick-assessment"],
    queryFn:  async () => {
      const res = await fetch("/api/predictive?days=1");
      if (!res.ok) throw new Error("assessment fetch failed");
      return res.json() as Promise<QuickAssessmentResponse>;
    },
    staleTime:       28 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: false,
  });

  const qa = data?.quickAssessment;

  // Score 1-10: gradient green(10) → yellow(5) → red(1)
  const scoreColor = (s: number) =>
    s >= 8 ? "#4ade80" : s >= 6 ? "#a3e635" : s >= 4 ? "#38bdf8" : s >= 2 ? "#fb923c" : "#f87171";

  const arcDeg = (s: number) => (s / 10) * 180; // 0-180° half circle

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      aria-label="Space conditions quick assessment"
      className="rounded-xl border border-[#1e3a5f] bg-[#050a14] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      {/* Gauge */}
      <div className="flex-shrink-0 relative w-20 h-11 mx-auto sm:mx-0">
        {isLoading ? (
          <div className="w-20 h-10 rounded-t-full bg-[#1e3a5f] animate-pulse" />
        ) : (
          <svg viewBox="0 0 80 44" className="w-full h-full" aria-hidden="true">
            {/* Track arc */}
            <path d="M8 40 A32 32 0 0 1 72 40" fill="none" stroke="#1e3a5f" strokeWidth={7} strokeLinecap="round" />
            {/* Filled arc — clipped by score */}
            {qa && (
              <path
                d="M8 40 A32 32 0 0 1 72 40"
                fill="none"
                stroke={scoreColor(qa.score)}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${(arcDeg(qa.score) / 180) * 100.5} 100.5`}
              />
            )}
            {/* Score text */}
            <text x="40" y="38" textAnchor="middle" fill={qa ? scoreColor(qa.score) : "#1e3a5f"} fontSize="16" fontWeight="bold" fontFamily="monospace">
              {qa?.score ?? "—"}
            </text>
          </svg>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-[#1e3a5f] animate-pulse" />
            <div className="h-3 w-56 rounded bg-[#1e3a5f] animate-pulse" />
          </div>
        ) : qa ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold"
                style={{ color: scoreColor(qa.score) }}
              >
                {qa.label}
              </span>
              <span className="text-xs text-[#1e3a5f]">·</span>
              <span className="text-xs text-[#7dd3fc]">Space Conditions Score {qa.score}/10</span>
            </div>
            <p className="text-xs text-[#e0f2fe] mt-0.5 leading-relaxed">{qa.summary}</p>
          </>
        ) : (
          <p className="text-xs text-[#1e3a5f]">Assessment unavailable</p>
        )}
      </div>

      {/* Link to full predictive page */}
      <Link
        href="/dashboard/predictive"
        className="flex-shrink-0 flex items-center gap-1 text-xs text-[#7dd3fc] hover:text-[#38bdf8] transition-colors"
        aria-label="View full predictive forecast"
      >
        Full forecast <ChevronRight size={12} />
      </Link>
    </motion.section>
  );
}

/* ── Air Incidents mini-feed ─────────────────────────────────────────────── */

function AirIncidentsFeed({ events }: { events: EonetEvent[] }) {
  const incidents = events.filter(
    (e) => e.type === "Severe Storms" || e.type === "Wildfires" || e.type === "Volcanoes"
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>⚠️ Recent Incidents</CardTitle>
      </CardHeader>
      {incidents.length === 0 ? (
        <p className="text-xs text-[#1e3a5f] py-2">No active incidents.</p>
      ) : (
        <ul role="list" className="divide-y divide-[#1e3a5f]">
          {incidents.slice(0, 5).map((ev) => (
            <li key={ev.id} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[#e0f2fe] leading-snug truncate">
                  {ev.title}
                </p>
                <Badge variant="red" className="shrink-0 text-[10px]">
                  {ev.type}
                </Badge>
              </div>
              <p className="text-[10px] text-[#1e3a5f] mt-0.5">
                {new Date(ev.date).toLocaleDateString("en-GB", { timeZone: "UTC" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { profile, loading } = useProfile();
  const [activeTab, setActiveTab] = useState<FilterCategory>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Redirect to onboarding if no profile exists
  useEffect(() => {
    if (!profile && !loading) {
      router.replace("/profile/onboarding");
    }
  }, [profile, loading, router]);

  // Show loading while checking profile
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-3">
            <span className="absolute inset-0 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-[#7dd3fc]">Loading mission profile…</p>
        </div>
      </div>
    );
  }
 // mobile sidebar toggle

  /* ── Daily briefing from Granite (via server route) ──────────────────── */
  const {
    data: briefingData,
    isLoading: briefingLoading,
  } = useQuery({
    queryKey: ["briefing", profile?.role, profile?.missionType],
    queryFn: async () => {
      const role = encodeURIComponent(profile?.role ?? "Space Enthusiast");
      const mission = encodeURIComponent(profile?.missionType ?? "Ground-based Research");
      const res = await fetch(`/api/briefing?role=${role}&mission=${mission}`);
      if (!res.ok) throw new Error("Briefing fetch failed");
      const body = (await res.json()) as { briefing: string };
      return body.briefing;
    },
    staleTime: 30 * 60 * 1000, // 30 min — don't regenerate on every visit
    retry: false,
  });

  /* ── News feed ────────────────────────────────────────────────────────── */
  const newsParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("role", profile?.role ?? "Space Enthusiast");
    p.set("mission", profile?.missionType ?? "Ground-based Research");
    if (profile?.interests) {
      p.set("interests", encodeURIComponent(JSON.stringify(profile.interests)));
    }
    return p.toString();
  }, [profile]);

  const {
    data: newsData,
    isLoading: newsLoading,
    isError: newsError,
    refetch: refetchNews,
    isFetching: newsFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["news", newsParams],
    queryFn: async () => {
      const res = await fetch(`/api/news?${newsParams}`);
      if (!res.ok) throw new Error("News fetch failed");
      return res.json() as Promise<NewsResponse>;
    },
    refetchInterval: 30_000, // 30 s auto-refresh
    staleTime: 25_000,
  });

  /* ── Events / stats ───────────────────────────────────────────────────── */
  const { data: eventsData } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Events fetch failed");
      return res.json() as Promise<EventsResponse>;
    },
    refetchInterval: 3 * 60 * 1000, // 3 min
    staleTime: 2 * 60 * 1000,
  });

  /* ── Derived values ───────────────────────────────────────────────────── */
  const allNews = newsData?.items ?? [];

  const filteredNews = useMemo(
    () =>
      activeTab === "all"
        ? allNews
        : allNews.filter((n) => n.category === activeTab),
    [allNews, activeTab]
  );

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<FilterCategory, number>> = {};
    for (const item of allNews) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [allNews]);

  const stats = eventsData?.stats;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6 max-w-screen-xl mx-auto">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <HeroSection
        profile={profile}
        briefing={briefingData ?? ""}
        briefingLoading={briefingLoading}
      />

      {/* ── Quick Assessment ─────────────────────────────────────────────── */}
      <QuickAssessmentWidget />

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <section
        aria-label="Summary statistics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <StatCard
          label="Active Space Events"
          value={stats?.activeSpaceEvents ?? 0}
          icon={Satellite}
          accentColor="#a78bfa"
        />
        <StatCard
          label="Weather Alerts"
          value={stats?.weatherAlerts ?? 0}
          icon={CloudLightning}
          accentColor="#38bdf8"
        />
        <StatCard
          label="News Articles Today"
          value={allNews.length}
          icon={Newspaper}
          accentColor="#38bdf8"
        />
        <StatCard
          label="Upcoming Comets"
          value={stats?.upcomingComets ?? 0}
          icon={Orbit}
          accentColor="#34d399"
        />
      </section>

      {/* ── Main content + sidebar ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── News grid column ─────────────────────────────────────────── */}
        <section aria-label="News feed" className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Toolbar: tabs + refresh */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CategoryTabs
              active={activeTab}
              onChange={setActiveTab}
              counts={categoryCounts}
            />
            <div className="flex items-center gap-2 shrink-0">
              {dataUpdatedAt > 0 && (
                <span className="text-[10px] text-[#1e3a5f] hidden sm:block">
                  Updated {new Date(dataUpdatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={() => refetchNews()}
                disabled={newsFetching}
                aria-label="Refresh news"
                className="rounded-lg p-1.5 text-[#1e3a5f] hover:text-[#e0f2fe] hover:bg-[#111f36] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] disabled:opacity-40"
              >
                <RefreshCw
                  size={14}
                  aria-hidden="true"
                  className={newsFetching ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {newsLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[#1e3a5f]" aria-label="Loading news" />
            </div>
          )}

          {/* Error state */}
          {newsError && !newsLoading && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4">
              <AlertCircle size={18} className="text-red-400 shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-400">
                Failed to load news. Check your API configuration.
              </p>
            </div>
          )}

          {/* Empty filtered state */}
          {!newsLoading && !newsError && filteredNews.length === 0 && (
            <p className="text-sm text-[#1e3a5f] text-center py-12">
              No {activeTab === "all" ? "" : activeTab + " "}articles found.
            </p>
          )}

          {/* News grid with staggered animation */}
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredNews.map((item, i) => (
                <NewsCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </AnimatePresence>
        </section>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          aria-label="Dashboard sidebar"
          className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4"
        >
          {/* Mobile: collapsible toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center justify-between w-full rounded-xl border border-[#1e3a5f] bg-[#050a14] px-4 py-3 text-sm font-medium text-[#7dd3fc] lg:hidden"
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar-content"
          >
            <span>Data Panels</span>
            {sidebarOpen ? (
              <ChevronUp size={16} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
          </button>

          {/* Sidebar panels — always visible on desktop, toggled on mobile */}
          <div
            id="dashboard-sidebar-content"
            className={[
              "flex flex-col gap-4",
              "lg:flex", // always flex on desktop
              sidebarOpen ? "flex" : "hidden lg:flex",
            ].join(" ")}
          >
            <WeatherWidget />
            <CometList />
            {eventsData && (
              <AirIncidentsFeed events={eventsData.events} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
