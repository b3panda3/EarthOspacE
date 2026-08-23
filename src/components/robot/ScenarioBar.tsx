"use client";

/**
 * ScenarioBar.tsx
 *
 * 5 predefined scenario buttons that set ASTRO's mode and optionally
 * seed a starter message into the conversation.
 */

import type { AstroScenario } from "@/lib/ai/companion";

interface Scenario {
  id:       AstroScenario;
  label:    string;
  icon:     string;
  desc:     string;
  starter?: string;           // message sent automatically on selection
  accentColor: string;
}

const SCENARIOS: Scenario[] = [
  {
    id:          "daily_briefing",
    label:       "Daily Briefing",
    icon:        "📋",
    desc:        "Structured mission briefing",
    accentColor: "#38bdf8",
  },
  {
    id:          "space_weather",
    label:       "Space Weather",
    icon:        "☀️",
    desc:        "Solar & geomagnetic update",
    starter:     "ASTRO, what are the current space weather conditions and should I be concerned?",
    accentColor: "#fb923c",
  },
  {
    id:          "brainstorm",
    label:       "Brainstorm",
    icon:        "💡",
    desc:        "Creative problem-solving",
    starter:     "Let's brainstorm some novel approaches to space exploration challenges.",
    accentColor: "#a78bfa",
  },
  {
    id:          "emergency",
    label:       "Emergency",
    icon:        "🚨",
    desc:        "Emergency protocol simulation",
    starter:     "ASTRO, initiate emergency protocol simulation — solar storm scenario.",
    accentColor: "#f87171",
  },
  {
    id:          "free_chat",
    label:       "Free Chat",
    icon:        "💬",
    desc:        "Open conversation",
    accentColor: "#4ade80",
  },
];

interface ScenarioBarProps {
  active:    AstroScenario;
  onChange:  (s: AstroScenario, starter?: string) => void;
  disabled?: boolean;
}

export default function ScenarioBar({ active, onChange, disabled }: ScenarioBarProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 px-0.5"
      role="tablist"
      aria-label="Conversation scenarios"
    >
      {SCENARIOS.map((sc) => {
        const isActive = active === sc.id;
        return (
          <button
            key={sc.id}
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onChange(sc.id, sc.starter)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
            style={{
              backgroundColor: isActive ? sc.accentColor + "20" : "#050a14",
              border:          `1px solid ${isActive ? sc.accentColor : "#1e3a5f"}`,
              color:           isActive ? sc.accentColor : "#7dd3fc",
              opacity:         disabled ? 0.5 : 1,
              cursor:          disabled ? "not-allowed" : "pointer",
            }}
          >
            <span aria-hidden="true">{sc.icon}</span>
            {sc.label}
          </button>
        );
      })}
    </div>
  );
}
