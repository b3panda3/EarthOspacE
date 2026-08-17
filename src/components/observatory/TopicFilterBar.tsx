"use client";

interface TopicFilterBarProps {
  allTags: string[];
  activeTags: Set<string>;
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export default function TopicFilterBar({
  allTags,
  activeTags,
  onToggle,
  onClear,
}: TopicFilterBarProps) {
  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#96938d]">
          Topic Filters
        </span>
        {activeTags.size > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] text-[#605943] hover:text-[#e6c974] transition-colors focus-visible:outline-none focus-visible:underline"
          >
            Clear ({activeTags.size})
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filter by topic"
        className="flex flex-wrap gap-1.5"
      >
        {allTags.map((tag) => {
          const active = activeTags.has(tag);
          return (
            <button
              key={tag}
              aria-pressed={active}
              onClick={() => onToggle(tag)}
              className={[
                "rounded-full px-2.5 py-1 text-xs font-medium border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100f0e]",
                active
                  ? "bg-[#8369ce]/15 border-[#8369ce]/50 text-[#8369ce]"
                  : "bg-[#24231f] border-[#3a3830] text-[#605943] hover:border-[#605943] hover:text-[#96938d]",
              ].join(" ")}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
