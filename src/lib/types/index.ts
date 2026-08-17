// ─── EarthOspacE — Shared TypeScript Interfaces ───────────────────────────

// ─── Telemetry types ──────────────────────────────────────────────────────────

export type TelemetrySource = "NASA" | "NOAA" | "Copernicus" | "ESA" | "Demo";

export type TelemetryType =
  | "solar_wind_speed"
  | "solar_wind_density"
  | "kp_index"
  | "solar_flare"
  | "neo"
  | "satellite_status"
  | "earth_observation"
  | "radiation_belt"
  | "geomagnetic_storm";

export type TelemetryStatus = "nominal" | "elevated" | "warning" | "critical" | "unknown";

/** Normalised telemetry data point — common shape for all source adapters */
export interface TelemetryData {
  id: string;
  source: TelemetrySource;
  type: TelemetryType;
  timestamp: string;               // ISO 8601
  values: Record<string, number | string | boolean>;
  unit: string;
  status: TelemetryStatus;
  /** Optional human-readable label override */
  label?: string;
  /** Latitude for map-pinnable telemetry */
  lat?: number;
  lng?: number;
}

/** NEO (Near-Earth Object) from NASA NeoWs */
export interface NeoObject {
  id: string;
  name: string;
  closeApproachDate: string;
  distanceKm: number;
  distanceAU: number;
  velocityKmh: number;
  diameter: { minKm: number; maxKm: number };
  isPotentiallyHazardous: boolean;
  absoluteMagnitude: number;
}

/** Tracked satellite entry */
export interface TrackedSatellite {
  id: string;
  name: string;
  noradId: number;
  status: "active" | "inactive" | "decaying" | "unknown";
  orbitAltitudeKm: number;
  inclinationDeg: number;
  periodMin: number;
  agency: string;
  launchDate?: string;
  lastContact?: string;
}

/** Anomaly detection result from Granite */
export interface AnomalyResult {
  metricKey: string;
  isAnomalous: boolean;
  confidence: number;        // 0-1
  explanation: string;
  impact: string;
  recommendedAction: string;
  detectedAt: string;        // ISO 8601
}

/** Supabase telemetry_history row shape */
export interface TelemetryHistoryRow {
  id?: number;
  source: TelemetrySource;
  metric: string;
  value: number;
  timestamp: string;
  unit?: string;
}

/** Trend analysis result (7-day moving average) */
export interface TrendAnalysis {
  metric: string;
  movingAverage: number;
  trend: "up" | "down" | "flat";
  changePercent: number;
  dataPoints: { timestamp: string; value: number }[];
}

export interface UserProfile {
  id: string;
  name: string;
  role: "explorer" | "scientist" | "educator" | "enthusiast";
  gender?: "male" | "female";
  interests: string[];
  preferences: {
    theme?: "dark" | "light";
    notifications?: boolean;
    mapStyle?: string;
    units?: "metric" | "imperial";
  };
  createdAt: string; // ISO 8601
}

export type NewsCategory =
  | "climate"
  | "astronomy"
  | "space"
  | "environment"
  | "disaster"
  | "technology"
  | "general";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  flashCommentary: string; // AI-generated one-liner
  category: NewsCategory;
  source: string;
  /** Human-readable location label */
  location?: string;
  /** Geographic coordinates for map linking */
  coordinates?: { lat: number; lng: number };
  /** External article link */
  link?: string;
  /** AI-extended 4-6 sentence summary (populated in detail view) */
  extendedSummary?: string;
  /** Comma-separated tags for related-article matching */
  tags?: string[];
  timestamp: string; // ISO 8601
}

/** In-memory bookmark store shape (also stored in Supabase) */
export interface Bookmark {
  id: string;
  articleId: string;
  userId?: string;
  savedAt: string;
}

export type MapEventType =
  | "wildfire"
  | "flood"
  | "earthquake"
  | "volcano"
  | "storm"
  | "drought"
  | "incident"
  | "weather"
  | "space"
  | "observatory"
  | "comet"
  | "other";

export type MapEventCategory =
  | "incident"
  | "weather"
  | "space"
  | "observatory"
  | "comet";

export interface MapEvent {
  id: string;
  type: MapEventType;
  lat: number;
  lng: number;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  category: MapEventCategory;
  /** Optional link to related news item / external resource */
  link?: string;
}

export type ObservatoryAgency =
  | "NASA"
  | "ESA"
  | "JAXA"
  | "ISRO"
  | "CSA"
  | "SpaceFlightNow"
  | "Other";

export interface ObservatoryNews {
  id: string;
  agency: ObservatoryAgency;
  title: string;
  summary: string;
  /** Original article link */
  link?: string;
  /** AI-generated contextual explanation */
  aiContext: string;
  /** AI relevance score 1-10 */
  relevanceScore: number;
  /** Up to 3 topic tags from AI */
  tags: string[];
  date: string; // ISO 8601
  imageUrl?: string;
}

export interface RobotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
  audioUrl?: string; // Optional TTS audio URL
}

// ─── Onboarding / Questionnaire types ─────────────────────────────────────

export const INTEREST_CATEGORIES = [
  "Weather Patterns",
  "Air Incidents",
  "Space Events",
  "Comet Tracking",
  "Transportation Advances",
  "Astronomy News",
  "Satellite Telemetry",
  "Space Weather",
] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];

export type InterestWeights = Record<InterestCategory, number>; // 0-1

/** Raw questionnaire answers collected across all 4 steps */
export interface QuestionnaireAnswers {
  // Step 1
  primaryRole: string;
  organization: string;
  gender: "male" | "female";
  // Step 2
  missionType: string;
  location: string;
  // Step 3
  interestRatings: Record<InterestCategory, number>; // 1-5 stars
  // Step 4
  updateFrequency: string;
  displayPreference: string;
  voiceEnabled: boolean;
}

/** AI-generated profile stored in Supabase */
export interface AiUserProfile {
  id?: string;
  role: string;
  gender?: "male" | "female";
  missionType: string;
  interests: InterestWeights;
  updateFrequency: string;
  displayPreference: string;
  voiceEnabled: boolean;
  personalitySummary: string;
  createdAt?: string;
}

// ─── Prediction & Mission Planning types ──────────────────────────────────────

export type ForecastConfidence = "high" | "medium" | "low";
export type RiskLevel = "critical" | "high" | "moderate" | "low";

/** One metric's forecast for a single day */
export interface MetricForecast {
  metric:       string;
  label:        string;
  unit:         string;
  predictedMin: number;
  predictedMax: number;
  confidence:   ForecastConfidence;
  reasoning:    string;
  day:          number;         // 1, 2, 3 …
}

/** Full 3-day space weather forecast from Granite */
export interface SpaceWeatherForecast {
  generatedAt:         string;    // ISO 8601
  forecastHorizonDays: number;
  metrics:             MetricForecast[];
  overallOutlook:      string;
  alertLevel:          "green" | "yellow" | "orange" | "red";
}

/** Quick 1-10 assessment for the main dashboard widget */
export interface QuickAssessment {
  score:       number;           // 1 (critical) → 10 (perfect)
  label:       string;           // "Favorable" | "Moderate" | "Unfavorable" etc.
  summary:     string;           // one sentence
  generatedAt: string;
  breakdown: {
    solarActivity:       number;
    geomagneticActivity: number;
    radiationBelt:       number;
    debrisRisk:         number;
  };
}

/** Risk factor in a mission assessment */
export interface RiskFactor {
  id:               string;
  title:            string;
  description:      string;
  severity:         RiskLevel;
  mitigationSteps:  string[];
}

/** Per-activity guidance */
export interface ActivityGuidance {
  activity:       "EVA" | "communication_window" | "experiment" | "observation" | string;
  recommendation: string;
  precautions:    string[];
  riskLevel:      RiskLevel;
}

/** Alternative time window suggestion */
export interface AlternativeWindow {
  start:            string;   // ISO 8601
  end:              string;   // ISO 8601
  reasonWhy:        string;
  improvementScore: number;   // 1-10
}

/** Input from the mission planning form */
export interface MissionParameters {
  missionName:    string;
  missionType:    "EVA" | "satellite_deployment" | "observation" | "communication" | "experiment" | "maintenance";
  plannedStart:   string;   // ISO 8601
  plannedEnd:     string;   // ISO 8601
  durationHours:  number;
  activities:     string[];
  notes?:         string;
}

/** Complete Granite mission assessment result */
export interface MissionAssessmentResult {
  missionName:        string;
  verdict:            "GO" | "NO-GO" | "CONDITIONAL";
  verdictReason:      string;
  overallRiskScore:   number;   // 1-10
  riskFactors:        RiskFactor[];
  optimalTiming:      string;
  activityGuidance:   ActivityGuidance[];
  alternativeWindows: AlternativeWindow[];
  generatedAt:        string;
}

/** Debris density by altitude band */
export interface DebrisBand {
  altitudeKm:     number;
  densityScore:   number;   // 0-10 relative density
  objectCount:    number;
  riskLevel:      RiskLevel;
  description:    string;
}

/** Conjunction event risk entry */
export interface ConjunctionEvent {
  id:             string;
  primaryObject:  string;
  secondaryObject: string;
  tcaUtc:         string;   // time of closest approach ISO 8601
  missDistanceKm: number;
  probabilityPct: number;
  riskNarrative:  string;
  riskLevel:      RiskLevel;
}
