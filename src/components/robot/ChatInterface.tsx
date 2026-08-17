"use client";

/**
 * ChatInterface.tsx
 *
 * Chat panel with message history and text input.
 *
 * Features:
 *   - User messages: right-aligned, dark bg
 *   - ASTRO messages: left-aligned, gold left-border, card bg
 *   - TTS "Speak" button on each ASTRO message (Web Speech API)
 *   - Global Mute toggle
 *   - Briefing sections rendered with bold headers
 *   - "Daily Briefing" trigger button
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import type { BriefingSection } from "@/lib/ai/companion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:        string;
  role:      "user" | "astro";
  content:   string;
  timestamp: string;
  sections?: BriefingSection[];   // set for briefing messages
  isTyping?: boolean;             // placeholder while loading
}

interface ChatInterfaceProps {
  messages:         ChatMessage[];
  onSend:           (text: string) => void;
  onBriefing:       () => void;
  isLoading:        boolean;
  /** Parent notifies us when user starts typing (for robot thinking anim) */
  onTyping?:        (typing: boolean) => void;
}

// ─── TTS helper ───────────────────────────────────────────────────────────────

function speak(text: string, muted: boolean) {
  if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance     = new SpeechSynthesisUtterance(text);
  utterance.rate      = 0.95;
  utterance.pitch     = 1.1;
  utterance.volume    = 0.9;
  window.speechSynthesis.speak(utterance);
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  muted,
}: {
  msg: ChatMessage;
  muted: boolean;
}) {
  const isUser   = msg.role === "user";
  const isTyping = msg.isTyping;

  return (
    <div
      className={`flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}
    >
      {/* Sender label */}
      <span className={`text-[10px] font-medium px-1 ${isUser ? "text-[#96938d]" : "text-[#e6c974]"}`}>
        {isUser ? "You" : "ASTRO"}
      </span>

      <div className={`flex items-end gap-1.5 ${isUser ? "flex-row-reverse" : "flex-row"} max-w-[90%]`}>
        {/* Bubble */}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-[#29271f] border border-[#605943] text-[#e8e7e5] rounded-br-sm"
              : "bg-[#1e1d18] border-l-2 text-[#e8e7e5] rounded-bl-sm"
          }`}
          style={!isUser ? { borderLeftColor: "#e6c974", borderTop: "1px solid #3a3830", borderRight: "1px solid #3a3830", borderBottom: "1px solid #3a3830" } : {}}
        >
          {isTyping ? (
            /* Typing indicator */
            <div className="flex items-center gap-1 py-0.5 px-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[#e6c974] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : msg.sections ? (
            /* Briefing sections */
            <div className="space-y-3">
              {msg.sections.map((sec, i) => (
                <div key={i}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#e6c974] mb-1">
                    {sec.title}
                  </p>
                  <p className="text-xs text-[#e8e7e5] leading-relaxed">{sec.content}</p>
                </div>
              ))}
            </div>
          ) : (
            msg.content
          )}
        </div>

        {/* Speak button (ASTRO only, not while typing) */}
        {!isUser && !isTyping && (
          <button
            onClick={() => speak(
              msg.sections
                ? msg.sections.map((s) => `${s.title}. ${s.content}`).join(" ")
                : msg.content,
              muted
            )}
            className="mb-0.5 p-1 rounded-full text-[#605943] hover:text-[#e6c974] hover:bg-[#29271f] transition-colors flex-shrink-0"
            aria-label="Speak this message"
            title={muted ? "Muted" : "Speak"}
          >
            {muted ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="2" y1="2" x2="22" y2="22"/>
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Timestamp */}
      {!isTyping && (
        <span className="text-[9px] text-[#605943] px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatInterface({
  messages,
  onSend,
  onBriefing,
  isLoading,
  onTyping,
}: ChatInterfaceProps) {
  const [input, setInput]   = useState("");
  const [muted, setMuted]   = useState(false);
  const bottomRef           = useRef<HTMLDivElement>(null);
  const typingTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onTyping?.(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping?.(false), 1200);
  }, [onTyping]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    onTyping?.(false);
    onSend(trimmed);
  }, [input, isLoading, onSend, onTyping]);

  const handleKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full bg-[#100f0e] rounded-2xl border border-[#605943] overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3a3830] bg-[#24231f]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80] block" />
            <span className="absolute inset-0 rounded-full bg-[#4ade80] animate-ping opacity-60" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#e8e7e5]">ASTRO</p>
            <p className="text-[10px] text-[#605943]">AI Companion · ISS Module</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            onClick={() => setMuted((m) => !m)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-colors ${
              muted
                ? "border-[#f87171] text-[#f87171] bg-[#f8717110]"
                : "border-[#3a3830] text-[#96938d] hover:text-[#e8e7e5]"
            }`}
            aria-pressed={muted}
          >
            {muted ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="2" y1="2" x2="22" y2="22"/>
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              </svg>
            )}
            {muted ? "Muted" : "Sound"}
          </button>

          {/* Briefing button */}
          <button
            onClick={onBriefing}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg text-xs border border-[#e6c974] text-[#e6c974] bg-[#e6c97412] hover:bg-[#e6c97420] transition-colors disabled:opacity-50"
          >
            📋 Briefing
          </button>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#e6c97420] border border-[#e6c974] flex items-center justify-center text-2xl">
              🤖
            </div>
            <p className="text-sm text-[#96938d] max-w-xs">
              Hello! I&apos;m ASTRO, your AI companion. Ask me about space conditions, request a briefing, or just chat.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} muted={muted} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div className="border-t border-[#3a3830] bg-[#1a1816] px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder="Message ASTRO…"
            disabled={isLoading}
            className="flex-1 bg-[#24231f] border border-[#3a3830] rounded-xl px-3.5 py-2 text-sm text-[#e8e7e5] placeholder-[#605943] focus:outline-none focus:border-[#e6c974] transition-colors disabled:opacity-50"
            aria-label="Message input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#e6c974] text-[#100f0e] flex items-center justify-center hover:bg-[#c3ac6a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#605943] mt-1.5 text-center">
          Press Enter to send · Powered by IBM Granite
        </p>
      </div>
    </div>
  );
}
