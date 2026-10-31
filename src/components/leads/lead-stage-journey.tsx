"use client";

import {
  LEAD_STAGES,
  formatLeadStageWhen,
  leadStageLabel,
  selectedLeadStage,
  type LeadStage,
  type LeadStageChange,
} from "@/lib/leads/stage";

export function LeadStageJourney({
  stage,
  history,
  saving,
  onChange,
}: {
  stage: string | null | undefined;
  history: LeadStageChange[] | undefined;
  saving: boolean;
  onChange: (stage: LeadStage) => void;
}) {
  const selected = selectedLeadStage(stage);
  const events = [...(history ?? [])].sort((left, right) => {
    const leftTime = left.changedAt ? new Date(left.changedAt).getTime() : 0;
    const rightTime = right.changedAt ? new Date(right.changedAt).getTime() : 0;
    return leftTime - rightTime;
  });

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current stage: {leadStageLabel(stage)}
          </p>
        </div>
        <label className="block w-full sm:w-64">
          <span className="sr-only">Lead stage</span>
          <select
            aria-label="Lead stage"
            value={selected}
            disabled={saving}
            onChange={(event) => {
              const next = event.target.value;
              if (selectedLeadStage(next)) onChange(next as LeadStage);
            }}
            className="h-11 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" disabled>
              Select stage
            </option>
            {LEAD_STAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {events.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No stage changes yet.</p>
      ) : (
        <ol className="mt-5 space-y-0">
          {events.map((event, index) => {
            const from = event.fromStage ? leadStageLabel(event.fromStage) : "";
            const to = leadStageLabel(event.toStage);
            const when = formatLeadStageWhen(event.changedAt);
            return (
              <li key={`${event.changedAt ?? index}-${event.toStage}`} className="flex gap-3">
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-foreground" aria-hidden />
                  {index < events.length - 1 ? <span className="w-px flex-1 bg-border" aria-hidden /> : null}
                </div>
                <div className={`min-w-0 ${index < events.length - 1 ? "pb-4" : ""}`}>
                  <p className="text-sm font-medium text-foreground">
                    {event.changedByName?.trim() || "Unknown"} changed the stage
                    {from && from !== "No stage" ? ` from ${from} to ${to}` : ` to ${to}`}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {when || "Time not recorded"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
