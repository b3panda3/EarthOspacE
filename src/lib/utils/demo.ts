/**
 * /src/lib/utils/demo.ts
 *
 * Demo mode — when NEXT_PUBLIC_DEMO_MODE=true (or DEMO_MODE=true server-side),
 * all AI calls return pre-generated mock responses instantly.
 *
 * This guarantees the prototype always works for judges even during
 * API outages or credit exhaustion.
 *
 * Usage (server):
 *   import { isDemoMode, getDemoNewsFlash, getDemoBriefing } from "@/lib/utils/demo";
 *   if (isDemoMode()) return getDemoBriefing();
 *
 * Usage (client):
 *   import { isClientDemoMode } from "@/lib/utils/demo";
 */

// ─── Mode detection ───────────────────────────────────────────────────────────

/** Server-side demo check (reads process.env) */
export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

/** Client-side demo check (reads NEXT_PUBLIC_* only) */
export function isClientDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

// ─── Mock fixtures ────────────────────────────────────────────────────────────

export const DEMO_NEWS_FLASHES: Record<string, string> = {
  climate:     "Global CO₂ measurements hit record 424 ppm — the highest since the Pliocene epoch 3M years ago.",
  astronomy:   "Hubble captures unprecedented detail in the Crab Nebula's pulsar wind nebula — a century after its discovery.",
  space:       "SpaceX Starship's 7th integrated flight test achieves first booster catch — reusable rockets now a commercial reality.",
  environment: "Amazon deforestation dropped 50% in 2024 under new enforcement policies — a rare conservation win.",
  disaster:    "EONET tracking 3 active wildfire complexes across California — satellite imagery shows 120,000 hectares affected.",
  technology:  "NASA's Perseverance rover achieves oxygen generation milestone — paving the way for Mars in-situ resource use.",
  general:     "The ISS completes its 100,000th orbit — a quarter-century of continuous human presence in low Earth orbit.",
};

export const DEMO_BRIEFING_SECTIONS = [
  {
    title:   "Space Weather Status",
    content: "Current Kp index is 2.3 — geomagnetic conditions are quiet. Solar wind is steady at 412 km/s with nominal proton density at 5.1 n/cm³. No active X-class or M-class flares in the past 24 hours.",
  },
  {
    title:   "Key News Highlights",
    content: "SpaceX Starship completes successful IFT-7 with full booster catch. NASA's Europa Clipper begins its 6-year journey to Jupiter's moon. ISRO announces next lunar mission timeline for 2026.",
  },
  {
    title:   "Events to Watch",
    content: "Perseids meteor shower peaks tomorrow UTC — expect 100+ meteors/hour from dark-sky sites. Two potentially hazardous asteroids (2024 BX1, 433 Eros) pass within 0.05 AU this week.",
  },
  {
    title:   "Alerts & Concerns",
    content: "No active alerts. All ISS systems nominal. Solar activity forecast remains low through the next 72 hours — favourable for EVA and communication windows.",
  },
];

export const DEMO_QUICK_ASSESSMENT = {
  score:   8,
  label:   "Favorable",
  summary: "Conditions are favorable for extravehicular activity. Solar activity remains low with Kp index expected to stay below 3.",
  generatedAt: new Date().toISOString(),
  breakdown: {
    solarActivity:       9,
    geomagneticActivity: 8,
    radiationBelt:       8,
    debrisRisk:         7,
  },
};

export const DEMO_FORECAST_METRICS = [
  { metric: "kp_index",          label: "Kp Index",               unit: "Kp",          predictedMin: 1.5, predictedMax: 3.2, confidence: "high"   as const, reasoning: "Solar wind streams are expected to remain moderate based on current DSCOVR measurements.", day: 1 },
  { metric: "solar_wind_speed",  label: "Solar Wind Speed",        unit: "km/s",        predictedMin: 380, predictedMax: 460, confidence: "high"   as const, reasoning: "ACE satellite data shows steady solar wind with no coronal mass ejection signatures.", day: 1 },
  { metric: "radiation_level",   label: "Radiation Belt Activity", unit: "scale 1-10",  predictedMin: 2.0, predictedMax: 3.5, confidence: "medium" as const, reasoning: "Inner belt remains quiet; outer belt mildly elevated from last week's storm recovery.", day: 1 },
  { metric: "kp_index",          label: "Kp Index",               unit: "Kp",          predictedMin: 2.0, predictedMax: 4.5, confidence: "medium" as const, reasoning: "A solar sector boundary crossing is forecast for Day 2, potentially elevating Kp.", day: 2 },
  { metric: "solar_wind_speed",  label: "Solar Wind Speed",        unit: "km/s",        predictedMin: 400, predictedMax: 550, confidence: "medium" as const, reasoning: "High-speed stream from a northern coronal hole may arrive within 48 hours.", day: 2 },
  { metric: "radiation_level",   label: "Radiation Belt Activity", unit: "scale 1-10",  predictedMin: 3.0, predictedMax: 5.0, confidence: "low"   as const, reasoning: "Uncertainty increases due to potential HSS interaction with the magnetosphere.", day: 2 },
  { metric: "kp_index",          label: "Kp Index",               unit: "Kp",          predictedMin: 1.8, predictedMax: 3.8, confidence: "low"   as const, reasoning: "Post-HSS conditions typically return to quiet levels by Day 3.", day: 3 },
  { metric: "solar_wind_speed",  label: "Solar Wind Speed",        unit: "km/s",        predictedMin: 350, predictedMax: 480, confidence: "low"   as const, reasoning: "Forecast confidence decreases at 72-hour range — monitor NOAA SWPC for updates.", day: 3 },
  { metric: "radiation_level",   label: "Radiation Belt Activity", unit: "scale 1-10",  predictedMin: 2.0, predictedMax: 4.0, confidence: "low"   as const, reasoning: "Belt relaxation expected as solar wind speed normalises after potential HSS passage.", day: 3 },
];

export const DEMO_ASTRO_REPLIES: Record<string, string> = {
  default:
    "Acknowledged! From up here at the ISS, I can confirm that current conditions look nominal. Solar wind is steady at about 412 km/s and Kp is sitting at a comfortable 2.3 — a green day for all operations. Is there anything specific you'd like me to dig into?",
  space_weather:
    "Space weather is looking cooperative today, Commander. Kp index is 2.3 — well within the quiet range — and no active flare events from NOAA SWPC in the last 12 hours. Solar wind density is 5.1 n/cm³, which is perfectly nominal. I'd recommend this window for any scheduled EVAs.",
  brainstorm:
    "Great — let's think big! What if we combined real-time satellite imagery with crowd-sourced ground observations to create a hyper-local environmental monitoring network? Civilians with smartphones could become nodes in a planetary sensor array, validated by our AI models. The data density would be extraordinary.",
  emergency:
    "ALERT — Emergency Protocol SIGMA-3 initiated. I'm detecting elevated proton flux consistent with an impending X-class solar flare. Recommend immediate shelter in the ISS central module, suspend all EVA activity, and switch to backup communication frequencies. Estimated peak arrival: 18 minutes. Awaiting your confirmation.",
  free_chat:
    "Always a pleasure to chat! You know, from 408 km up, the terminator line — that boundary between day and night — moves across Earth at about 1,700 km/h. Watching a sunset that takes 45 minutes on the ground compress into 90 seconds never gets old. What's on your mind today?",
};

export const DEMO_MISSION_ASSESSMENT = {
  missionName:     "Demo EVA-99 Assessment",
  verdict:         "CONDITIONAL" as const,
  verdictReason:   "Current space weather is acceptable for EVA operations, but an incoming high-speed solar wind stream in 48 hours introduces elevated radiation risk. Proceed with enhanced dosimetry monitoring.",
  overallRiskScore: 4,
  riskFactors: [
    {
      id: "rf1",
      title: "Solar Radiation Exposure",
      description: "Forecast Kp rise to 4.5 on Day 2 may elevate radiation dose rates during prolonged EVA.",
      severity: "moderate" as const,
      mitigationSteps: [
        "Monitor real-time dosimeter — abort if dose rate exceeds 0.5 mSv/hr",
        "Limit EVA duration to 6 hours maximum",
        "Pre-position in ISS central module if solar flare alert is issued",
      ],
    },
    {
      id: "rf2",
      title: "Communication Window Constraints",
      description: "Ionospheric disturbance from potential HSS arrival may degrade S-band communication quality.",
      severity: "low" as const,
      mitigationSteps: [
        "Pre-schedule TDRS relay contacts at 15-minute intervals",
        "Verify UHF backup channels before EVA start",
      ],
    },
    {
      id: "rf3",
      title: "Debris Conjunction",
      description: "Cosmos 1408 fragment TCA in 14 hours — station manoeuvre may be required before EVA.",
      severity: "high" as const,
      mitigationSteps: [
        "Monitor Space-Track conjunction data — go/no-go decision 3 hours prior",
        "DAM (Debris Avoidance Manoeuvre) burn window pre-calculated",
      ],
    },
  ],
  optimalTiming: "Execute EVA in the 6-hour window beginning 08:00 UTC tomorrow — Kp forecast nadir at 1.8 with no active flares expected.",
  activityGuidance: [
    {
      activity:       "EVA",
      recommendation: "Proceed with standard EVA protocol. Enhanced radiation monitoring required given 48-hour forecast.",
      precautions:    ["Pre-EVA suit dosimeter calibration", "Solar flare emergency shelter procedure briefed"],
      riskLevel:      "moderate" as const,
    },
    {
      activity:       "observation",
      recommendation: "All scientific observation windows are clear. Excellent seeing conditions forecast.",
      precautions:    ["Verify instrument grounding before solar observation"],
      riskLevel:      "low" as const,
    },
  ],
  alternativeWindows: [
    {
      start:            new Date(Date.now() + 24 * 3600_000).toISOString(),
      end:              new Date(Date.now() + 30 * 3600_000).toISOString(),
      reasonWhy:        "Kp index forecast to drop below 2 during this window — optimal radiation environment.",
      improvementScore: 9,
    },
    {
      start:            new Date(Date.now() + 72 * 3600_000).toISOString(),
      end:              new Date(Date.now() + 78 * 3600_000).toISOString(),
      reasonWhy:        "Post-HSS recovery period with quiet geomagnetic conditions and no debris conjunctions.",
      improvementScore: 8,
    },
  ],
  generatedAt: new Date().toISOString(),
};

export const DEMO_PROFILE = {
  role:               "Mission Scientist",
  gender:             "male" as const,
  missionType:        "Space Exploration",
  interests: {
    "Weather Patterns":       0.6,
    "Air Incidents":          0.3,
    "Space Events":           0.95,
    "Comet Tracking":         0.8,
    "Transportation Advances":0.4,
    "Astronomy News":         0.9,
    "Satellite Telemetry":    0.85,
    "Space Weather":          0.92,
  },
  updateFrequency:    "real-time",
  displayPreference: "technical",
  voiceEnabled:       true,
  personalitySummary: "A technically-minded space scientist with deep interest in solar physics and satellite telemetry. Prefers precise data with contextual AI analysis. Optimistic about humanity's future beyond Earth.",
};
