"use client";

import { stageLabel, type OwnerJourneyStage } from "@/lib/owner-journey";
import { cn } from "@/lib/utils";

const STEPS: OwnerJourneyStage[] = [1, 2, 3, 4];

interface HolidaySeraOwnerJourneyBarProps {
  currentStage: OwnerJourneyStage;
  className?: string;
}

/** Compact horizontal bar for list cards (HolidaySera / holidayUsers only). */
export function HolidaySeraOwnerJourneyBar({ currentStage, className }: HolidaySeraOwnerJourneyBarProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1" aria-label={`Owner journey stage ${currentStage} of 4`}>
        {STEPS.map((step) => {
          const reached = currentStage >= step;
          return (
            <div
              key={step}
              className={cn(
                "h-1 flex-1 max-w-[3rem] rounded-full transition-colors",
                reached ? "bg-primary" : "bg-gray-200 dark:bg-gray-700",
              )}
              title={stageLabel(step)}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500 dark:text-gray-400">
        <span className="font-medium uppercase tracking-wide">Journey</span>
        <span className="truncate text-gray-700 dark:text-gray-300">
          Stage {currentStage}: {stageLabel(currentStage)}
        </span>
      </div>
    </div>
  );
}
