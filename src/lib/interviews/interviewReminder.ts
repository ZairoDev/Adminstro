const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const TITLE_MAX = 200;
const NOTE_MAX = 2000;

export type InterviewReminderRound = "first" | "second";
export type InterviewReminderStatus = "pending" | "sent" | "cancelled";

export interface InterviewReminderSnapshot {
  employeeId: string;
  scheduledAtMs: number;
  status: InterviewReminderStatus;
}

export interface InterviewReminderDesired {
  employeeId: string;
  scheduledAtMs: number;
  title: string;
  note: string;
}

export type InterviewReminderDecision =
  | { type: "skip" }
  | {
      type: "upsert";
      employeeId: string;
      scheduledAtMs: number;
      title: string;
      note: string;
    };

/** Interview wall time is Asia/Kolkata, same as the calendar event. */
export function interviewStartInstant(dateKey: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;

  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS;
  const instant = new Date(utcMs);
  const wall = new Date(instant.getTime() + IST_OFFSET_MS);
  if (
    wall.getUTCFullYear() !== year ||
    wall.getUTCMonth() !== month - 1 ||
    wall.getUTCDate() !== day ||
    wall.getUTCHours() !== hour ||
    wall.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return instant;
}

export function interviewReminderTitle(
  round: InterviewReminderRound,
  candidateName: string,
  position: string,
): string {
  const prefix = round === "second" ? "Second round interview" : "Interview";
  const name = candidateName.trim() || "Candidate";
  const role = position.trim() || "role";
  const title = `${prefix}: ${name} — ${role}`;
  if (title.length <= TITLE_MAX) return title;
  return `${title.slice(0, TITLE_MAX - 1)}…`;
}

export function formatInterviewSlot(dateKey: string, time: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  const clock = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match || !clock) return `${dateKey} ${time} IST`.trim();
  const label = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${label}, ${clock[1].padStart(2, "0")}:${clock[2]} IST`;
}

export function interviewReminderNote(input: {
  candidateName: string;
  position: string;
  round: InterviewReminderRound;
  scheduledDate: string;
  scheduledTime: string;
  interviewMode: "physical" | "virtual";
  officeName?: string | null;
  googleMeetLink?: string | null;
  notes?: string | null;
}): string {
  const roundLabel = input.round === "second" ? "Second round" : "First round";
  const lines = [
    `You are the interviewer for ${input.candidateName.trim() || "a candidate"}.`,
    `Position: ${input.position.trim() || "Not set"}`,
    `Round: ${roundLabel}`,
    `When: ${formatInterviewSlot(input.scheduledDate, input.scheduledTime)}`,
  ];
  if (input.interviewMode === "virtual") {
    const meet = input.googleMeetLink?.trim();
    lines.push(meet ? `Meet: ${meet}` : "Mode: Virtual");
  } else {
    lines.push(`Where: ${input.officeName?.trim() || "Office"}`);
  }
  const extra = input.notes?.trim();
  if (extra) lines.push(`Notes: ${extra}`);
  const note = lines.join("\n");
  if (note.length <= NOTE_MAX) return note;
  return `${note.slice(0, NOTE_MAX - 1)}…`;
}

/**
 * One reminder per interview round.
 * The same interviewer and time stay as they are, including a dismissed or deleted reminder.
 * A new time or a new interviewer opens it again.
 * A past slot is left alone so a due reminder can still notify.
 */
export function decideInterviewReminder(
  existing: InterviewReminderSnapshot | null,
  desired: InterviewReminderDesired,
  nowMs: number,
): InterviewReminderDecision {
  if (desired.scheduledAtMs <= nowMs) return { type: "skip" };
  if (!existing) {
    return {
      type: "upsert",
      employeeId: desired.employeeId,
      scheduledAtMs: desired.scheduledAtMs,
      title: desired.title,
      note: desired.note,
    };
  }

  const sameSlot =
    existing.employeeId === desired.employeeId &&
    existing.scheduledAtMs === desired.scheduledAtMs;
  if (sameSlot) return { type: "skip" };

  return {
    type: "upsert",
    employeeId: desired.employeeId,
    scheduledAtMs: desired.scheduledAtMs,
    title: desired.title,
    note: desired.note,
  };
}
