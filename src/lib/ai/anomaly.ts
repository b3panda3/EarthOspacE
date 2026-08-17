/**
 * /src/lib/ai/anomaly.ts
 *
 * Rolling-window anomaly detection for telemetry data.
 *
 * Algorithm (statistical pre-filter):
 *   1. Collect the last N values (default window=20) for a named metric.
 *   2. Compute mean + stddev.
 *   3. If the latest value deviates more than `zThreshold` σ from the mean,
 *      flag as a candidate anomaly and call Granite for a natural-language
 *      explanation.
 *   4. Results are cached for TTL.WEATHER (5 min) to avoid hammering the LLM
 *      when the API route is polled frequently.
 *
 * Exported:
 *   detectAnomalies(points, opts) → AnomalyResult[]
 *   detectSingleAnomaly(key, value, history) → AnomalyResult | null
 */

import { generateText, GRANITE_INSTRUCT_MODEL } from "@/lib/ai/watsonx";
import { withCache, TTL } from "@/lib/api/cache";
import type { AnomalyResult } from "@/lib/types";

// ─── Options ─────────────────────────────────────────────────────────────────

export interface AnomalyDetectionOpts {
  /** How many historical values to keep in the rolling window. Default 20. */
  windowSize?: number;
  /** Z-score threshold above which a point is flagged. Default 2.5 */
  zThreshold?: number;
  /** Whether to call Granite for an explanation (skipped in tests). Default true */
  callLLM?: boolean;
}

// ─── Named metric series type ─────────────────────────────────────────────────

export interface MetricSeries {
  /** Identifier e.g. "solar_wind_speed" */
  key: string;
  /** Human-readable name e.g. "Solar Wind Speed (km/s)" */
  label: string;
  /** Ordered oldest→newest */
  values: number[];
  /** Current / latest value — the candidate being tested */
  current: number;
  /** Physical unit for display */
  unit: string;
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stddev(xs: number[], mu?: number): number {
  if (xs.length < 2) return 0;
  const m = mu ?? mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function zScore(value: number, mu: number, sigma: number): number {
  if (sigma === 0) return 0;
  return Math.abs(value - mu) / sigma;
}

// ─── Granite explanation prompt ───────────────────────────────────────────────

function buildExplanationPrompt(
  key: string,
  label: string,
  unit: string,
  current: number,
  mu: number,
  sigma: number,
  z: number
): string {
  const dir = current > mu ? "elevated" : "depressed";
  return (
    `You are a space-weather scientist. A real-time sensor has detected an anomalous reading.\n\n` +
    `Metric: ${label}\n` +
    `Current value: ${current.toFixed(2)} ${unit}\n` +
    `Baseline mean (20-point rolling): ${mu.toFixed(2)} ${unit}\n` +
    `Std deviation: ${sigma.toFixed(2)} ${unit}\n` +
    `Z-score: ${z.toFixed(2)} (${dir})\n\n` +
    `In 2-3 sentences each, respond with a JSON object with these keys:\n` +
    `  "explanation" – what this anomaly likely means in plain language\n` +
    `  "impact"      – potential effects on Earth systems or missions\n` +
    `  "recommendedAction" – what operators should do\n\n` +
    `Respond ONLY with valid JSON. No markdown fences.`
  );
}

// ─── Core: detect a single metric ────────────────────────────────────────────

export async function detectSingleAnomaly(
  series: MetricSeries,
  opts: AnomalyDetectionOpts = {}
): Promise<AnomalyResult | null> {
  const { windowSize = 20, zThreshold = 2.5, callLLM = true } = opts;

  const window = series.values.slice(-windowSize);
  if (window.length < 5) return null; // not enough history

  const mu     = mean(window);
  const sigma  = stddev(window, mu);
  const z      = zScore(series.current, mu, sigma);

  if (z < zThreshold) return null;

  const cacheKey = `anomaly:${series.key}:${series.current.toFixed(3)}`;

  return withCache(cacheKey, async () => {
    const confidence = Math.min(1, (z - zThreshold) / zThreshold + 0.5);
    const detectedAt = new Date().toISOString();

    let explanation = `${series.label} is ${(z).toFixed(1)}σ from its 20-point rolling mean.`;
    let impact = "Monitor closely for continued deviation.";
    let recommendedAction = "Review upstream sensor data and cross-reference with other metrics.";

    if (callLLM) {
      try {
        const prompt = buildExplanationPrompt(
          series.key, series.label, series.unit,
          series.current, mu, sigma, z
        );
        const raw = await generateText(prompt, {
          modelId:      GRANITE_INSTRUCT_MODEL,
          maxNewTokens: 350,
          temperature:  0.4,
        });

        // Strip accidental markdown fences
        const cleaned = raw
          .replace(/^```(?:json)?\s*/im, "")
          .replace(/\s*```\s*$/im, "")
          .trim();

        const parsed = JSON.parse(cleaned) as {
          explanation?: string;
          impact?: string;
          recommendedAction?: string;
        };

        if (parsed.explanation)       explanation       = parsed.explanation;
        if (parsed.impact)            impact            = parsed.impact;
        if (parsed.recommendedAction) recommendedAction = parsed.recommendedAction;
      } catch {
        // LLM failure is non-fatal — keep the statistical defaults
      }
    }

    return {
      metricKey:         series.key,
      isAnomalous:       true,
      confidence,
      explanation,
      impact,
      recommendedAction,
      detectedAt,
    } satisfies AnomalyResult;
  }, TTL.WEATHER);
}

// ─── Batch: detect anomalies across all provided series ──────────────────────

export async function detectAnomalies(
  allSeries: MetricSeries[],
  opts: AnomalyDetectionOpts = {}
): Promise<AnomalyResult[]> {
  const results = await Promise.all(
    allSeries.map((s) => detectSingleAnomaly(s, opts))
  );
  return results.filter((r): r is AnomalyResult => r !== null);
}
