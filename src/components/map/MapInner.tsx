"use client";

/*
 * MapInner.tsx — The actual Leaflet map.
 *
 * This component is ONLY rendered via next/dynamic with { ssr: false } from
 * map/page.tsx. All Leaflet-specific imports live here so they never touch
 * the Node.js/SSR bundle.
 */

import { useEffect, useRef, useState, useCallback } from "react";
// Leaflet CSS — must be imported inside the client component to avoid
// polluting global styles with Leaflet's absolute-positioned elements.
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

import {
  MapContainer,
  TileLayer as ReactTileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";

import type { MapEvent } from "@/lib/types";
import { createEventIcon, injectMarkerStyles } from "@/components/map/EventMarker";
import MarkerPopup from "@/components/map/MarkerPopup";
import MapSidebar from "@/components/map/MapSidebar";
import MapSearchBar from "@/components/map/MapSearchBar";
import MapControls, { type TileLayer } from "@/components/map/MapControls";

/* ── Tile URLs ───────────────────────────────────────────────────────────── */
const TILES: Record<TileLayer, { url: string; attribution: string }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, USGS, AeroGRID, IGN and the GIS User Community",
  },
};

/* ── FlyTo controller: reads commands from parent ────────────────────────── */
interface FlyToCommand { lat: number; lng: number; zoom?: number; ts: number }

function FlyToController({ command }: { command: FlyToCommand | null }) {
  const map = useMap();
  const lastTs = useRef<number>(0);

  useEffect(() => {
    if (!command || command.ts === lastTs.current) return;
    lastTs.current = command.ts;
    map.flyTo([command.lat, command.lng], command.zoom ?? 6, { duration: 1.5 });
  }, [command, map]);

  return null;
}

/* ── Main component ──────────────────────────────────────────────────────── */
interface MapInnerProps {
  /** Used only to detect parent height changes — map fills 100% of container */
  heightClass?: string;
}

export default function MapInner(_props: MapInnerProps) {
  const [tileLayer, setTileLayer] = useState<TileLayer>("dark");
  const [flyCommand, setFlyCommand] = useState<FlyToCommand | null>(null);

  /* Inject pulse keyframes once */
  useEffect(() => {
    injectMarkerStyles();
  }, []);

  /* ── Fetch events ───────────────────────────────────────────────────── */
  const { data, isLoading, isError } = useQuery({
    queryKey: ["map-events"],
    queryFn: async () => {
      const res = await fetch("/api/map");
      if (!res.ok) throw new Error("Map events fetch failed");
      return res.json() as Promise<{ events: MapEvent[] }>;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });

  const events = data?.events ?? [];

  /* ── FlyTo handler (passed to sidebar + search bar) ──────────────────── */
  const flyTo = useCallback((lat: number, lng: number, zoom?: number) => {
    setFlyCommand({ lat, lng, zoom, ts: Date.now() });
  }, []);

  /* ── Override Leaflet cluster icon to match theme ────────────────────── */
  const createClusterIcon = useCallback((cluster: { getChildCount: () => number }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div style="
        width:36px;height:36px;border-radius:50%;
        background:rgba(131,105,206,0.25);
        border:2px solid #8369ce;
        display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:700;color:#e8e7e5;
      ">${count}</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, []);

  const tile = TILES[tileLayer];

  return (
    <div className="relative w-full h-full flex">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <MapSidebar events={events} onFlyTo={flyTo} />

      {/* ── Map area ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* Toolbar strip above map */}
        <div
          className="absolute top-0 left-0 right-0 z-[999] flex items-center gap-3 px-4 py-2.5"
          style={{
            background: "rgba(16,15,14,0.85)",
            borderBottom: "1px solid rgba(96,89,67,0.4)",
            backdropFilter: "blur(8px)",
          }}
        >
          <MapSearchBar onFlyTo={flyTo} />
          <div className="ml-auto shrink-0">
            <MapControls
              tileLayer={tileLayer}
              onToggle={() => setTileLayer((t) => (t === "dark" ? "satellite" : "dark"))}
            />
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-[998] flex items-center justify-center bg-[#100f0e]/60">
            <div className="flex items-center gap-3 rounded-xl border border-[#605943] bg-[#24231f] px-5 py-3">
              <Loader2 size={18} className="animate-spin text-[#605943]" aria-hidden="true" />
              <span className="text-sm text-[#96938d]">Loading map events…</span>
            </div>
          </div>
        )}

        {/* Error toast */}
        {isError && (
          <div className="absolute top-16 right-4 z-[998] flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            <AlertCircle size={16} aria-hidden="true" />
            Failed to load events
          </div>
        )}

        {/* The actual Leaflet map — fills area below toolbar */}
        <div className="absolute inset-0 top-[46px]">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl={true}
          >
            <ReactTileLayer
              url={tile.url}
              attribution={tile.attribution}
              subdomains={tileLayer === "dark" ? "abcd" : undefined}
              // Satellite tiles use numeric path, no subdomains
              maxZoom={tileLayer === "satellite" ? 18 : 20}
            />

            <FlyToController command={flyCommand} />

            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterIcon}
              maxClusterRadius={60}
              showCoverageOnHover={false}
              spiderfyOnMaxZoom={true}
            >
              {events.map((ev) => (
                <Marker
                  key={ev.id}
                  position={[ev.lat, ev.lng]}
                  icon={createEventIcon(ev.category, ev.severity)}
                >
                  <MarkerPopup event={ev} />
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
