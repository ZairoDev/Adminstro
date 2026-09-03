export const VISIT_STATUSES = ["scheduled", "rescheduled", "completed"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const VISIT_OUTCOMES = ["none", "cancelled", "no_show"] as const;
export type VisitOutcome = (typeof VISIT_OUTCOMES)[number];

export const VISIT_STATUS_SOURCES = ["manual", "auto", "system"] as const;
export type VisitStatusSource = (typeof VISIT_STATUS_SOURCES)[number];

export const VISIT_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  scheduled: ["rescheduled", "completed"],
  rescheduled: ["rescheduled", "completed"],
  completed: [],
};

export const ACTIVE_VISIT_STATUSES: VisitStatus[] = ["scheduled", "rescheduled"];

export const VISIT_CLOSE_WINDOW_DAYS = 4;

/**
 * 4-day close-out lock applies only to visits created on or after this date
 * (01/09/2026, dd/mm/yyyy, start of day IST). Older visits never block the app.
 */
export const VISIT_STATUS_LOCK_START = new Date("2026-09-01T00:00:00+05:30");

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: "Scheduled",
  rescheduled: "Rescheduled",
  completed: "Completed",
};

export const VISIT_OUTCOME_LABELS: Record<VisitOutcome, string> = {
  none: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const VISIT_CANCEL_REASONS = [
  "Blocked on whatsapp",
  "Late Response",
  "Delayed the travelling",
  "Already got it",
  "Didn't like the option",
  "Different Area",
  "Agency Fees",
] as const;

export const VISIT_NO_SHOW_REASONS = [
  "Guest did not arrive",
  "Guest unreachable",
  "Owner not available",
  "Wrong address / location",
  "Other",
] as const;

export type VisitCategoryFilter = "all" | VisitStatus;

export const VISIT_CATEGORY_FILTER_OPTIONS: {
  value: VisitCategoryFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  ...VISIT_STATUSES.map((status) => ({
    value: status,
    label: VISIT_STATUS_LABELS[status],
  })),
];

export function isVisitStatus(value: string): value is VisitStatus {
  return (VISIT_STATUSES as readonly string[]).includes(value);
}

export function isVisitCategoryFilter(value: string): value is VisitCategoryFilter {
  return value === "all" || isVisitStatus(value);
}

export function assertTransitionAllowed(from: VisitStatus, to: VisitStatus): void {
  if (!VISIT_TRANSITIONS[from].includes(to)) {
    throw new VisitTransitionError(
      `Cannot transition visit from "${from}" to "${to}"`,
    );
  }
}

export class VisitTransitionError extends Error {
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = "VisitTransitionError";
  }
}

export class VisitAccessError extends Error {
  readonly statusCode = 403;

  constructor(message = "You do not have access to this visit") {
    super(message);
    this.name = "VisitAccessError";
  }
}

export class VisitNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = "Visit not found") {
    super(message);
    this.name = "VisitNotFoundError";
  }
}

export interface VisitScheduleSlot {
  date: Date;
  time: string;
}

export function getEarliestScheduleDate(
  schedule: VisitScheduleSlot[] | undefined,
): Date | null {
  const dates = (schedule ?? [])
    .map((slot) => (slot?.date ? new Date(slot.date) : null))
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));

  if (dates.length === 0) return null;

  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

export function getVisitCloseCutoffDate(
  referenceDate = new Date(),
  daysAfterSchedule = VISIT_CLOSE_WINDOW_DAYS,
): Date {
  return new Date(
    referenceDate.getTime() - daysAfterSchedule * 24 * 60 * 60 * 1000,
  );
}

export function getVisitDaysPastSchedule(
  schedule: VisitScheduleSlot[] | undefined,
  referenceDate = new Date(),
): number | null {
  const scheduledDate = getEarliestScheduleDate(schedule);
  if (!scheduledDate) return null;

  return (
    (referenceDate.getTime() - scheduledDate.getTime()) /
    (1000 * 60 * 60 * 24)
  );
}

export function isVisitEligibleForStatusLock(
  createdAt: Date | string | undefined,
): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return created.getTime() >= VISIT_STATUS_LOCK_START.getTime();
}

export function isVisitOverdue(
  visitStatus: string,
  schedule: VisitScheduleSlot[] | undefined,
  createdAt?: Date | string,
  referenceDate = new Date(),
  daysAfterSchedule = VISIT_CLOSE_WINDOW_DAYS,
): boolean {
  if (!isVisitEligibleForStatusLock(createdAt)) {
    return false;
  }

  if (!ACTIVE_VISIT_STATUSES.includes(visitStatus as VisitStatus)) {
    return false;
  }

  const diffInDays = getVisitDaysPastSchedule(schedule, referenceDate);
  if (diffInDays === null) return false;

  return diffInDays >= daysAfterSchedule;
}

export function getVisitDaysOverdue(
  visitStatus: string,
  schedule: VisitScheduleSlot[] | undefined,
  createdAt?: Date | string,
  referenceDate = new Date(),
  daysAfterSchedule = VISIT_CLOSE_WINDOW_DAYS,
): number {
  if (!isVisitOverdue(visitStatus, schedule, createdAt, referenceDate, daysAfterSchedule)) {
    return 0;
  }

  const diffInDays = getVisitDaysPastSchedule(schedule, referenceDate);
  if (diffInDays === null) return 0;

  return Math.floor(diffInDays - daysAfterSchedule) + 1;
}

export function combineScheduleDateTime(date: Date, time: string): Date {
  const combined = new Date(date);
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number.parseInt(hoursRaw ?? "", 10);
  const minutes = Number.parseInt(minutesRaw ?? "", 10);

  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    combined.setHours(hours, minutes, 0, 0);
  }

  return combined;
}

export function isVisitStatusGateEscapePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === "/dashboard/visits") return true;
  return /^\/dashboard\/visits\/[^/]+$/.test(pathname);
}

export function normalizeLegacyVisitStatus(status: string): VisitStatus {
  if (isVisitStatus(status)) return status;
  if (status === "rejected") return "completed";
  return "scheduled";
}
