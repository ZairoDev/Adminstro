/** Hand the email to the mail server this long before a personal reminder. */
export const PERSONAL_REMINDER_EMAIL_LEAD_MS = 5 * 60 * 1000;

/** Interview reminders get a longer email head start. */
export const INTERVIEW_REMINDER_EMAIL_LEAD_MS = 15 * 60 * 1000;

/** One-minute cron so the email lead is hit within about a minute. */
export const PERSONAL_REMINDER_DEFAULT_CRON = "* * * * *";

export type PersonalReminderEmailSource = "manual" | "interview" | string | null | undefined;

export function emailLeadMsForSource(source?: PersonalReminderEmailSource): number {
  return source === "interview"
    ? INTERVIEW_REMINDER_EMAIL_LEAD_MS
    : PERSONAL_REMINDER_EMAIL_LEAD_MS;
}

export function personalReminderEmailDueBefore(
  now: Date,
  leadMs: number = PERSONAL_REMINDER_EMAIL_LEAD_MS,
): Date {
  return new Date(now.getTime() + leadMs);
}

/** True once we are inside the early-email window, including overdue unsent reminders. */
export function isPersonalReminderEmailDue(
  scheduledAt: Date,
  now: Date,
  leadMs: number = PERSONAL_REMINDER_EMAIL_LEAD_MS,
): boolean {
  return scheduledAt.getTime() <= personalReminderEmailDueBefore(now, leadMs).getTime();
}

/** Dashboard notification opens at the scheduled instant, not before. */
export function isPersonalReminderNotificationDue(
  scheduledAt: Date,
  now: Date,
): boolean {
  return scheduledAt.getTime() <= now.getTime();
}
