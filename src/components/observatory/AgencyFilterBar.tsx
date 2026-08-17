"use client";

import { motion } from "framer-motion";
import type { ObservatoryAgency } from "@/lib/types";

type BadgeVariant = "blue" | "purple" | "red" | "gold" | "green" | "muted";

export type AgencyFilter = ObservatoryAgency | "All";

const AGENCIES: { id: AgencyFilter; label: string; variant: BadgeVariant; emoji: string }[] = [
  { id: "All",           label: "All Agencies",  variant: "muted",  emoji: "🌌" },
  { id: "NASA",          label: "NASA",          variant: "blue",   emoji: "🔵" },
  { id: "ESA",           label: "ESA",           variant: "purple", emoji: "🟣" },
  { id: "JAXA",          label: "JAXA",          variant: "red",    emoji: "🔴" },
  { id: "ISRO",          label: "ISRO",          variant: "gold",   emoji: "🟠" },
  { id: "CSA",           label: "CSA",           variant: "green",  emoji: "🟢" },
  { id: "SpaceFlightNow",label: "SpaceFlightNow",variant: "muted",  emoji: "🛰️" },
  { id: "Other",         label: "Other",         variant: "muted",  emoji: "🌠" },
];

const AGENCY_COLORS: Record<string, string> = {
  NASA: "#38bdf8", ESA: "#8369ce", JAXA: "#ef4444",
  ISRO: "#f97316", CSA: "#34d399", SpaceFlightNow: "#96938d", Other: "#605943",
};

interface AgencyFilterBarProps {
  active: AgencyFilter;
  onChange: (a: AgencyFilter) => void;
  counts: Partial<Record<AgencyFilter, number>>;
}

export default function AgencyFilterBar({ active, onChange, counts }: AgencyFilterBarProps) {
  const total = Object.values(counts).reduce<number>((s, v) => s + (v ?? 0), 0);

  return (
    <nav
      aria-label="Filter by space agency"
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      {AGENCIES.map(({ id, label, emoji }) => {
        const isActive = id === active;
        const count = id === "All" ? total : (counts[id] ?? 0);
        const color = id === "All" ? "#e6c974" : AGENCY_COLORS[id] ?? "#605943";

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              "relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100f0e]",
              isActive ? "text-[#e8e7e5]" : "text-[#605943] hover:text-[#96938d]",
            ].join(" ")}
            style={
              isActive
                ? { background: `${color}15`, border: `1px solid ${color}40` }
                : { border: "1px solid transparent" }
            }
          >
            {isActive && (
              <motion.span
                layoutId="agency-pill"
                className="absolute inset-0 rounded-xl"
                style={{ background: `${color}10`, border: `1px solid ${color}40` }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 text-base leading-none" aria-hidden="true">
              {emoji}
            </span>
            <span className="relative z-10">{label}</span>
            {count > 0 && (
              <span
                className="relative z-10 text-[10px] tabular-nums rounded-full px-1.5 py-0.5"
                style={
                  isActive
                    ? { background: `${color}25`, color }
                    : { background: "#29271f", color: "#605943" }
                }
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
