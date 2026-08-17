import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/ui/AppShell";

/* ── Fonts ────────────────────────────────────────────────────────────── */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ── Metadata ─────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: {
    default: "EarthOspacE",
    template: "%s · EarthOspacE",
  },
  description:
    "Explore Earth and space through real-time data, AI insights, and immersive visualisations.",
  keywords: ["space", "earth", "NASA", "climate", "observatory", "AI", "IBM Granite"],
  authors: [{ name: "EarthOspacE" }],
};

export const viewport: Viewport = {
  themeColor: "#100f0e",
  colorScheme: "dark",
};

/* ── Layout ───────────────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
       * Skip-to-content link — first focusable element for keyboard users.
       * Positioned off-screen until focused.
       */}
      <body className="h-full bg-[#100f0e] text-[#e8e7e5]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-[#e6c974] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#100f0e] focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>

        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
