/**
 * /src/lib/api/sources/copernicus.ts
 *
 * Copernicus Open Access Hub — Earth observation metadata adapter.
 *
 * The Copernicus Data Space Ecosystem (CDSE) provides a STAC-compatible
 * catalogue endpoint. We query for the latest Sentinel-2 and Sentinel-5P
 * products as metadata (no large file downloads).
 *
 * Endpoint: https://catalogue.dataspace.copernicus.eu/stac/collections
 *
 * When the catalogue is unavailable (or no credentials are configured)
 * the adapter returns realistic demo metadata so the UI always has data.
 */

import { withCache, TTL } from "@/lib/api/cache";
import type { TelemetryData, TelemetrySource } from "@/lib/types";

const CDSE_BASE = "https://catalogue.dataspace.copernicus.eu/stac";

export interface CopernicusProduct {
  id: string;
  collection: string;
  title: string;
  datetime: string;
  cloudCoverPercent: number;
  bbox: [number, number, number, number]; // [west, south, east, north]
  platform: string;
  instrument: string;
}

const DEMO_PRODUCTS: CopernicusProduct[] = [
  { id: "S2A_MSIL2A_20240815",  collection: "SENTINEL-2",   title: "Sentinel-2A L2A 15-Aug-2024 Europe",       datetime: new Date(Date.now() - 1 * 3600000).toISOString(),   cloudCoverPercent: 12.4, bbox: [-10, 36, 30, 65], platform: "Sentinel-2A", instrument: "MSI"   },
  { id: "S5P_NRTI_L2__NO2_2024", collection: "SENTINEL-5P",  title: "Sentinel-5P NRTI NO2 — Global",            datetime: new Date(Date.now() - 3 * 3600000).toISOString(),   cloudCoverPercent: 0,    bbox: [-180, -90, 180, 90], platform: "Sentinel-5P", instrument: "TROPOMI" },
  { id: "S1A_IW_SLC_20240814",  collection: "SENTINEL-1",   title: "Sentinel-1A IW SLC 14-Aug-2024 Americas",  datetime: new Date(Date.now() - 6 * 3600000).toISOString(),   cloudCoverPercent: 0,    bbox: [-90, 25, -50, 55], platform: "Sentinel-1A", instrument: "SAR-C"  },
  { id: "S3A_OL_2_LFR_20240815", collection: "SENTINEL-3",  title: "Sentinel-3A OLCI Full Resolution — Ocean", datetime: new Date(Date.now() - 8 * 3600000).toISOString(),   cloudCoverPercent: 8.1,  bbox: [-180, -90, 180, 90], platform: "Sentinel-3A", instrument: "OLCI"  },
];

export async function fetchCopernicusProducts(): Promise<{
  products: CopernicusProduct[];
  telemetry: TelemetryData[];
}> {
  return withCache("copernicus-products", async () => {
    try {
      const url = `${CDSE_BASE}/collections/SENTINEL-2/items?limit=6&sortby=-datetime`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8_000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/geo+json" },
      });
      clearTimeout(t);

      if (!res.ok) throw new Error(`CDSE HTTP ${res.status}`);

      interface StacFeature {
        id: string;
        bbox?: number[];
        properties: {
          datetime?: string;
          title?: string;
          "eo:cloud_cover"?: number;
          platform?: string;
          instruments?: string[];
          collection?: string;
        };
      }
      interface StacCollection { features: StacFeature[] }

      const data = (await res.json()) as StacCollection;

      const products: CopernicusProduct[] = (data.features ?? []).slice(0, 6).map(
        (f): CopernicusProduct => ({
          id:                  f.id,
          collection:          f.properties.collection ?? "SENTINEL-2",
          title:               f.properties.title ?? f.id,
          datetime:            f.properties.datetime ?? new Date().toISOString(),
          cloudCoverPercent:   f.properties["eo:cloud_cover"] ?? 0,
          bbox:                (f.bbox as [number, number, number, number]) ?? [-180, -90, 180, 90],
          platform:            f.properties.platform ?? "Sentinel",
          instrument:          f.properties.instruments?.[0] ?? "MSI",
        })
      );

      const telemetry: TelemetryData[] = products.map((p): TelemetryData => ({
        id:        `copernicus-${p.id}`,
        source:    "Copernicus",
        type:      "earth_observation",
        timestamp: p.datetime,
        values:    { cloudCoverPercent: p.cloudCoverPercent, instrument: p.instrument },
        unit:      "%",
        status:    "nominal",
        label:     p.title,
        lat:       (p.bbox[1] + p.bbox[3]) / 2,
        lng:       (p.bbox[0] + p.bbox[2]) / 2,
      }));

      return { products, telemetry };
    } catch (err) {
      console.warn("[copernicus] fetch failed, using demo:", (err as Error).message);
      return {
        products: DEMO_PRODUCTS,
        telemetry: DEMO_PRODUCTS.map((p): TelemetryData => ({
          id:        `copernicus-${p.id}`,
          source:    "Demo" as TelemetrySource,
          type:      "earth_observation",
          timestamp: p.datetime,
          values:    { cloudCoverPercent: p.cloudCoverPercent, instrument: p.instrument },
          unit:      "%",
          status:    "nominal",
          label:     p.title,
          lat:       (p.bbox[1] + p.bbox[3]) / 2,
          lng:       (p.bbox[0] + p.bbox[2]) / 2,
        })),
      };
    }
  }, TTL.OBSERVATORY /* 5 min */);
}
