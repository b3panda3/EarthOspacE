"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronRight, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import QuestionnaireStepper, {
  type Step,
} from "@/components/profile/QuestionnaireStepper";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useProfile } from "@/lib/hooks/useProfile";
import {
  INTEREST_CATEGORIES,
  type InterestCategory,
  type QuestionnaireAnswers,
} from "@/lib/types";

/* ── Static option data ──────────────────────────────────────────────────── */

const ROLES = [
  "Deployed Astronaut",
  "Mission Control Officer",
  "Space Researcher",
  "Aerospace Engineer",
  "Science Educator",
  "Space Enthusiast",
];

const ORG_SUGGESTIONS = [
  "NASA",
  "ESA",
  "JAXA",
  "ISRO",
  "CSA",
  "Private Sector",
  "Independent",
];

const MISSION_TYPES = [
  "ISS Operations",
  "Lunar Mission",
  "Mars Mission",
  "Satellite Operations",
  "Deep Space Exploration",
  "Ground-based Research",
];

const LOCATIONS = [
  "Low Earth Orbit",
  "Lunar Surface",
  "Mars Surface",
  "Ground Control",
  "Other",
];

const UPDATE_FREQUENCIES = ["Real-time", "Hourly", "Daily Digest"];
const DISPLAY_PREFS = ["Compact Cards", "Detailed View", "Summary Only"];

const STEPS: Step[] = [
  { number: 1, title: "Role", description: "Tell us about your role and affiliation" },
  { number: 2, title: "Mission", description: "Describe your mission context and location" },
  { number: 3, title: "Interests", description: "Rate your interest in each category" },
  { number: 4, title: "Prefs", description: "Set your display and notification preferences" },
];

/* ── Default answers ─────────────────────────────────────────────────────── */

const defaultRatings = Object.fromEntries(
  INTEREST_CATEGORIES.map((c) => [c, 0])
) as Record<InterestCategory, number>;

const defaultAnswers: QuestionnaireAnswers = {
  primaryRole: "",
  organization: "",
  gender: "male",
  missionType: "",
  location: "",
  interestRatings: defaultRatings,
  updateFrequency: "",
  displayPreference: "",
  voiceEnabled: false,
};

/* ── Sub-components ──────────────────────────────────────────────────────── */

/** Single-select pill group */
function PillSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt)}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c974] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100f0e]",
                selected
                  ? "bg-[#e6c974]/15 border-[#e6c974] text-[#e6c974]"
                  : "bg-[#24231f] border-[#3a3830] text-[#96938d] hover:border-[#605943] hover:text-[#e8e7e5]",
              ].join(" ")}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Text input with suggestion chips below */
function SuggestedTextInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#e8e7e5]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="h-10 rounded-lg px-3 text-sm bg-[#24231f] border border-[#3a3830] text-[#e8e7e5] placeholder-[#605943] focus:outline-none focus:ring-2 focus:ring-[#e6c974]/60 focus:border-[#e6c974]/60 transition-colors"
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="rounded px-2 py-0.5 text-xs bg-[#29271f] border border-[#3a3830] text-[#96938d] hover:border-[#605943] hover:text-[#e8e7e5] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6c974]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 5-star rating control */
function StarRating({
  category,
  rating,
  onChange,
}: {
  category: string;
  rating: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-[#e8e7e5] min-w-0 flex-1 truncate">
        {category}
      </span>
      <div
        role="group"
        aria-label={`Rate your interest in ${category}`}
        className="flex items-center gap-0.5 shrink-0"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || rating);
          return (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
              aria-pressed={star === rating}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(0)}
              className="p-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6c974] rounded"
            >
              <Star
                size={18}
                aria-hidden="true"
                className={`transition-colors duration-100 ${
                  filled ? "fill-[#e6c974] text-[#e6c974]" : "text-[#3a3830]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Yes / No toggle */
function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-[#e8e7e5]">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex rounded-lg border border-[#3a3830] overflow-hidden"
      >
        {[
          { label: "Yes", val: true },
          { label: "No", val: false },
        ].map(({ label: l, val }) => (
          <button
            key={l}
            type="button"
            aria-pressed={value === val}
            onClick={() => onChange(val)}
            className={[
              "px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e6c974]",
              value === val
                ? "bg-[#e6c974]/15 text-[#e6c974]"
                : "text-[#605943] hover:text-[#e8e7e5]",
            ].join(" ")}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Step panels ─────────────────────────────────────────────────────────── */

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -40 : 40 }),
};

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const { saveProfile, loading } = useProfile();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(defaultAnswers);

  const update = useCallback(
    <K extends keyof QuestionnaireAnswers>(
      key: K,
      value: QuestionnaireAnswers[K]
    ) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateRating = useCallback(
    (category: InterestCategory, stars: number) => {
      setAnswers((prev) => ({
        ...prev,
        interestRatings: { ...prev.interestRatings, [category]: stars },
      }));
    },
    []
  );

  /* Validate the current step before advancing */
  const canAdvance = (): boolean => {
    if (step === 0) return !!answers.primaryRole && !!answers.organization && !!answers.gender;
    if (step === 1) return !!answers.missionType && !!answers.location;
    if (step === 2)
      return Object.values(answers.interestRatings).some((v) => v > 0);
    if (step === 3)
      return !!answers.updateFrequency && !!answers.displayPreference;
    return false;
  };

  const goNext = () => {
    if (!canAdvance()) return;
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const profile = await saveProfile(answers);
    if (profile) {
      router.push("/profile");
    }
  };

  const isLastStep = step === STEPS.length - 1;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-2xl px-2 py-8 sm:py-12">
      {/* Hero heading */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e6c974]/30 bg-[#e6c974]/10 px-3 py-1 text-xs font-medium text-[#e6c974] mb-3">
          <Sparkles size={12} aria-hidden="true" />
          Personalized for you
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e7e5]">
          Mission Briefing
        </h1>
        <p className="mt-2 text-sm text-[#96938d]">
          Answer a few questions so IBM Granite can build your tailored space profile.
        </p>
      </div>

      <Card variant="elevated" className="p-6 sm:p-8">
        {/* Stepper */}
        <div className="mb-8">
          <QuestionnaireStepper steps={STEPS} currentStep={step} />
        </div>

        {/* Animated step panels */}
        <div className="relative overflow-hidden min-h-[320px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="w-full"
            >
              {/* ── Step 1: Role ─────────────────────────────────────── */}
              {step === 0 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-[#e8e7e5]">
                      What is your primary role?
                    </p>
                    <PillSelect
                      label="Primary role"
                      options={ROLES}
                      value={answers.primaryRole}
                      onChange={(v) => update("primaryRole", v)}
                    />
                  </div>
                  <SuggestedTextInput
                    label="Which space agency or organization are you affiliated with?"
                    value={answers.organization}
                    onChange={(v) => update("organization", v)}
                    suggestions={ORG_SUGGESTIONS}
                    placeholder="e.g. NASA, ESA, Independent..."
                  />
                  <div>
                    <p className="mb-3 text-sm font-medium text-[#e8e7e5]">
                      Select companion appearance (affects AI companion physique)
                    </p>
                    <PillSelect
                      label="Companion gender"
                      options={["Male", "Female"]}
                      value={answers.gender === "male" ? "Male" : "Female"}
                      onChange={(v) => update("gender", v.toLowerCase() as "male" | "female")}
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2: Mission ───────────────────────────────────── */}
              {step === 1 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-[#e8e7e5]">
                      What type of mission are you primarily interested in?
                    </p>
                    <PillSelect
                      label="Mission type"
                      options={MISSION_TYPES}
                      value={answers.missionType}
                      onChange={(v) => update("missionType", v)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="location-select"
                      className="mb-2 block text-sm font-medium text-[#e8e7e5]"
                    >
                      What is your current location?
                    </label>
                    <select
                      id="location-select"
                      value={answers.location}
                      onChange={(e) => update("location", e.target.value)}
                      className="h-10 w-full rounded-lg px-3 text-sm bg-[#24231f] border border-[#3a3830] text-[#e8e7e5] focus:outline-none focus:ring-2 focus:ring-[#e6c974]/60 focus:border-[#e6c974]/60 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Select location…
                      </option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── Step 3: Interest Ratings ──────────────────────────── */}
              {step === 2 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-[#e8e7e5]">
                    Rate your interest in each category
                  </p>
                  <p className="mb-4 text-xs text-[#605943]">
                    1 star = low interest &nbsp;·&nbsp; 5 stars = top priority
                  </p>
                  <div className="divide-y divide-[#3a3830]">
                    {INTEREST_CATEGORIES.map((cat) => (
                      <StarRating
                        key={cat}
                        category={cat}
                        rating={answers.interestRatings[cat]}
                        onChange={(v) => updateRating(cat, v)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 4: Preferences ───────────────────────────────── */}
              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="mb-3 text-sm font-medium text-[#e8e7e5]">
                      How often would you like to receive updates?
                    </p>
                    <PillSelect
                      label="Update frequency"
                      options={UPDATE_FREQUENCIES}
                      value={answers.updateFrequency}
                      onChange={(v) => update("updateFrequency", v)}
                    />
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium text-[#e8e7e5]">
                      Which display format do you prefer?
                    </p>
                    <PillSelect
                      label="Display preference"
                      options={DISPLAY_PREFS}
                      value={answers.displayPreference}
                      onChange={(v) => update("displayPreference", v)}
                    />
                  </div>
                  <YesNoToggle
                    label="Would you like voice briefings from the AI companion?"
                    value={answers.voiceEnabled}
                    onChange={(v) => update("voiceEnabled", v)}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={step === 0}
            aria-label="Go to previous step"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!canAdvance() || loading}
              loading={loading}
              aria-label="Submit questionnaire and generate profile"
            >
              <Sparkles size={14} aria-hidden="true" />
              {loading ? "Analysing with Granite…" : "Generate My Profile"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={goNext}
              disabled={!canAdvance()}
              aria-label="Go to next step"
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
