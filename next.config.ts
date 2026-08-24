import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@ibm-cloud/watsonx-ai",
    "ibm-cloud-sdk-core",
  ],

  // ── Turbopack root (silences multi-lockfile warning on developer machines) ─
  turbopack: {
    root: path.resolve(__dirname),
  },

  // ── Image optimisation ──────────────────────────────────────────────────
  // Next.js 16 serves optimised WebP/AVIF by default via <Image>.
  // Explicit config below extends the allowed remote domains and sets
  // sensible quality/format defaults.
  images: {
    // Prefer AVIF (smallest), fallback to WebP, then original
    formats: ["image/avif", "image/webp"],
    // Remote image domains used by the app (NASA, ESA, APOD CDN)
    remotePatterns: [
      { protocol: "https", hostname: "apod.nasa.gov"                       },
      { protocol: "https", hostname: "www.nasa.gov"                        },
      { protocol: "https", hostname: "earthobservatory.nasa.gov"           },
      { protocol: "https", hostname: "images.nasa.gov"                     },
      { protocol: "https", hostname: "www.esa.int"                         },
      { protocol: "https", hostname: "cdn.esa.int"                         },
      { protocol: "https", hostname: "spaceflightnow.com"                  },
      { protocol: "https", hostname: "www.isro.gov.in"                     },
      { protocol: "https", hostname: "www.jaxa.jp"                         },
      { protocol: "https", hostname: "www.asc-csa.gc.ca"                   },
      { protocol: "https", hostname: "**" },  // Catch-all for any RSS feed images
    ],
  },
};

export default nextConfig;
