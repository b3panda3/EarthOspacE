"use client";

/**
 * /src/app/dashboard/planning/page.tsx
 *
 * Mission Planning Assistant
 *
 * Form → POST /api/planning → MissionAssessment component + MissionTimeline
 *
 * The assessment displays:
 *   - GO / NO-GO / CONDITIONAL verdict with colour coding
 *   - Risk factors ranked by severity
 *   - Per-activity guidance
 *   - Alternative windows
 *   - Full MissionTimeline Gantt
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import MissionTimeline from "@/components/dashboard/MissionTimeline";
import type {
  MissionParameters,
  MissionAssessmentResult,
  SpaceWeatherForecast,
  RiskFactor,
  ActivityGuidance,
  AlternativeWindow,
  RiskLevel,
} from "@/lib/types";

// ─── API call ─────────────────────────────────────────────────────────────────

interface PlanningResponse {
  assessment:        MissionAssessmentResult;
  forecast:          SpaceWeatherForecast;
  currentConditions: { kpIndex: number; solarWindSpeedKms: number };
}

async function submitMission(params: MissionParameters): Promise<PlanningResponse> {
  const res = await fetch("/api/planning", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Planning API ${res.status}`);
  }
  return res.json();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MISSION_TYPES: { value: MissionParameters["missionType"]; label: string }[] = [
  { value: "EVA",                 label: "EVA (Spacewalk)"         },
  { value: "satellite_deployment",label: "Satellite Deployment"    },
  { value: "observation",         label: "Scientific Observation"  },
  { value: "communication",       label: "Communication Window"    },
  { value: "experiment",          label: "Onboard Experiment"      },
  { value: "maintenance",         label: "Maintenance Operation"   },
];

const AVAILABLE_ACTIVITIES = [
  "EVA", "communication_window", "experiment", "observation",
  "maintenance", "rendezvous", "deployment", "data_collection",
];

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#f87171",
  high:     "#fb923c",
  moderate: "#38bdf8",
  low:      "#4ade80",
};

const VERDICT_STYLES: Record<MissionAssessmentResult["verdict"], { bg: string; border: string; text: string; icon: string }> = {
  "GO":          { bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.4)",  text: "#4ade80", icon: "✓" },
  "NO-GO":       { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.4)", text: "#f87171", icon: "✕" },
  "CONDITIONAL": { bg: "rgba(230,201,116,0.1)", border: "rgba(230,201,116,0.4)", text: "#38bdf8", icon: "⚠" },
};

// ─── Form component ───────────────────────────────────────────────────────────

function PlanningForm({ onSubmit, isLoading }: {
  onSubmit: (p: MissionParameters) => void;
  isLoading: boolean;
}) {
  const now    = new Date();
  const plus4h = new Date(now.getTime() + 4 * 3600_000);

  const [form, setForm] = useState<{
    missionName:  string;
    missionType:  MissionParameters["missionType"];
    plannedStart: string;
    plannedEnd:   string;
    activities:   string[];
    notes:        string;
  }>({
    missionName:  "",
    missionType:  "observation",
    plannedStart: now.toISOString().slice(0, 16),
    plannedEnd:   plus4h.toISOString().slice(0, 16),
    activities:   ["observation"],
    notes:        "",
  });

  const toggle = (act: string) => {
    setForm((f) => ({
      ...f,
      activities: f.activities.includes(act)
        ? f.activities.filter((a) => a !== act)
        : [...f.activities, act],
    }));
  };

  const durationHours =
    (new Date(form.plannedEnd).getTime() - new Date(form.plannedStart).getTime()) / 3_600_000;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      plannedStart:  new Date(form.plannedStart).toISOString(),
      plannedEnd:    new Date(form.plannedEnd).toISOString(),
      durationHours: Math.max(0.5, durationHours),
    });
  };

  return (
    <form
      onSubmit={handle}
      className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-5 space-y-5"
    >
      <h2 className="text-base font-semibold text-[#e0f2fe]">Mission Parameters</h2>

      {/* Name + type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#7dd3fc] mb-1.5">Mission Name</label>
          <input
            required
            value={form.missionName}
            onChange={(e) => setForm((f) => ({ ...f, missionName: e.target.value }))}
            placeholder="e.g. ISS EVA-89 prep check"
            className="w-full rounded-lg bg-[#111f36] border border-[#1e3a5f] text-[#e0f2fe] text-sm px-3 py-2 placeholder-[#1e3a5f] focus:outline-none focus:border-[#38bdf8] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-[#7dd3fc] mb-1.5">Mission Type</label>
          <select
            value={form.missionType}
            onChange={(e) => setForm((f) => ({ ...f, missionType: e.target.value as MissionParameters["missionType"] }))}
            className="w-full rounded-lg bg-[#111f36] border border-[#1e3a5f] text-[#e0f2fe] text-sm px-3 py-2 focus:outline-none focus:border-[#38bdf8] transition-colors"
          >
            {MISSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Time window */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#7dd3fc] mb-1.5">Planned Start (UTC)</label>
          <input
            required
            type="datetime-local"
            value={form.plannedStart}
            onChange={(e) => setForm((f) => ({ ...f, plannedStart: e.target.value }))}
            className="w-full rounded-lg bg-[#111f36] border border-[#1e3a5f] text-[#e0f2fe] text-sm px-3 py-2 focus:outline-none focus:border-[#38bdf8] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-[#7dd3fc] mb-1.5">
            Planned End (UTC)
            {durationHours > 0 && (
              <span className="ml-2 text-[#38bdf8]">({durationHours.toFixed(1)}h)</span>
            )}
          </label>
          <input
            required
            type="datetime-local"
            value={form.plannedEnd}
            min={form.plannedStart}
            onChange={(e) => setForm((f) => ({ ...f, plannedEnd: e.target.value }))}
            className="w-full rounded-lg bg-[#111f36] border border-[#1e3a5f] text-[#e0f2fe] text-sm px-3 py-2 focus:outline-none focus:border-[#38bdf8] transition-colors"
          />
        </div>
      </div>

      {/* Activities */}
      <div>
        <label className="block text-xs text-[#7dd3fc] mb-2">Planned Activities</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_ACTIVITIES.map((act) => {
            const selected = form.activities.includes(act);
            return (
              <button
                key={act}
                type="button"
                onClick={() => toggle(act)}
                className="px-2.5 py-1 rounded-full text-xs transition-colors"
                style={{
                  backgroundColor: selected ? "#38bdf822" : "#111f36",
                  border:          `1px solid ${selected ? "#38bdf8" : "#1e3a5f"}`,
                  color:           selected ? "#38bdf8"   : "#7dd3fc",
                }}
              >
                {act.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
        {form.activities.length === 0 && (
          <p className="text-[10px] text-[#f87171] mt-1">Select at least one activity</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-[#7dd3fc] mb-1.5">Additional Notes (optional)</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Specific constraints, crew details, equipment requirements…"
          className="w-full rounded-lg bg-[#111f36] border border-[#1e3a5f] text-[#e0f2fe] text-sm px-3 py-2 placeholder-[#1e3a5f] focus:outline-none focus:border-[#38bdf8] transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || form.activities.length === 0 || !form.missionName}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#38bdf8] text-[#000000] hover:bg-[#0ea5e9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
            </svg>
            IBM Granite analysing…
          </>
        ) : (
          "Generate Mission Assessment"
        )}
      </button>
    </form>
  );
}

// ─── MissionAssessment component ──────────────────────────────────────────────

function MissionAssessment({
  result,
  params,
  forecast,
}: {
  result:   MissionAssessmentResult;
  params:   MissionParameters;
  forecast: SpaceWeatherForecast;
}) {
  const vs = VERDICT_STYLES[result.verdict];

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      <div
        className="rounded-xl p-5 border-2 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ backgroundColor: vs.bg, borderColor: vs.border }}
      >
        <div
          className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: vs.border, color: vs.text }}
        >
          {vs.icon}
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color: vs.text }}>
            {result.verdict}
          </p>
          <p className="text-sm text-[#e0f2fe] mt-1 leading-relaxed">{result.verdictReason}</p>
          <p className="text-xs text-[#7dd3fc] mt-1">
            Overall risk score:{" "}
            <span
              className="font-bold"
              style={{ color: result.overallRiskScore >= 7 ? "#f87171" : result.overallRiskScore >= 4 ? "#38bdf8" : "#4ade80" }}
            >
              {result.overallRiskScore}/10
            </span>
          </p>
        </div>
      </div>

      {/* Timeline */}
      <MissionTimeline params={params} assessment={result} forecast={forecast} />

      {/* Risk factors */}
      <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4">
        <h3 className="text-sm font-semibold text-[#e0f2fe] mb-3">Risk Factors</h3>
        <div className="space-y-2">
          {result.riskFactors
            .sort((a, b) => {
              const order = { critical: 0, high: 1, moderate: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map((rf: RiskFactor) => {
              const rc = RISK_COLOR[rf.severity];
              return (
                <details key={rf.id} className="group rounded-lg border" style={{ borderColor: rc + "33" }}>
                  <summary
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                    style={{ backgroundColor: rc + "0a" }}
                  >
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: rc }} />
                    <span className="text-xs font-semibold text-[#e0f2fe] flex-1">{rf.title}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                      style={{ backgroundColor: rc + "22", color: rc }}
                    >
                      {rf.severity}
                    </span>
                    <svg className="w-3 h-3 text-[#1e3a5f] group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </summary>
                  <div className="px-3 pb-3 pt-2 space-y-1.5">
                    <p className="text-xs text-[#7dd3fc] leading-relaxed">{rf.description}</p>
                    {rf.mitigationSteps.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#1e3a5f] uppercase tracking-widest mb-1">Mitigation</p>
                        <ul className="space-y-0.5">
                          {rf.mitigationSteps.map((step, i) => (
                            <li key={i} className="text-xs text-[#7dd3fc] flex gap-1.5">
                              <span className="text-[#38bdf8] flex-shrink-0">·</span>{step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
        </div>
      </div>

      {/* Activity guidance */}
      <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4">
        <h3 className="text-sm font-semibold text-[#e0f2fe] mb-3">Activity Guidance</h3>
        <div className="space-y-3">
          {result.activityGuidance.map((ag: ActivityGuidance, i: number) => {
            const rc = RISK_COLOR[ag.riskLevel];
            return (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: rc + "33", backgroundColor: rc + "06" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: rc }} />
                  <p className="text-xs font-semibold text-[#e0f2fe]">
                    {String(ag.activity).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <span
                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded capitalize"
                    style={{ backgroundColor: rc + "22", color: rc }}
                  >
                    {ag.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-[#7dd3fc] leading-relaxed mb-1.5">{ag.recommendation}</p>
                {ag.precautions.length > 0 && (
                  <ul className="space-y-0.5">
                    {ag.precautions.map((p, j) => (
                      <li key={j} className="text-[10px] text-[#1e3a5f] flex gap-1.5">
                        <span className="text-[#a78bfa]">›</span>{p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alternative windows */}
      {result.alternativeWindows.length > 0 && (
        <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-4">
          <h3 className="text-sm font-semibold text-[#e0f2fe] mb-3">Alternative Windows</h3>
          <div className="space-y-2">
            {result.alternativeWindows.map((aw: AlternativeWindow, i: number) => {
              const sc = aw.improvementScore >= 8 ? "#4ade80" : aw.improvementScore >= 5 ? "#38bdf8" : "#7dd3fc";
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-[#111f36] px-3 py-2.5">
                  <div
                    className="flex-shrink-0 mt-0.5 text-xs font-bold font-mono w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: sc + "22", color: sc }}
                  >
                    {aw.improvementScore}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e0f2fe]">
                      {new Date(aw.start).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" — "}
                      {new Date(aw.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC
                    </p>
                    <p className="text-xs text-[#7dd3fc] mt-0.5">{aw.reasonWhy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#1e3a5f]">
        Assessment generated {new Date(result.generatedAt).toLocaleString()} · Powered by IBM Granite ·{" "}
        Not a substitute for certified mission review.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [submittedParams, setSubmittedParams] = useState<MissionParameters | null>(null);

  const mutation = useMutation<PlanningResponse, Error, MissionParameters>({
    mutationFn: submitMission,
  });

  const handleSubmit = (params: MissionParameters) => {
    setSubmittedParams(params);
    mutation.mutate(params);
  };

  return (
    <div className="min-h-screen bg-[#000000] px-4 py-6 md:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e0f2fe] tracking-tight">
          Mission Planning Assistant
        </h1>
        <p className="text-sm text-[#7dd3fc] mt-1">
          Submit mission parameters for an IBM Granite GO/NO-GO assessment with risk analysis
        </p>
      </div>

      <div className="space-y-5">
        <PlanningForm onSubmit={handleSubmit} isLoading={mutation.isPending} />

        {mutation.isError && (
          <div className="rounded-xl border border-[#f87171] border-opacity-40 bg-[rgba(248,113,113,0.08)] p-4">
            <p className="text-sm text-[#f87171]">{mutation.error?.message}</p>
          </div>
        )}

        {mutation.isPending && (
          <div className="rounded-xl border border-[#1e3a5f] bg-[#050a14] p-8 flex flex-col items-center gap-3">
            <div className="relative w-10 h-10">
              <span className="absolute inset-0 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-[#7dd3fc]">IBM Granite is analysing conditions…</p>
            <p className="text-xs text-[#1e3a5f]">Fetching live telemetry · running risk model · generating recommendations</p>
          </div>
        )}

        {mutation.data && submittedParams && (
          <MissionAssessment
            result={mutation.data.assessment}
            params={submittedParams}
            forecast={mutation.data.forecast}
          />
        )}
      </div>
    </div>
  );
}
