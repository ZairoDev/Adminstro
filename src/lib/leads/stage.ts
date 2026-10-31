export const LEAD_STAGES = [
  "First Message",
  "Second Message",
  "Third Message",
  "Need to send options",
  "Options Send",
  "Visit",
  "Not Replying",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

const LEGACY_STAGE: Record<string, LeadStage> = {
  First: "First Message",
  Second: "Second Message",
  Third: "Third Message",
  Options: "Options Send",
  Visit: "Visit",
};

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

/** Current selector value. Older stored labels are shown as the matching stage. */
export function selectedLeadStage(value: string | null | undefined): LeadStage | "" {
  if (!value || value === "None") return "";
  if (isLeadStage(value)) return value;
  return LEGACY_STAGE[value] ?? "";
}

export function leadStageLabel(value: string | null | undefined): string {
  const selected = selectedLeadStage(value);
  if (selected) return selected;
  if (!value || value === "None") return "No stage";
  return value;
}

export type LeadStageChange = {
  fromStage?: string;
  toStage: string;
  changedByName?: string;
  changedById?: string;
  changedAt?: string | Date;
};

export function latestStageChange<T extends LeadStageChange>(
  history: T[] | null | undefined,
): T | null {
  if (!history?.length) return null;
  return history.reduce((latest, item) => {
    const latestTime = latest.changedAt ? new Date(latest.changedAt).getTime() : 0;
    const itemTime = item.changedAt ? new Date(item.changedAt).getTime() : 0;
    return itemTime >= latestTime ? item : latest;
  });
}

export function formatLeadStageWhen(value: string | Date | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
