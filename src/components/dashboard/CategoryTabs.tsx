"use client";

import { motion } from "framer-motion";
import type { NewsItem } from "@/lib/types";

export type FilterCategory = "all" | NewsItem["category"];

const TABS: { id: FilterCategory; label: string }[] = [
  { id: "all",         label: "All"           },
  { id: "climate",     label: "Weather"       },
  { id: "disaster",    label: "Incidents"     },
  { id: "space",       label: "Space"         },
  { id: "astronomy",   label: "Comets"        },
  { id: "technology",  label: "Transport"     },
  { id: "environment", label: "Environment"   },
];

interface CategoryTabsProps {
  active: FilterCategory;
  onChange: (cat: FilterCategory) => void;
  counts: Partial<Record<FilterCategory, number>>;
}

export default function CategoryTabs({ active, onChange, counts }: CategoryTabsProps) {
  return (
    <nav
      aria-label="Filter news by category"
      className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none"
    >
      {TABS.map(({ id, label }) => {
        const isActive = id === active;
        const count = id === "all"
          ? Object.values(counts).reduce<number>((s, v) => s + (v ?? 0), 0)
          : (counts[id] ?? 0);

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000]",
              isActive
                ? "text-[#38bdf8]"
                : "text-[#1e3a5f] hover:text-[#7dd3fc]",
            ].join(" ")}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{label}</span>
            {count > 0 && (
              <span
                className={`relative z-10 text-[10px] tabular-nums rounded-full px-1.5 py-0.5 ${
                  isActive
                    ? "bg-[#38bdf8]/20 text-[#38bdf8]"
                    : "bg-[#111f36] text-[#1e3a5f]"
                }`}
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
