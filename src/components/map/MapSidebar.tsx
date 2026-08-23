"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  CloudLightning,
  Star,
  Telescope,
  Orbit,
  Filter,
} from "lucide-react";
import type { MapEvent, MapEventCategory } from "@/lib/types";
import { CATEGORY_COLORS } from "@/components/map/EventMarker";
import Badge from "@/components/ui/Badge";

type BadgeVariant = "red" | "blue" | "purple" | "green" | "gold" | "muted";

const CATEGORY_META: Record<
  MapEventCategory,
  { label: string; icon: React.ElementType; variant: BadgeVariant }
> = {
  incident:    { label: "Incidents",    icon: Flame,          variant: "red"    },
  weather:     { label: "Weather",      icon: CloudLightning, variant: "blue"   },
  space:       { label: "Space",        icon: Star,           variant: "purple" },
  observatory: { label: "Observatories",icon: Telescope,      variant: "green"  },
  comet:       { label: "Comets",       icon: Orbit,          variant: "gold"   },
};

const CATEGORY_ORDER: MapEventCategory[] = [
  "incident","weather","space","observatory","comet"
];

interface MapSidebarProps {
  events: MapEvent[];
  onFlyTo: (lat: number, lng: number) => void;
}

export default function MapSidebar({ events, onFlyTo }: MapSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MapEventCategory | "all">("all");

  const grouped = CATEGORY_ORDER.reduce<Record<MapEventCategory, MapEvent[]>>(
    (acc, cat) => {
      acc[cat] = events.filter((e) => e.category === cat);
      return acc;
    },
    { incident: [], weather: [], space: [], observatory: [], comet: [] }
  );

  const visible =
    activeFilter === "all"
      ? events
      : events.filter((e) => e.category === activeFilter);

  const handleFlyTo = useCallback(
    (e: MapEvent) => {
      onFlyTo(e.lat, e.lng);
    },
    [onFlyTo]
  );

  /* ── Collapsed tab ────────────────────────────────────────────────────── */
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label="Expand map sidebar"
        className="absolute top-4 left-4 z-[1000] flex items-center gap-2 rounded-xl border border-[#1e3a5f] px-3 py-2 text-sm font-medium text-[#e0f2fe] transition-colors hover:border-[#38bdf8] hover:text-[#38bdf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
        style={{ background: "rgba(8,16,32,0.96)" }}
      >
        <Filter size={14} aria-hidden="true" />
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Map event list"
      className="absolute top-0 left-0 z-[1000] flex flex-col h-full w-72 overflow-hidden"
      style={{ background: "rgba(8,16,32,0.96)", borderRight: "1px solid #1e3a5f" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f] shrink-0">
        <span className="text-sm font-bold text-[#e0f2fe]">Map Events</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7dd3fc]">{events.length} total</span>
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse map sidebar"
            className="rounded p-1 text-[#1e3a5f] hover:text-[#e0f2fe] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b border-[#1e3a5f] shrink-0">
        <button
          aria-pressed={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            activeFilter === "all"
              ? "bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/40"
              : "text-[#1e3a5f] hover:text-[#7dd3fc]"
          }`}
        >
          All ({events.length})
        </button>
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = grouped[cat].length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              aria-pressed={activeFilter === cat}
              onClick={() => setActiveFilter(cat)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                activeFilter === cat
                  ? "border"
                  : "text-[#1e3a5f] hover:text-[#7dd3fc]"
              }`}
              style={
                activeFilter === cat
                  ? {
                      background: `${CATEGORY_COLORS[cat]}15`,
                      color: CATEGORY_COLORS[cat],
                      borderColor: `${CATEGORY_COLORS[cat]}50`,
                    }
                  : {}
              }
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {CATEGORY_ORDER.filter(
          (cat) =>
            (activeFilter === "all" || activeFilter === cat) &&
            grouped[cat].length > 0
        ).map((cat) => {
          const meta = CATEGORY_META[cat];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Icon = meta.icon as React.FC<any>;
          const items = activeFilter === "all" ? grouped[cat] : visible.filter((e) => e.category === cat);
          return (
            <section key={cat} aria-label={meta.label}>
              {/* Category sub-header */}
              <div
                className="flex items-center gap-2 px-4 py-2 sticky top-0"
                style={{ background: "rgba(8,16,32,0.98)", borderBottom: "1px solid #1e3a5f" }}
              >
                <Icon
                  size={13}
                  aria-hidden="true"
                  style={{ color: CATEGORY_COLORS[cat] }}
                />
                <span className="text-xs font-semibold text-[#7dd3fc]">
                  {meta.label}
                </span>
              </div>

              <ul role="list">
                {items.map((ev) => (
                  <li key={ev.id}>
                    <button
                      onClick={() => handleFlyTo(ev)}
                      aria-label={`Fly to ${ev.title}`}
                      className="w-full text-left flex items-start gap-2.5 px-4 py-2.5 border-b border-[#111f36] transition-colors hover:bg-[#111f36] focus-visible:outline-none focus-visible:bg-[#111f36]"
                    >
                      {/* Severity dot */}
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background:
                            ev.severity === "critical" || ev.severity === "high"
                              ? "#ef4444"
                              : ev.severity === "medium"
                              ? "#f97316"
                              : "#1e3a5f",
                        }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#e0f2fe] leading-snug truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-[#1e3a5f] truncate mt-0.5">
                          {ev.lat.toFixed(2)}°, {ev.lng.toFixed(2)}°
                        </p>
                      </div>
                      <Badge
                        variant={meta.variant}
                        className="shrink-0 text-[9px] ml-auto"
                      >
                        {ev.severity}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
