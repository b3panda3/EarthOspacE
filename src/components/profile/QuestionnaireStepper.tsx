"use client";

import { CheckIcon } from "lucide-react";
import { motion } from "framer-motion";

export interface Step {
  number: number;
  title: string;
  description: string;
}

interface QuestionnaireStepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export default function QuestionnaireStepper({
  steps,
  currentStep,
}: QuestionnaireStepperProps) {
  const totalSteps = steps.length;
  /** Progress: 0 when on step 0, 100 when all done (currentStep === totalSteps) */
  const progressPct =
    totalSteps <= 1 ? 100 : (currentStep / (totalSteps - 1)) * 100;

  return (
    <div className="w-full">
      {/* ── Step bubbles + connector line ─────────────────────────────── */}
      <div className="relative flex items-center justify-between">
        {/* Background connector track */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#1e3a5f]"
        />

        {/* Animated gold fill */}
        <motion.div
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#38bdf8] origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progressPct / 100 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ right: 0 }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isPending = idx > currentStep;

          return (
            <div
              key={step.number}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              {/* Circle */}
              <motion.div
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${step.number}: ${step.title}${isCompleted ? " — completed" : isActive ? " — current" : ""}`}
                animate={{
                  backgroundColor: isCompleted
                    ? "#38bdf8"
                    : isActive
                    ? "#111f36"
                    : "#050a14",
                  borderColor: isCompleted
                    ? "#38bdf8"
                    : isActive
                    ? "#38bdf8"
                    : "#1e3a5f",
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold"
              >
                {isCompleted ? (
                  <CheckIcon
                    size={14}
                    aria-hidden="true"
                    className="text-[#000000]"
                  />
                ) : (
                  <span
                    className={
                      isActive ? "text-[#38bdf8]" : "text-[#1e3a5f]"
                    }
                  >
                    {step.number}
                  </span>
                )}
              </motion.div>

              {/* Label — hide on very small screens */}
              <span
                className={[
                  "hidden sm:block text-xs font-medium text-center max-w-[70px] leading-tight",
                  isCompleted || isActive
                    ? "text-[#e0f2fe]"
                    : "text-[#1e3a5f]",
                ].join(" ")}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Gold progress bar (below bubbles) ─────────────────────────── */}
      <div
        className="mt-5 h-1 w-full rounded-full bg-[#1e3a5f] overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct)}
        aria-label={`Questionnaire progress: step ${currentStep + 1} of ${totalSteps}`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      {/* ── Current step description ───────────────────────────────────── */}
      <div className="mt-4 text-center sm:text-left">
        <p className="text-xs text-[#7dd3fc]">
          Step {currentStep + 1} of {totalSteps}
        </p>
        <p className="text-sm font-semibold text-[#e0f2fe] mt-0.5">
          {steps[currentStep]?.description}
        </p>
      </div>
    </div>
  );
}
