"use client";

import { Check } from "lucide-react";
import type { ShortTermJourneyStep } from "@/lib/short-term-owner-readiness";

const OWNER_VS_STEP_KEYS = new Set([
  "profileComplete",
  "serviceAgreement",
  "partnerAgreement",
  "icalConfigured",
]);

interface ShortTermOwnerJourneyProps {
  steps: ShortTermJourneyStep[];
  readyToGoLive: boolean;
  missingSteps: string[];
  className?: string;
  /** Queue view: only steps the owner completes on Vacation Saga */
  ownerStepsOnly?: boolean;
}

export function ShortTermOwnerJourney({
  steps,
  readyToGoLive,
  missingSteps,
  className = "",
  ownerStepsOnly = false,
}: ShortTermOwnerJourneyProps) {
  const visibleSteps = ownerStepsOnly
    ? steps.filter((s) => OWNER_VS_STEP_KEYS.has(s.key))
    : steps;

  return (
    <div className={`space-y-2 ${className}`}>
      {ownerStepsOnly && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Owner must finish these on Vacation Saga before you can make the property
          public.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {visibleSteps.map((step) => (
          <div
            key={step.key}
            className={[
              "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
              step.complete
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground",
            ].join(" ")}
            title={step.completedAt ? `Completed ${new Date(step.completedAt).toLocaleString()}` : undefined}
          >
            <span
              className={[
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                step.complete
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {step.complete ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : "·"}
            </span>
            <span className="max-w-[10rem] truncate">{step.label}</span>
          </div>
        ))}
      </div>
      {readyToGoLive ? (
        <p className="text-xs text-emerald-600 font-medium">Ready to go live</p>
      ) : missingSteps.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Pending: {missingSteps.join(", ")}
        </p>
      ) : null}
    </div>
  );
}
