"use client";

import { Popup } from "react-leaflet";
import { ExternalLink } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { MapEvent, MapEventCategory } from "@/lib/types";

type BadgeVariant = "red" | "blue" | "purple" | "green" | "gold" | "muted";

const CATEGORY_BADGE: Record<MapEventCategory, { variant: BadgeVariant; label: string }> = {
  incident:    { variant: "red",    label: "Incident"    },
  weather:     { variant: "blue",   label: "Weather"     },
  space:       { variant: "purple", label: "Space"       },
  observatory: { variant: "green",  label: "Observatory" },
  comet:       { variant: "gold",   label: "Comet"       },
};

const SEVERITY_COLORS: Record<MapEvent["severity"], string> = {
  low:      "#1e3a5f",
  medium:   "#f97316",
  high:     "#ef4444",
  critical: "#dc2626",
};

interface MarkerPopupProps {
  event: MapEvent;
}

export default function MarkerPopup({ event }: MarkerPopupProps) {
  const meta = CATEGORY_BADGE[event.category];

  return (
    <Popup
      minWidth={220}
      maxWidth={280}
      className="eos-popup"
    >
      {/*
       * Tailwind classes won't apply reliably inside Leaflet's popup DOM portal.
       * Use inline styles for popup internals to guarantee correct rendering.
       */}
      <div
        style={{
          background: "#050a14",
          border: "1px solid #1e3a5f",
          borderRadius: 10,
          padding: "12px 14px",
          fontFamily: "inherit",
          minWidth: 200,
        }}
      >
        {/* Badge + severity dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: SEVERITY_COLORS[event.severity],
              flexShrink: 0,
            }}
            title={`Severity: ${event.severity}`}
          />
          <span style={{ fontSize: 10, color: "#1e3a5f", marginLeft: "auto" }}>
            {event.severity.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <p
          style={{
            margin: "0 0 6px 0",
            fontSize: 13,
            fontWeight: 600,
            color: "#e0f2fe",
            lineHeight: 1.4,
          }}
        >
          {event.title}
        </p>

        {/* Description */}
        <p
          style={{
            margin: "0 0 10px 0",
            fontSize: 11,
            color: "#7dd3fc",
            lineHeight: 1.5,
          }}
        >
          {event.description}
        </p>

        {/* Coordinates */}
        <p style={{ margin: "0 0 10px 0", fontSize: 10, color: "#1e3a5f" }}>
          {event.lat.toFixed(3)}°, {event.lng.toFixed(3)}°
        </p>

        {/* View details button */}
        {event.link ? (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              background: "#38bdf818",
              border: "1px solid #38bdf850",
              borderRadius: 6,
              color: "#38bdf8",
              fontSize: 11,
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <ExternalLink size={11} />
            View Details
          </a>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              background: "#111f36",
              border: "1px solid #1e3a5f",
              borderRadius: 6,
              color: "#1e3a5f",
              fontSize: 11,
            }}
          >
            No details link
          </span>
        )}
      </div>
    </Popup>
  );
}
