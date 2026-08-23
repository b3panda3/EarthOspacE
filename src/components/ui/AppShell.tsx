"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import StarField from "@/components/ui/StarField";
import Sidebar from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { ProfileProvider } from "@/lib/hooks/useProfile";
import QueryProvider from "@/components/ui/QueryProvider";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Client-side shell that owns:
 *  - ProfileProvider (global profile context)
 *  - Star field background
 *  - Sidebar (with mobile open/close state)
 *  - Sticky header
 *  - Framer Motion page transitions
 */
export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <QueryProvider>
    <ProfileProvider>
    <div className="relative min-h-screen" style={{ background: "#000000" }}>

      {/* Skip-to-content link for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        style={{ background: "#38bdf8", color: "#000000" }}
      >
        Skip to main content
      </a>

      {/* Layer 0 — animated star field */}
      <StarField />

      {/* Layer 1 — sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Layer 2 — main column (pushed right on desktop to clear sidebar) */}
      <div className="relative z-10 flex flex-col min-h-screen lg:pl-60">
        {/* Sticky header */}
        <Header
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />

        {/* Page content with Framer Motion transitions */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            id="main-content"
            tabIndex={-1}
            aria-label="Page content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="flex-1 px-4 py-6 lg:px-8 focus-visible:outline-none"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
    </ProfileProvider>
    </QueryProvider>
  );
}
