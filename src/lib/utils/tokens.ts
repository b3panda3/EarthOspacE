/**
 * /src/lib/utils/tokens.ts
 *
 * Single source-of-truth for all EarthOspacE design tokens.
 * Import these into components instead of hardcoding hex values.
 *
 * Usage:
 *   import { colors, spacing, radius, typography } from "@/lib/utils/tokens";
 *   style={{ backgroundColor: colors.surface }}
 */

// ─── Color palette ────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds
  deep:    "#000000",
  dark:    "#050a14",
  surface: "#111f36",

  // Borders
  border:       "#1e3a5f",
  borderSubtle: "#1e3a5f",
  borderFaint:  "#2a2820",

  // Gold accents
  gold:      "#38bdf8",
  goldMuted: "#0ea5e9",
  goldFaint: "rgba(230,201,116,0.12)",

  // Text
  textPrimary: "#e0f2fe",
  textMuted:   "#7dd3fc",
  textFaint:   "#1e3a5f",

  // Purple accent
  purple:      "#a78bfa",
  purpleFaint: "rgba(131,105,206,0.12)",

  // Status colours (risk / alert)
  green:   "#4ade80",
  yellow:  "#38bdf8",
  orange:  "#fb923c",
  red:     "#f87171",
  blue:    "#60a5fa",

  // Semi-transparent overlays
  overlay: "rgba(8,16,32,0.85)",
} as const;

// ─── Spacing scale (in px) ────────────────────────────────────────────────────

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const radius = {
  sm:   "0.375rem",   // 6px
  md:   "0.5rem",     // 8px
  lg:   "0.75rem",    // 12px
  xl:   "1rem",       // 16px
  xxl:  "1.25rem",    // 20px
  full: "9999px",
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  fontSans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  fontMono: "var(--font-geist-mono), ui-monospace, monospace",

  sizeXs:   "0.625rem",   // 10px
  sizeSm:   "0.75rem",    // 12px
  sizeMd:   "0.875rem",   // 14px
  sizeLg:   "1rem",       // 16px
  sizeXl:   "1.125rem",   // 18px
  size2xl:  "1.25rem",    // 20px
  size3xl:  "1.5rem",     // 24px

  weightNormal:   "400",
  weightMedium:   "500",
  weightSemibold: "600",
  weightBold:     "700",

  lineNormal:  "1.5",
  lineRelaxed: "1.625",
  lineSnug:    "1.375",
} as const;

// ─── Shadows / glows ─────────────────────────────────────────────────────────

export const shadows = {
  gold:   "0 0 20px rgba(230,201,116,0.15)",
  purple: "0 0 20px rgba(131,105,206,0.15)",
  card:   "0 4px 24px rgba(0,0,0,0.5)",
} as const;

// ─── Animation durations (ms) ────────────────────────────────────────────────

export const duration = {
  fast:   150,
  normal: 250,
  slow:   400,
} as const;

// ─── Breakpoints (px) ─────────────────────────────────────────────────────────

export const breakpoints = {
  mobile:  375,
  mobileLg: 414,
  tablet:  768,
  desktop: 1280,
  wide:    1920,
} as const;

// ─── Z-index scale ────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  10,
  dropdown: 100,
  sticky:  200,
  modal:   500,
  overlay: 600,
  toast:   700,
  skipLink: 9999,
} as const;

// ─── Status helpers ───────────────────────────────────────────────────────────

export type StatusLevel = "nominal" | "elevated" | "warning" | "critical" | "unknown";
export type RiskLevel   = "low" | "moderate" | "high" | "critical";
export type AlertLevel  = "green" | "yellow" | "orange" | "red";

export const statusColor: Record<StatusLevel, string> = {
  nominal:  colors.green,
  elevated: colors.yellow,
  warning:  colors.orange,
  critical: colors.red,
  unknown:  colors.textFaint,
};

export const riskColor: Record<RiskLevel, string> = {
  low:      colors.green,
  moderate: colors.yellow,
  high:     colors.orange,
  critical: colors.red,
};

export const alertColor: Record<AlertLevel, string> = {
  green:  colors.green,
  yellow: colors.yellow,
  orange: colors.orange,
  red:    colors.red,
};
