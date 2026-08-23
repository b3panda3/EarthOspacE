"use client";

export type DateRange = "today" | "week" | "month" | "all";

const OPTIONS: { id: DateRange; label: string }[] = [
  { id: "today", label: "Today"      },
  { id: "week",  label: "This Week"  },
  { id: "month", label: "This Month" },
  { id: "all",   label: "All Time"   },
];

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (v: DateRange) => void;
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter by date range"
      className="inline-flex items-center rounded-lg border border-[#1e3a5f] overflow-hidden bg-[#050a14]"
    >
      {OPTIONS.map(({ id, label }) => {
        const isActive = id === value;
        return (
          <button
            key={id}
            aria-pressed={isActive}
            onClick={() => onChange(id)}
            className={[
              "px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#38bdf8]",
              isActive
                ? "bg-[#38bdf8]/15 text-[#38bdf8]"
                : "text-[#1e3a5f] hover:text-[#7dd3fc]",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Date range helper ─────────────────────────────────────────────────── */
export function isWithinRange(isoDate: string, range: DateRange): boolean {
  if (range === "all") return true;
  const now = Date.now();
  const ts = new Date(isoDate).getTime();
  const diff = now - ts;
  if (range === "today")  return diff <= 86_400_000;
  if (range === "week")   return diff <= 7 * 86_400_000;
  if (range === "month")  return diff <= 30 * 86_400_000;
  return true;
}
