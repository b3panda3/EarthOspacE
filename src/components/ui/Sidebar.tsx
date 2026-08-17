"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Telescope,
  Globe,
  Bot,
  User,
  X,
  ChevronRight,
  Satellite,
  TrendingUp,
  Rocket,
} from "lucide-react";

/* ── Nav data ───────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { href: "/",                      label: "Dashboard",        Icon: LayoutDashboard },
  { href: "/news",                  label: "News",             Icon: Newspaper       },
  { href: "/observatory",           label: "Observatories",    Icon: Telescope       },
  { href: "/map",                   label: "Earth Map",        Icon: Globe           },
  { href: "/dashboard/telemetry",   label: "Telemetry",        Icon: Satellite       },
  { href: "/dashboard/predictive",  label: "Predictive",       Icon: TrendingUp      },
  { href: "/dashboard/planning",    label: "Mission Planning", Icon: Rocket          },
  { href: "/robot",                 label: "Robot Companion",  Icon: Bot             },
  { href: "/profile",               label: "Profile",          Icon: User            },
] as const;

/* ── Props ──────────────────────────────────────────────────────────────── */

interface SidebarProps {
  /** Controlled open state (mobile overlay) */
  isOpen: boolean;
  onClose: () => void;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  /* Trap focus inside sidebar when open on mobile */
  useEffect(() => {
    if (isOpen) {
      firstLinkRef.current?.focus();
    }
  }, [isOpen]);

  /* Close on Escape */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /* ── Logo ─────────────────────────────────────────────────────────────── */
  const Logo = () => (
    <div className="flex items-center gap-2 px-5 py-5 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="EarthOspacE" className="h-7 w-auto" />
    </div>
  );

  /* ── Nav items ────────────────────────────────────────────────────────── */
  const NavList = () => (
    <nav aria-label="Main navigation">
      <ul role="list" className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, Icon }, idx) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                ref={idx === 0 ? firstLinkRef : undefined}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-[#e6c974] focus-visible:ring-offset-2 focus-visible:ring-offset-[#24231f]",
                  active
                    ? "bg-[#e6c974]/10 text-[#e6c974]"
                    : "text-[#96938d] hover:bg-[#29271f] hover:text-[#e8e7e5]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Active left-bar indicator */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-[#e6c974]"
                  />
                )}

                <Icon
                  aria-hidden="true"
                  size={18}
                  className={
                    active
                      ? "text-[#e6c974]"
                      : "text-[#605943] group-hover:text-[#e6c974] transition-colors duration-150"
                  }
                />

                <span className="flex-1 font-medium">{label}</span>

                {active && (
                  <ChevronRight
                    aria-hidden="true"
                    size={14}
                    className="text-[#e6c974] opacity-60"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  /* ── Sidebar inner shell (shared desktop / mobile) ───────────────────── */
  const SidebarShell = ({ children }: { children: React.ReactNode }) => (
    <div className="flex h-full flex-col overflow-y-auto">
      {children}
      {/* Bottom version tag */}
      <div className="mt-auto px-5 py-4">
        <p className="text-xs text-[#605943]">EarthOspacE v1.0</p>
      </div>
    </div>
  );

  /* ── Desktop sidebar (always visible ≥ lg) ───────────────────────────── */
  const DesktopSidebar = () => (
    <aside
      aria-label="Sidebar navigation"
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:z-30"
      style={{ background: "rgba(36,35,31,0.95)" }}
    >
      <div
        className="absolute inset-y-0 right-0 w-px"
        style={{ background: "linear-gradient(to bottom, transparent, #605943 20%, #605943 80%, transparent)" }}
        aria-hidden="true"
      />
      <SidebarShell>
        <Logo />
        <NavList />
      </SidebarShell>
    </aside>
  );

  /* ── Mobile overlay + drawer ─────────────────────────────────────────── */
  const MobileDrawer = () => (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* Drawer panel */}
      <aside
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        onKeyDown={handleKeyDown}
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ background: "rgba(36,35,31,0.98)" }}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-4 pt-4">
          <Logo />
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-[#96938d] hover:bg-[#29271f] hover:text-[#e8e7e5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <NavList />
        <div className="mt-auto px-5 py-4">
          <p className="text-xs text-[#605943]">EarthOspacE v1.0</p>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileDrawer />
    </>
  );
}
