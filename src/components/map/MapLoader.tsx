"use client";

/**
 * MapLoader — Client Component that owns the `next/dynamic` + `ssr:false`
 * call. Kept here because Next.js 16 prohibits `ssr:false` in Server
 * Components.
 */
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MapInner = dynamic(() => import("@/components/map/MapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center w-full h-full"
      style={{ background: "#000000" }}
    >
      <div className="flex items-center gap-3 rounded-xl border border-[#1e3a5f] bg-[#050a14] px-5 py-4">
        <Loader2
          size={20}
          className="animate-spin text-[#1e3a5f]"
          aria-hidden="true"
        />
        <span className="text-sm text-[#7dd3fc]">Initialising map…</span>
      </div>
    </div>
  ),
});

export default function MapLoader() {
  return <MapInner />;
}
