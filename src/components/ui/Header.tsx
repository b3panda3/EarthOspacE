"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Bell, FlaskConical } from "lucide-react";
import Badge from "@/components/ui/Badge";

// ── Demo mode flag ──────────────────────────────────────────────────────────
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface HeaderProps {
  onMenuToggle: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  /* Fetch real events from /api/events */
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) return;
      const data = await res.json();
      const items: NotificationItem[] = [];
      // Add EONET events
      if (data.events) {
        for (const ev of data.events.slice(0, 3)) {
          const ago = getTimeAgo(ev.date);
          items.push({ id: ev.id, title: ev.title, time: ago });
        }
      }
      // Add comets
      if (data.comets) {
        for (const c of data.comets.slice(0, 2)) {
          const ago = getTimeAgo(c.closeApproachDate);
          items.push({ id: c.id, title: `${c.name} approaching — ${c.distanceAU} AU`, time: ago });
        }
      }
      setNotifications(items.slice(0, 5));
    } catch {
      /* silent fail */
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /* Close notification panel on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  return (
    <>
      {/* ── Demo mode banner ───────────────────────────────────────────────── */}
      {IS_DEMO && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-30 flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-medium"
          style={{
            background: "linear-gradient(90deg, rgba(131,105,206,0.18) 0%, rgba(230,201,116,0.12) 100%)",
            borderBottom: "1px solid rgba(131,105,206,0.35)",
          }}
        >
          <FlaskConical size={12} aria-hidden="true" className="text-[#a78bfa]" />
          <span className="text-[#0ea5e9]">
            Demo Mode active — AI responses are pre-generated mock data.
          </span>
          <span className="text-[#1e3a5f]">Set NEXT_PUBLIC_DEMO_MODE=false to use live IBM Granite.</span>
        </div>
      )}

    <header
      role="banner"
      className="sticky top-0 z-20 flex h-14 items-center gap-3 px-4 lg:px-6"
      style={{
        background: "rgba(8,16,32,0.85)",
        borderBottom: "1px solid rgba(30,58,95,0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Mobile hamburger */}
      <button
        aria-label="Open navigation menu"
        aria-expanded={false}
        onClick={onMenuToggle}
        className="rounded-lg p-1.5 text-[#7dd3fc] hover:bg-[#111f36] hover:text-[#e0f2fe] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] lg:hidden"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {/* Logo (visible on mobile / tablet only — desktop shows it in sidebar) */}
      <a
        href="/"
        aria-label="EarthOspacE home"
        className="flex items-center gap-1 select-none lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] rounded"
      >
        <span
          className="text-base font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 60%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Earth
        </span>
        <span className="text-base font-bold tracking-tight text-[#e0f2fe]">OspacE</span>
      </a>

      {/* Spacer — pushes right-side controls to the right */}
      <div className="flex-1" />

      {/* Notification bell */}
      <div ref={notifRef} className="relative">
        <button
          aria-label={notifications.length > 0 ? `Notifications — ${notifications.length} unread` : "Notifications"}
          aria-haspopup="true"
          aria-expanded={notifOpen}
          onClick={() => setNotifOpen((v) => !v)}
          className="relative rounded-lg p-1.5 text-[#7dd3fc] hover:bg-[#111f36] hover:text-[#e0f2fe] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
        >
          <Bell size={18} aria-hidden="true" />
          {notifications.length > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#38bdf8]"
            />
          )}
        </button>

        {/* Notification dropdown */}
        {notifOpen && (
          <div
            role="region"
            aria-label="Notifications"
            className="absolute right-0 mt-2 w-80 rounded-xl border border-[#1e3a5f] bg-[#050a14] shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
              <span className="text-sm font-semibold text-[#e0f2fe]">Notifications</span>
              {notifications.length > 0 && <Badge variant="gold">{notifications.length}</Badge>}
            </div>
            <ul role="list" className="divide-y divide-[#111f36] max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-[#1e3a5f]">Loading events…</li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Badge variant="gold" dot className="mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-[#e0f2fe] leading-snug">{n.title}</p>
                        <p className="text-xs text-[#1e3a5f] mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <div className="px-4 py-3 border-t border-[#1e3a5f]">
              <button className="text-xs text-[#38bdf8] hover:underline focus-visible:outline-none focus-visible:underline">
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
    </>
  );
}

/* ── Helper: relative time string ───────────────────────────────────────── */
function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
