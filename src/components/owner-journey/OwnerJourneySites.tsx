"use client";

import type { OwnerJourneyPayload, OwnerSiteKey } from "@/lib/owner-journey";

import { OwnerJourneyStepper } from "./OwnerJourneyStepper";

const SITE_TITLES: Record<OwnerSiteKey, string> = {
  vacationSaga: "VacationSaga",
  holidaySera: "HolidaySera",
  housingSaga: "HousingSaga",
};

interface OwnerJourneySitesProps {
  journey?: OwnerJourneyPayload;
}

export function OwnerJourneySites({ journey }: OwnerJourneySitesProps) {
  if (!journey) {
    return (
      <p className="text-xs text-muted-foreground">Owner journey will load with user data.</p>
    );
  }

  const rows: { key: OwnerSiteKey; stage: number }[] = [];
  if (journey.vacationSaga) {
    rows.push({ key: "vacationSaga", stage: journey.vacationSaga.stage });
  }
  if (journey.holidaySera) {
    rows.push({ key: "holidaySera", stage: journey.holidaySera.stage });
  }
  if (journey.housingSaga) {
    rows.push({ key: "housingSaga", stage: journey.housingSaga.stage });
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No site-specific owner journey for this row.</p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {rows.map(({ key, stage }) => (
        <div
          key={key}
          className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/80 px-3 py-2 sm:flex-row sm:items-center sm:gap-4"
        >
          <span className="w-36 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {SITE_TITLES[key]}
          </span>
          <OwnerJourneyStepper currentStage={stage as 1 | 2 | 3 | 4} className="flex-1" />
        </div>
      ))}
    </div>
  );
}
