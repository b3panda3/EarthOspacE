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
      className="inline-flex items-center rounded-lg border border-[#3a3830] overflow-hidden bg-[#24231f]"
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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e6c974]",
              isActive
                ? "bg-[#e6c974]/15 text-[#e6c974]"
                : "text-[#605943] hover:text-[#96938d]",
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
