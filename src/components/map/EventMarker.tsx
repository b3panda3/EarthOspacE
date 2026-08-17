// EventMarker.tsx — custom SVG DivIcon markers for each event category.
// Must be a pure utility file (no JSX) so it can be imported from client components.
// Leaflet DivIcon creation happens at runtime (browser only).

import type { MapEventCategory } from "@/lib/types";

/* ── Theme colours per category ─────────────────────────────────────────── */
export const CATEGORY_COLORS: Record<MapEventCategory, string> = {
  incident:    "#ef4444", // red-500
  weather:     "#38bdf8", // sky-400
  space:       "#8369ce", // purple accent
  observatory: "#34d399", // emerald-400
  comet:       "#f97316", // orange-500
};

/* ── SVG paths per category ──────────────────────────────────────────────── */
const ICON_PATHS: Record<MapEventCategory, string> = {
  // Flame
  incident: `<path d="M12 2C8 7 6 9 6 12a6 6 0 0012 0c0-3-2-5-6-10zm0 16a4 4 0 01-4-4c0-2 1.5-3.5 4-7 2.5 3.5 4 5 4 7a4 4 0 01-4 4z" fill="currentColor"/>`,
  // Cloud + lightning
  weather: `<path d="M16 14H6a4 4 0 010-8h.2A5 5 0 0116 9h0a3 3 0 010 5zm-5 2l-2 4h2l-1 3 5-6h-3l1-1z" fill="currentColor"/>`,
  // Star / satellite dish
  space: `<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="currentColor"/>`,
  // Telescope
  observatory: `<path d="M3 21l7-7m0 0l3-8 6 2-3 8m-6 0l3 3M9 7l2-5 2 1-3 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  // Comet tail
  comet: `<circle cx="15" cy="9" r="3" fill="currentColor"/><path d="M12 12L4 20M10 14L3 18M14 10L6 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
};

/* ── Build the DivIcon HTML string ───────────────────────────────────────── */
function buildIconHtml(category: MapEventCategory, pulse = false): string {
  const color = CATEGORY_COLORS[category];
  const svg = ICON_PATHS[category];

  const pulseRing = pulse
    ? `<span style="
        position:absolute;inset:-4px;border-radius:50%;
        border:2px solid ${color};
        animation:markerPulse 1.8s ease-out infinite;
        opacity:0.6;
      "></span>`
    : "";

  return `
    <span style="
      position:relative;display:flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:50%;
      background:${color}22;
      border:2px solid ${color};
      box-shadow:0 0 8px ${color}55;
    ">
      ${pulseRing}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           width="16" height="16" color="${color}"
           style="flex-shrink:0;">
        ${svg}
      </svg>
    </span>
  `.trim();
}

/* ── Leaflet DivIcon factory ─────────────────────────────────────────────── */
export function createEventIcon(
  category: MapEventCategory,
  severity?: string
): L.DivIcon {
  // Dynamic import guard — only runs in browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");

  const pulse = severity === "high" || severity === "critical";

  return L.divIcon({
    html: buildIconHtml(category, pulse),
    className: "", // prevent Leaflet's default white box
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/* ── CSS keyframes injected once ─────────────────────────────────────────── */
export function injectMarkerStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("eos-marker-styles")) return;
  const style = document.createElement("style");
  style.id = "eos-marker-styles";
  style.textContent = `
    @keyframes markerPulse {
      0%   { transform: scale(1);   opacity: 0.6; }
      50%  { transform: scale(1.5); opacity: 0.2; }
      100% { transform: scale(2);   opacity: 0;   }
    }
  `;
  document.head.appendChild(style);
}
