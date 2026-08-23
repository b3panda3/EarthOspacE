"use client";

/**
 * /src/app/robot/page.tsx
 *
 * ASTRO Robot Companion — flagship feature page.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │ ScenarioBar (top)                                │
 *   ├─────────────────────────┬────────────────────────┤
 *   │ 3D Robot scene (2/3)   │ ChatInterface (1/3)    │
 *   │ RobotScene (r3f canvas) │ messages + input       │
 *   └─────────────────────────┴────────────────────────┘
 *
 * On mobile: scene on top, chat panel below.
 *
 * State machine:
 *   idle → user starts typing → thinking
 *   thinking → send message → thinking (API in flight)
 *   API responds → speaking (plays for 2.5s) → idle
 *   briefing received → speaking + dataTransfer (2s) → idle
 */

import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect } from "react";
import { useProfile } from "@/lib/hooks/useProfile";
import ChatInterface, { type ChatMessage } from "@/components/robot/ChatInterface";
import ScenarioBar from "@/components/robot/ScenarioBar";
import type { RobotState } from "@/components/robot/RobotCharacter";
import type { AstroScenario, BriefingSection } from "@/lib/ai/companion";

// ─── Dynamic import — R3F must never SSR ─────────────────────────────────────

const RobotScene = dynamic(() => import("@/components/robot/RobotScene"), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <span className="absolute inset-0 rounded-full border-2 border-[#38bdf8] border-t-transparent animate-spin" />
        </div>
        <p className="text-xs text-[#1e3a5f]">Initialising 3D environment…</p>
      </div>
    </div>
  ),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function RobotPage() {
  const { profile }                               = useProfile();
  const [messages, setMessages]                   = useState<ChatMessage[]>([]);
  const [robotState, setRobotState]               = useState<RobotState>("idle");
  const [scenario, setScenario]                   = useState<AstroScenario>("free_chat");
  const [isLoading, setIsLoading]                 = useState(false);
  const [dataTransfer, setDataTransfer]           = useState(false);
  const speakingTimer                             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef                                = useRef<ChatMessage[]>([]);

  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!hasLoaded.current && messages.length === 0) {
      hasLoaded.current = true;
      setTimeout(() => handleBriefing(), 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep historyRef in sync (avoids closure-staleness in callbacks)
  useEffect(() => { historyRef.current = messages; }, [messages]);

  // ── Helper: set robot state with auto-revert ────────────────────────────
  const triggerState = useCallback((s: RobotState, durationMs: number) => {
    if (speakingTimer.current) clearTimeout(speakingTimer.current);
    setRobotState(s);
    speakingTimer.current = setTimeout(() => setRobotState("idle"), durationMs);
  }, []);

  // ── Handle scenario change ──────────────────────────────────────────────
  const handleScenarioChange = useCallback((s: AstroScenario, starter?: string) => {
    setScenario(s);
    if (starter) {
      // Trigger the starter message after a brief delay
      setTimeout(() => handleSend(starter), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send a chat message ─────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id:        genId(),
      role:      "user",
      content:   text,
      timestamp: nowISO(),
    };

    const typingMsg: ChatMessage = {
      id:        genId() + "-typing",
      role:      "astro",
      content:   "",
      timestamp: nowISO(),
      isTyping:  true,
    };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setIsLoading(true);
    setRobotState("thinking");

    try {
      const res = await fetch("/api/robot", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:     text,
          history:     historyRef.current
            .filter((m) => !m.isTyping)
            .slice(-20)
            .map((m) => ({ role: m.role === "astro" ? "assistant" : "user", content: m.content, timestamp: m.timestamp })),
          scenario,
          userRole:    profile?.role ?? "Space Explorer",
          missionType: profile?.missionType ?? "Ground-based Research",
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };

      const astroMsg: ChatMessage = {
        id:        genId(),
        role:      "astro",
        content:   data.reply ?? data.error ?? "Sorry, I encountered an error. Please try again.",
        timestamp: nowISO(),
      };

      // Replace typing placeholder
      setMessages((prev) => [...prev.filter((m) => !m.isTyping), astroMsg]);
      triggerState("speaking", 2500);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.isTyping),
        {
          id:        genId(),
          role:      "astro",
          content:   "Communication disrupted. Please check your connection and try again.",
          timestamp: nowISO(),
        },
      ]);
      setRobotState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, scenario, profile, triggerState]);

  // ── Request daily briefing ──────────────────────────────────────────────
  const handleBriefing = useCallback(async () => {
    if (isLoading) return;

    const typingMsg: ChatMessage = {
      id:       genId() + "-briefing-typing",
      role:     "astro",
      content:  "Compiling your daily briefing…",
      timestamp: nowISO(),
      isTyping: true,
    };

    setMessages((prev) => [...prev, typingMsg]);
    setIsLoading(true);
    setRobotState("thinking");
    setScenario("daily_briefing");

    try {
      const res = await fetch("/api/robot?mode=briefing", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userRole:    profile?.role ?? "Space Explorer",
          missionType: profile?.missionType ?? "Ground-based Research",
        }),
      });

      const data = (await res.json()) as { briefing?: BriefingSection[]; error?: string };

      const briefingMsg: ChatMessage = {
        id:        genId(),
        role:      "astro",
        content:   "Here is your daily mission briefing:",
        timestamp: nowISO(),
        sections:  data.briefing ?? [],
      };

      setMessages((prev) => [...prev.filter((m) => !m.isTyping), briefingMsg]);

      // Trigger speaking + data transfer particle effect
      triggerState("speaking", 3000);
      setDataTransfer(true);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.isTyping),
        {
          id:        genId(),
          role:      "astro",
          content:   "Unable to compile briefing at this time. Please try again.",
          timestamp: nowISO(),
        },
      ]);
      setRobotState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, profile, triggerState]);

  // ── Typing notification from ChatInterface ──────────────────────────────
  const handleTyping = useCallback((typing: boolean) => {
    if (!isLoading) {
      setRobotState(typing ? "thinking" : "idle");
    }
  }, [isLoading]);

  // ── Data transfer done ──────────────────────────────────────────────────
  const handleTransferDone = useCallback(() => {
    setDataTransfer(false);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[900px] bg-[#000000] overflow-hidden">

      {/* ── Header / title strip ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-[#1e3a5f] px-4 py-2.5 flex items-center justify-between bg-[#000000]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/40 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#e0f2fe] tracking-wide">ASTRO Companion</h1>
            <p className="text-[10px] text-[#1e3a5f]">AI Robot · IBM Granite · ISS Simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              robotState === "idle"     ? "border-[#4ade80] text-[#4ade80] bg-[#4ade8012]" :
              robotState === "thinking" ? "border-[#38bdf8] text-[#38bdf8] bg-[#38bdf812]" :
              robotState === "speaking" ? "border-[#a78bfa] text-[#a78bfa] bg-[#a78bfa12]" :
                                          "border-[#fb923c] text-[#fb923c] bg-[#fb923c12]"
            }`}
          >
            {robotState === "idle"     ? "● Standby"   :
             robotState === "thinking" ? "◐ Thinking"  :
             robotState === "speaking" ? "◉ Speaking"  :
                                         "◌ Waving"}
          </span>
        </div>
      </div>

      {/* ── Scenario bar ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-[#1e3a5f] px-4 py-2.5 bg-[#000000]">
        <ScenarioBar
          active={scenario}
          onChange={handleScenarioChange}
          disabled={isLoading}
        />
      </div>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* ── 3D Scene ─────────────────────────────────────────────────────── */}
        <div className="relative lg:flex-[3] h-52 sm:h-64 lg:h-auto bg-[#000000] border-b lg:border-b-0 lg:border-r border-[#1e3a5f]">
          <RobotScene
            robotState={robotState}
            dataTransfer={dataTransfer}
            onTransferDone={handleTransferDone}
            gender={profile?.gender ?? "male"}
          />

          {/* Overlay: robot status */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
            {/* State label */}
            <div className="bg-[#000000cc] backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-[#1e3a5f]">
              <p className="text-[10px] text-[#7dd3fc]">
                {robotState === "idle"     ? "ASTRO is ready" :
                 robotState === "thinking" ? "Processing…"   :
                 robotState === "speaking" ? "Transmitting…"  :
                                             "Waving hello"}
              </p>
            </div>

            {/* Wave button */}
            <button
              onClick={() => triggerState("wave", 3000)}
              className="pointer-events-auto bg-[#000000cc] backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-[#1e3a5f] text-[10px] text-[#7dd3fc] hover:text-[#38bdf8] hover:border-[#38bdf8] transition-colors"
            >
              Wave
            </button>
          </div>

          {/* Drag hint */}
          <p className="absolute top-2 right-3 text-[9px] text-[#1e3a5f] pointer-events-none select-none">
            drag to rotate
          </p>
        </div>

        {/* ── Chat panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 lg:flex-[2] min-h-0 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSend={handleSend}
            onBriefing={handleBriefing}
            isLoading={isLoading}
            onTyping={handleTyping}
          />
        </div>
      </div>
    </div>
  );
}
