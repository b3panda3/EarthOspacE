"use client";

import { Layers, Globe } from "lucide-react";

export type TileLayer = "dark" | "satellite";

interface MapControlsProps {
  tileLayer: TileLayer;
  onToggle: () => void;
}

export default function MapControls({ tileLayer, onToggle }: MapControlsProps) {
  const isDark = tileLayer === "dark";

  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "satellite" : "dark"} map`}
      title={`Switch to ${isDark ? "satellite" : "dark map"}`}
      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
      style={{
        background: "rgba(8,16,32,0.96)",
        borderColor: isDark ? "#1e3a5f" : "#38bdf8",
        color: isDark ? "#7dd3fc" : "#38bdf8",
      }}
    >
      {isDark ? (
        <>
          <Layers size={13} aria-hidden="true" />
          Satellite
        </>
      ) : (
        <>
          <Globe size={13} aria-hidden="true" />
          Dark Map
        </>
      )}
    </button>
  );
}
