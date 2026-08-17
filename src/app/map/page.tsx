/**
 * /src/app/map/page.tsx — Server Component (metadata only).
 * The Leaflet map is loaded via MapLoader (client boundary with ssr:false).
 */
import type { Metadata } from "next";
import MapLoader from "@/components/map/MapLoader";

export const metadata: Metadata = {
  title: "Earth Map",
  description:
    "Interactive world map showing real-time space events, weather alerts, and observatory locations.",
};

export default function MapPage() {
  return (
    /*
     * Bleed to full width/height by negating AppShell's default padding.
     * calc(100vh - 56px) subtracts the h-14 header.
     */
    <div
      className="-mx-4 -my-6 lg:-mx-8 overflow-hidden"
      style={{ height: "calc(100vh - 56px)" }}
    >
      <MapLoader />
    </div>
  );
}
