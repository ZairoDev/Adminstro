"use client";

import { Check } from "lucide-react";

import { stageLabel, type OwnerJourneyStage } from "@/lib/owner-journey";

const STEPS: OwnerJourneyStage[] = [1, 2, 3, 4];

interface OwnerJourneyStepperProps {
  currentStage: OwnerJourneyStage;
  className?: string;
}

export function OwnerJourneyStepper({ currentStage, className = "" }: OwnerJourneyStepperProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1 sm:gap-2 ${className}`}>
      {STEPS.map((step, index) => {
        const done = currentStage > step;
        const active = currentStage === step;
        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            <div
              className={[
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs sm:text-sm transition-colors",
                done || active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : step}
              </span>
              <span className="hidden min-[480px]:inline max-w-[9rem] truncate sm:max-w-none">
                {stageLabel(step)}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={[
                  "hidden h-px w-3 sm:block sm:w-4",
                  currentStage > step ? "bg-primary/50" : "bg-border",
                ].join(" ")}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
