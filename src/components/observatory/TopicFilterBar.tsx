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
        <span className="text-xs font-semibold text-[#7dd3fc]">
          Topic Filters
        </span>
        {activeTags.size > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] text-[#1e3a5f] hover:text-[#38bdf8] transition-colors focus-visible:outline-none focus-visible:underline"
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000]",
                active
                  ? "bg-[#a78bfa]/15 border-[#a78bfa]/50 text-[#a78bfa]"
                  : "bg-[#050a14] border-[#1e3a5f] text-[#1e3a5f] hover:border-[#1e3a5f] hover:text-[#7dd3fc]",
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
