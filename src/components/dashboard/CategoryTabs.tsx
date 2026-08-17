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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100f0e]",
              isActive
                ? "text-[#e6c974]"
                : "text-[#605943] hover:text-[#96938d]",
            ].join(" ")}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg bg-[#e6c974]/10 border border-[#e6c974]/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{label}</span>
            {count > 0 && (
              <span
                className={`relative z-10 text-[10px] tabular-nums rounded-full px-1.5 py-0.5 ${
                  isActive
                    ? "bg-[#e6c974]/20 text-[#e6c974]"
                    : "bg-[#29271f] text-[#605943]"
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
