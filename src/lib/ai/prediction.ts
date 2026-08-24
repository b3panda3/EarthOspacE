/**
 * /src/lib/ai/prediction.ts
 *
 * Space weather prediction engine — uses IBM Granite to extrapolate
 * 3-day forecasts from current telemetry and rolling historical trends.
 *
 * Exports:
 *   generatePredictions(currentData, historicalData, timeframe)
 *     → SpaceWeatherForecast
 *   generateQuickAssessment(currentData)
 *     → QuickAssessment
 *   generateMissionAssessment(params, forecast)
 *     → MissionAssessmentResult
 */

import { generateText, generateStructured, extractFirstJson, GRANITE_INSTRUCT_MODEL, GRANITE_CHAT_MODEL } from "@/lib/ai/watsonx";
import { withCache, TTL } from "@/lib/api/cache";
import type {
  SpaceWeatherForecast,
  MetricForecast,
  QuickAssessment,
  MissionParameters,
  MissionAssessmentResult,
  RiskFactor,
  ActivityGuidance,
  AlternativeWindow,
  ForecastConfidence,
  RiskLevel,
} from "@/lib/types";

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CurrentConditions {
  kpIndex: number;
  solarWindSpeedKms: number;
  solarWindDensity: number;
  activeFlares: number;
  radiationBeltStatus: "quiet" | "active" | "storm";
  neoHazardousCount: number;
}

export interface HistoricalPoint {
  timestamp: string;
  kpIndex: number;
  solarWindSpeedKms: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function conditionsToText(c: CurrentConditions): string {
  return [
    `Kp index: ${c.kpIndex.toFixed(1)}`,
    `Solar wind speed: ${c.solarWindSpeedKms.toFixed(0)} km/s`,
    `Solar wind density: ${c.solarWindDensity.toFixed(1)} n/cm³`,
    `Active solar flares: ${c.activeFlares}`,
    `Radiation belt: ${c.radiationBeltStatus}`,
    `Potentially hazardous NEOs: ${c.neoHazardousCount}`,
  ].join("; ");
}

function historicalToText(pts: HistoricalPoint[]): string {
  if (pts.length === 0) return "No historical data available.";
  const rows = pts.slice(-7).map((p, i) => {
    const d = new Date(p.timestamp).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    return `T-${pts.slice(-7).length - i}d (${d}): Kp=${p.kpIndex.toFixed(1)}, SW=${p.solarWindSpeedKms.toFixed(0)} km/s`;
  });
  return rows.join("; ");
}

function alertLevelFromMetrics(metrics: MetricForecast[]): SpaceWeatherForecast["alertLevel"] {
  const maxKp = Math.max(...metrics.filter((m) => m.metric === "kp_index").map((m) => m.predictedMax), 0);
  const maxSW = Math.max(...metrics.filter((m) => m.metric === "solar_wind_speed").map((m) => m.predictedMax), 0);
  if (maxKp >= 7 || maxSW > 800) return "red";
  if (maxKp >= 5 || maxSW > 600) return "orange";
  if (maxKp >= 3 || maxSW > 450) return "yellow";
  return "green";
}

// ─── generatePredictions ─────────────────────────────────────────────────────

/**
 * Ask Granite to forecast space weather for the next `timeframeDays` days.
 * Returns a validated SpaceWeatherForecast. Cached for 30 minutes.
 */
export async function generatePredictions(
  currentData: CurrentConditions,
  historicalData: HistoricalPoint[],
  timeframeDays = 3
): Promise<SpaceWeatherForecast> {
  const cacheKey = `forecast:${timeframeDays}:${Math.round(currentData.kpIndex * 10)}:${Math.round(currentData.solarWindSpeedKms)}`;

  return withCache(cacheKey, async () => {
    const currentText    = conditionsToText(currentData);
    const historicalText = historicalToText(historicalData);

    const prompt =
      `You are a space weather forecaster with expertise in solar physics and geomagnetic activity.\n\n` +
      `Current conditions: ${currentText}\n` +
      `7-day historical trend: ${historicalText}\n\n` +
      `Provide a forecast for the next ${timeframeDays} days. For each day and each of these metrics:\n` +
      `  - kp_index (Kp geomagnetic index, 0-9 scale)\n` +
      `  - solar_wind_speed (km/s, typical range 300-800)\n` +
      `  - radiation_level (relative scale 1-10)\n\n` +
      `For every metric+day combination, provide:\n` +
      `  "metric": metric name,\n` +
      `  "label": human-readable label,\n` +
      `  "unit": physical unit,\n` +
      `  "predictedMin": minimum expected value (number),\n` +
      `  "predictedMax": maximum expected value (number),\n` +
      `  "confidence": one of "high", "medium", "low",\n` +
      `  "reasoning": one sentence explaining the forecast,\n` +
      `  "day": day number 1, 2, or 3\n\n` +
      `Also provide:\n` +
      `  "overallOutlook": 1-2 sentence plain English summary\n\n` +
      `Respond ONLY as a JSON object:\n` +
      `{ "metrics": [...], "overallOutlook": "..." }\n` +
      `No markdown fences. No extra text.`;

    const defaultForecast = buildDemoForecast(currentData, timeframeDays);

    try {
      const raw = await generateText(prompt, {
        modelId:      GRANITE_INSTRUCT_MODEL,
        maxNewTokens: 900,
        temperature:  0.35,
        topP:         0.85,
      });

      const cleaned = extractFirstJson(raw);

      const parsed = JSON.parse(cleaned) as {
        metrics?: unknown[];
        overallOutlook?: string;
      };

      const metrics = (parsed.metrics ?? []) as MetricForecast[];

      if (!Array.isArray(metrics) || metrics.length === 0) {
        return defaultForecast;
      }

      // Validate / normalise each metric
      const validated: MetricForecast[] = metrics
        .filter((m) => m && typeof m === "object" && "metric" in m)
        .map((m) => ({
          metric:       String(m.metric ?? ""),
          label:        String(m.label ?? m.metric ?? ""),
          unit:         String(m.unit ?? ""),
          predictedMin: parseFloat(String(m.predictedMin ?? 0)),
          predictedMax: parseFloat(String(m.predictedMax ?? 0)),
          confidence:   (["high", "medium", "low"].includes(m.confidence as string)
            ? m.confidence
            : "medium") as ForecastConfidence,
          reasoning:    String(m.reasoning ?? ""),
          day:          parseInt(String(m.day ?? 1)),
        }));

      return {
        generatedAt:         new Date().toISOString(),
        forecastHorizonDays: timeframeDays,
        metrics:             validated,
        overallOutlook:      String(parsed.overallOutlook ?? defaultForecast.overallOutlook),
        alertLevel:          alertLevelFromMetrics(validated),
      };
    } catch (err) {
      console.warn("[prediction] generatePredictions LLM failed, using demo:", (err as Error).message);
      return defaultForecast;
    }
  }, TTL.BRIEFING /* 30 min */);
}

// ─── Demo forecast fallback ───────────────────────────────────────────────────

function buildDemoForecast(
  current: CurrentConditions,
  days: number
): SpaceWeatherForecast {
  const metrics: MetricForecast[] = [];
  for (let d = 1; d <= days; d++) {
    const bump = (d - 1) * 0.15;
    metrics.push(
      {
        metric: "kp_index", label: "Kp Index", unit: "Kp",
        predictedMin: Math.max(0, current.kpIndex - 0.5 + bump),
        predictedMax: Math.min(9, current.kpIndex + 1.2 + bump),
        confidence: "medium",
        reasoning: "Slight upward trend based on recent solar activity patterns.",
        day: d,
      },
      {
        metric: "solar_wind_speed", label: "Solar Wind Speed", unit: "km/s",
        predictedMin: Math.max(300, current.solarWindSpeedKms - 30 + d * 10),
        predictedMax: Math.min(900, current.solarWindSpeedKms + 50 + d * 20),
        confidence: d === 1 ? "high" : d === 2 ? "medium" : "low",
        reasoning: "Extrapolated from current DSCOVR plasma stream measurements.",
        day: d,
      },
      {
        metric: "radiation_level", label: "Radiation Belt Activity", unit: "scale 1-10",
        predictedMin: 2 + d * 0.3,
        predictedMax: 4 + d * 0.6,
        confidence: "low",
        reasoning: "Estimated from Kp projection; inner belt generally stable.",
        day: d,
      }
    );
  }
  return {
    generatedAt:         new Date().toISOString(),
    forecastHorizonDays: days,
    metrics,
    overallOutlook:      "Space weather conditions are expected to remain relatively calm with gradual increases in solar activity.",
    alertLevel:          alertLevelFromMetrics(metrics),
  };
}

// ─── generateQuickAssessment ──────────────────────────────────────────────────

/**
 * Produces a 1-10 score + 1-line summary for the main dashboard widget.
 * Cached 30 minutes.
 */
export async function generateQuickAssessment(
  current: CurrentConditions
): Promise<QuickAssessment> {
  const cacheKey = `quick-assessment:${Math.round(current.kpIndex * 10)}:${Math.round(current.solarWindSpeedKms)}`;

  return withCache(cacheKey, async () => {
    // Heuristic score (used as fallback and as anchor for LLM)
    const kpScore   = Math.max(0, 10 - current.kpIndex * 1.1);
    const swScore   = Math.max(0, 10 - Math.max(0, current.solarWindSpeedKms - 300) / 60);
    const neoScore  = Math.max(0, 10 - current.neoHazardousCount * 1.5);
    const radScore  = current.radiationBeltStatus === "quiet" ? 9
                    : current.radiationBeltStatus === "active" ? 5 : 2;
    const heuristic = Math.round((kpScore + swScore + neoScore + radScore) / 4);

    const prompt =
      `You are a space operations safety advisor. Rate current conditions on a 1-10 scale (10 = perfectly safe, 1 = extremely hazardous).\n\n` +
      `Conditions: ${conditionsToText(current)}\n\n` +
      `Respond ONLY with a JSON object:\n` +
      `{ "score": <number 1-10>, "label": "<3 words>", "summary": "<one sentence, max 20 words, specific to conditions>", ` +
      `"solarActivity": <1-10>, "geomagneticActivity": <1-10>, "radiationBelt": <1-10>, "debrisRisk": <1-10> }\n` +
      `No markdown. No extra text.`;

    try {
      const raw = await generateText(prompt, {
        modelId:      GRANITE_INSTRUCT_MODEL,
        maxNewTokens: 150,
        temperature:  0.3,
      });

      const cleaned = extractFirstJson(raw);
      const parsed = JSON.parse(cleaned) as {
        score?: number;
        label?: string;
        summary?: string;
        solarActivity?: number;
        geomagneticActivity?: number;
        radiationBelt?: number;
        debrisRisk?: number;
      };

      return {
        score:       Math.min(10, Math.max(1, Math.round(Number(parsed.score ?? heuristic)))),
        label:       String(parsed.label ?? (heuristic >= 7 ? "Favorable" : heuristic >= 4 ? "Moderate" : "Unfavorable")),
        summary:     String(parsed.summary ?? `Kp ${current.kpIndex.toFixed(1)}, solar wind ${current.solarWindSpeedKms.toFixed(0)} km/s.`),
        generatedAt: new Date().toISOString(),
        breakdown: {
          solarActivity:       Math.min(10, Math.max(1, Math.round(Number(parsed.solarActivity ?? kpScore)))),
          geomagneticActivity: Math.min(10, Math.max(1, Math.round(Number(parsed.geomagneticActivity ?? swScore)))),
          radiationBelt:       Math.min(10, Math.max(1, Math.round(Number(parsed.radiationBelt ?? radScore)))),
          debrisRisk:         Math.min(10, Math.max(1, Math.round(Number(parsed.debrisRisk ?? 8)))),
        },
      };
    } catch {
      return {
        score:  heuristic,
        label:  heuristic >= 7 ? "Favorable" : heuristic >= 4 ? "Moderate" : "Unfavorable",
        summary: `Kp index ${current.kpIndex.toFixed(1)}, solar wind ${current.solarWindSpeedKms.toFixed(0)} km/s. Conditions are ${heuristic >= 7 ? "calm" : heuristic >= 4 ? "elevated" : "disturbed"}.`,
        generatedAt: new Date().toISOString(),
        breakdown: {
          solarActivity:       Math.round(kpScore),
          geomagneticActivity: Math.round(swScore),
          radiationBelt:       radScore,
          debrisRisk:         8,
        },
      };
    }
  }, TTL.BRIEFING);
}

// ─── generateMissionAssessment ────────────────────────────────────────────────

/**
 * Submit mission parameters to Granite for a GO/NO-GO/CONDITIONAL assessment
 * with risk factors, activity guidance, and alternative windows.
 */
export async function generateMissionAssessment(
  params: MissionParameters,
  forecast: SpaceWeatherForecast,
  current: CurrentConditions
): Promise<MissionAssessmentResult> {
  const activitiesStr = params.activities.join(", ");
  const startStr      = new Date(params.plannedStart).toUTCString();
  const endStr        = new Date(params.plannedEnd).toUTCString();

  const forecastSummary = forecast.metrics
    .filter((m) => m.day <= 2)
    .map((m) => `${m.label} day ${m.day}: ${m.predictedMin.toFixed(1)}-${m.predictedMax.toFixed(1)} ${m.unit} (${m.confidence} confidence)`)
    .join("; ");

  const prompt =
    `You are a mission planning advisor for space operations.\n\n` +
    `Mission: "${params.missionName}" (${params.missionType.replace(/_/g, " ")})\n` +
    `Planned window: ${startStr} to ${endStr} (${params.durationHours}h)\n` +
    `Activities: ${activitiesStr}\n` +
    `Notes: ${params.notes ?? "None"}\n\n` +
    `Current space conditions: ${conditionsToText(current)}\n` +
    `2-day forecast: ${forecastSummary}\n` +
    `Overall forecast alert level: ${forecast.alertLevel}\n\n` +
    `Provide a comprehensive mission assessment as a JSON object:\n` +
    `{\n` +
    `  "verdict": "GO" | "NO-GO" | "CONDITIONAL",\n` +
    `  "verdictReason": "<2 sentences>",\n` +
    `  "overallRiskScore": <1-10>,\n` +
    `  "riskFactors": [ { "id": "rf1", "title": "...", "description": "...", "severity": "critical"|"high"|"moderate"|"low", "mitigationSteps": ["...","..."] } ],\n` +
    `  "optimalTiming": "<1-2 sentence recommendation>",\n` +
    `  "activityGuidance": [ { "activity": "${params.activities[0] ?? "EVA"}", "recommendation": "...", "precautions": ["..."], "riskLevel": "critical"|"high"|"moderate"|"low" } ],\n` +
    `  "alternativeWindows": [ { "start": "ISO date", "end": "ISO date", "reasonWhy": "...", "improvementScore": <1-10> } ]\n` +
    `}\n` +
    `Be specific and actionable. No markdown. No extra text.`;

  const defaultResult = buildDemoAssessment(params, forecast);

  try {
    const raw = await generateText(prompt, {
      modelId:      GRANITE_CHAT_MODEL,
      maxNewTokens: 1200,
      temperature:  0.4,
      topP:         0.9,
    });

    const cleaned = extractFirstJson(raw);

    const parsed = JSON.parse(cleaned) as Partial<MissionAssessmentResult>;

    const verdict = (["GO", "NO-GO", "CONDITIONAL"].includes(String(parsed.verdict ?? ""))
      ? parsed.verdict
      : defaultResult.verdict) as MissionAssessmentResult["verdict"];

    return {
      missionName:        params.missionName,
      verdict,
      verdictReason:      String(parsed.verdictReason ?? defaultResult.verdictReason),
      overallRiskScore:   Math.min(10, Math.max(1, Number(parsed.overallRiskScore ?? defaultResult.overallRiskScore))),
      riskFactors:        sanitiseRiskFactors(parsed.riskFactors ?? defaultResult.riskFactors),
      optimalTiming:      String(parsed.optimalTiming ?? defaultResult.optimalTiming),
      activityGuidance:   sanitiseActivityGuidance(parsed.activityGuidance ?? defaultResult.activityGuidance),
      alternativeWindows: sanitiseAltWindows(parsed.alternativeWindows ?? defaultResult.alternativeWindows, params),
      generatedAt:        new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[prediction] generateMissionAssessment failed:", (err as Error).message);
    return { ...defaultResult, missionName: params.missionName };
  }
}

// ─── Sanitise helpers ─────────────────────────────────────────────────────────

function sanitiseRiskFactors(raw: unknown): RiskFactor[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 6).map((r, i) => ({
    id:               String((r as RiskFactor).id ?? `rf${i + 1}`),
    title:            String((r as RiskFactor).title ?? "Unknown Risk"),
    description:      String((r as RiskFactor).description ?? ""),
    severity:         (["critical","high","moderate","low"].includes((r as RiskFactor).severity)
      ? (r as RiskFactor).severity : "moderate") as RiskLevel,
    mitigationSteps:  Array.isArray((r as RiskFactor).mitigationSteps)
      ? (r as RiskFactor).mitigationSteps.map(String)
      : [],
  }));
}

function sanitiseActivityGuidance(raw: unknown): ActivityGuidance[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((r) => ({
    activity:       String((r as ActivityGuidance).activity ?? "observation") as ActivityGuidance["activity"],
    recommendation: String((r as ActivityGuidance).recommendation ?? ""),
    precautions:    Array.isArray((r as ActivityGuidance).precautions)
      ? (r as ActivityGuidance).precautions.map(String)
      : [],
    riskLevel:      (["critical","high","moderate","low"].includes((r as ActivityGuidance).riskLevel)
      ? (r as ActivityGuidance).riskLevel : "moderate") as RiskLevel,
  }));
}

function sanitiseAltWindows(raw: unknown, params: MissionParameters): AlternativeWindow[] {
  if (!Array.isArray(raw)) return buildDemoAltWindows(params);
  return (raw as AlternativeWindow[]).slice(0, 3).map((w) => ({
    start:            String(w.start ?? ""),
    end:              String(w.end ?? ""),
    reasonWhy:        String(w.reasonWhy ?? ""),
    improvementScore: Math.min(10, Math.max(1, Number(w.improvementScore ?? 7))),
  }));
}

// ─── Demo fallbacks ───────────────────────────────────────────────────────────

function buildDemoAltWindows(params: MissionParameters): AlternativeWindow[] {
  const base = new Date(params.plannedStart).getTime();
  return [
    {
      start: new Date(base + 24 * 3600_000).toISOString(),
      end:   new Date(base + 24 * 3600_000 + params.durationHours * 3600_000).toISOString(),
      reasonWhy: "Solar activity expected to decrease within 24 hours.",
      improvementScore: 7,
    },
    {
      start: new Date(base + 48 * 3600_000).toISOString(),
      end:   new Date(base + 48 * 3600_000 + params.durationHours * 3600_000).toISOString(),
      reasonWhy: "Kp index forecast to drop below 2 with quiet geomagnetic conditions.",
      improvementScore: 9,
    },
  ];
}

function buildDemoAssessment(
  params: MissionParameters,
  forecast: SpaceWeatherForecast
): MissionAssessmentResult {
  const isGo = forecast.alertLevel === "green" || forecast.alertLevel === "yellow";
  return {
    missionName:     params.missionName,
    verdict:         isGo ? "GO" : "CONDITIONAL",
    verdictReason:   isGo
      ? "Current space weather is within acceptable limits for the planned mission."
      : "Elevated solar activity requires additional precautions before proceeding.",
    overallRiskScore: isGo ? 3 : 6,
    riskFactors: [
      {
        id: "rf1",
        title: "Solar Radiation Exposure",
        description: "Elevated solar wind may increase radiation dose during EVA.",
        severity: "moderate",
        mitigationSteps: ["Monitor real-time dosimeter readings", "Limit EVA duration if dose rate exceeds threshold"],
      },
      {
        id: "rf2",
        title: "Communication Blackout",
        description: "Ionospheric disturbances may disrupt HF communication windows.",
        severity: "low",
        mitigationSteps: ["Pre-schedule relay contacts", "Have backup UHF/VHF channels ready"],
      },
    ],
    optimalTiming: "Execute mission during the geomagnetically quiet period forecast for early morning UTC.",
    activityGuidance: params.activities.map((a) => ({
      activity: a,
      recommendation: `Proceed with standard protocol. Monitor space weather feeds throughout ${a.replace(/_/g, " ")}.`,
      precautions: ["Check solar forecast before go-ahead", "Have abort criteria pre-defined"],
      riskLevel: "moderate" as RiskLevel,
    })),
    alternativeWindows: buildDemoAltWindows(params),
    generatedAt: new Date().toISOString(),
  };
}
