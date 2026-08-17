"use client";

/**
 * AnomalyAlert
 *
 * Red-bordered card surfacing a Granite-generated anomaly explanation.
 * Shown only when isAnomalous === true and confidence > 0.
 *
 * Props:
 *   anomaly — AnomalyResult from /lib/ai/anomaly
 */

import { useState } from "react";
import type { AnomalyResult } from "@/lib/types";

interface AnomalyAlertProps {
  anomaly: AnomalyResult;
}

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.8 ? "#f87171" : c >= 0.5 ? "#fb923c" : "#e6c974";

export default function AnomalyAlert({ anomaly }: AnomalyAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (!anomaly.isAnomalous) return null;

  const cc      = CONFIDENCE_COLOR(anomaly.confidence);
  const confPct = `${(anomaly.confidence * 100).toFixed(0)}%`;

  const metricLabel = anomaly.metricKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className="rounded-xl border-2 bg-[#24231f] overflow-hidden"
      style={{ borderColor: cc + "66" }}
      role="alert"
      aria-live="polite"
    >
      {/* Alert banner */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: cc + "18" }}
      >
        <div className="flex items-center gap-2">
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: cc }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: cc }}
            />
          </span>
          <p className="text-sm font-semibold" style={{ color: cc }}>
            Anomaly detected — {metricLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Confidence pill */}
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cc + "22", color: cc }}
          >
            {confPct} confidence
          </span>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-[#96938d] hover:text-[#e8e7e5] transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? "▲ Less" : "▼ Details"}
          </button>
        </div>
      </div>

      {/* Collapsed: one-liner explanation */}
      <div className="px-4 py-3">
        <p className="text-xs text-[#e8e7e5] leading-relaxed">
          {anomaly.explanation}
        </p>
      </div>

      {/* Expanded: impact + recommended action */}
      {expanded && (
        <div className="border-t border-[#3a3830] px-4 py-3 space-y-3">
          {anomaly.impact && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#96938d] mb-1">
                Potential Impact
              </p>
              <p className="text-xs text-[#e8e7e5] leading-relaxed">{anomaly.impact}</p>
            </div>
          )}

          {anomaly.recommendedAction && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#96938d] mb-1">
                Recommended Action
              </p>
              <p className="text-xs text-[#e8e7e5] leading-relaxed">
                {anomaly.recommendedAction}
              </p>
            </div>
          )}

          <p className="text-[10px] text-[#605943]">
            Detected {new Date(anomaly.detectedAt).toLocaleString()} ·{" "}
            Powered by IBM Granite
          </p>
        </div>
      )}
    </div>
  );
}
