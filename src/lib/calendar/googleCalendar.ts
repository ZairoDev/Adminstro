import { google } from "googleapis";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const INTERVIEW_DURATION_MINUTES = 60;

export type InterviewRound = "first" | "second";
export type InterviewMode = "physical" | "virtual";

export interface InterviewEventInput {
  eventId?: string | null;
  existingMeetLink?: string | null;
  round: InterviewRound;
  candidateName: string;
  candidateEmail: string;
  position: string;
  interviewerName: string;
  interviewerEmail: string;
  hrEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewMode: InterviewMode;
  officeName?: string | null;
  officeAddress?: string | null;
  notes?: string | null;
}

export interface CalendarWriteResult {
  synced: boolean;
  eventId: string | null;
  meetLink: string | null;
  error: string | null;
  addToCalendarLink: string | null;
}

interface CalendarEventBody {
  summary: string;
  description: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: Array<{ email: string }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: "hangoutsMeet" };
    };
  };
}

interface CalendarEventResponse {
  id?: string | null;
  hangoutLink?: string | null;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string | null;
      uri?: string | null;
    }> | null;
  } | null;
}

function calendarTimezone(): string {
  return process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

function privateKey(): string | null {
  const raw = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
  if (!raw?.trim()) return null;
  return raw.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function calendarConfigured(): {
  clientEmail: string;
  key: string;
  subject: string;
} | null {
  const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL?.trim();
  const key = privateKey();
  const subject = process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL?.trim();
  if (!clientEmail || !key || !subject) return null;
  return { clientEmail, key, subject };
}

export function interviewTitle(round: InterviewRound, candidateName: string, position: string): string {
  const prefix = round === "second" ? "Second round interview" : "Interview";
  return `${prefix}: ${candidateName} — ${position}`;
}

export function interviewWindow(
  date: string,
  time: string
): { start: string; end: string } {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) {
    throw new Error("Invalid interview date or time");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new Error("Invalid interview date or time");
  }

  const start = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const totalMinutes = hour * 60 + minute + INTERVIEW_DURATION_MINUTES;
  const extraDays = Math.floor(totalMinutes / (24 * 60));
  const endMinutes = totalMinutes % (24 * 60);
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  const endUtc = new Date(Date.UTC(year, month - 1, day + extraDays));
  const endDate = `${endUtc.getUTCFullYear()}-${String(endUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(endUtc.getUTCDate()).padStart(2, "0")}`;
  const end = `${endDate}T${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`;
  return { start, end };
}

export function toInterviewDateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    if (match) return match[1];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return localDateKey(parsed);
  }
  if (Number.isNaN(value.getTime())) return null;
  return localDateKey(value);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compactDateTime(local: string): string {
  return local.replace(/[-:]/g, "");
}

export function buildAddToCalendarLink(input: {
  title: string;
  scheduledDate: string;
  scheduledTime: string;
  details: string;
  location?: string | null;
}): string {
  const { start, end } = interviewWindow(input.scheduledDate, input.scheduledTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${compactDateTime(start)}/${compactDateTime(end)}`,
    details: input.details,
    ctz: calendarTimezone(),
  });
  if (input.location?.trim()) {
    params.set("location", input.location.trim());
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function eventDescription(input: InterviewEventInput, meetLink: string | null): string {
  const lines = [
    `${input.interviewerName} has to take this interview.`,
    `${input.candidateName} has to give this interview.`,
    "HR is responsible for this interview.",
    "",
    `Position: ${input.position}`,
    `Mode: ${input.interviewMode === "virtual" ? "Virtual" : "Physical"}`,
  ];
  if (input.interviewMode === "physical" && input.officeAddress) {
    lines.push(`Office: ${input.officeName ? `${input.officeName}, ` : ""}${input.officeAddress}`);
  }
  if (meetLink) {
    lines.push(`Google Meet: ${meetLink}`);
  }
  if (input.notes?.trim()) {
    lines.push("", `Notes: ${input.notes.trim()}`);
  }
  return lines.join("\n");
}

function attendeeEmails(input: InterviewEventInput): Array<{ email: string }> {
  const seen = new Set<string>();
  const attendees: Array<{ email: string }> = [];
  for (const email of [input.interviewerEmail, input.candidateEmail, input.hrEmail]) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    attendees.push({ email: email.trim() });
  }
  return attendees;
}

function eventLocation(input: InterviewEventInput, meetLink: string | null): string | undefined {
  if (input.interviewMode === "physical") {
    return input.officeAddress?.trim() || undefined;
  }
  return meetLink?.trim() || undefined;
}

function buildEventBody(input: InterviewEventInput, meetLink: string | null, createMeet: boolean): CalendarEventBody {
  const { start, end } = interviewWindow(input.scheduledDate, input.scheduledTime);
  const timeZone = calendarTimezone();
  const location = eventLocation(input, meetLink);
  return {
    summary: interviewTitle(input.round, input.candidateName, input.position),
    description: eventDescription(input, meetLink),
    ...(location ? { location } : {}),
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
    attendees: attendeeEmails(input),
    ...(createMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: `${input.round}-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

function meetLinkFromEvent(event: CalendarEventResponse): string | null {
  const video = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video" && entry.uri
  );
  return video?.uri || event.hangoutLink || null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 500);
  return "Google Calendar request failed";
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: number | string; response?: { status?: number } };
  return candidate.code === 404 || candidate.code === "404" || candidate.response?.status === 404;
}

function safeCalendarLink(input: InterviewEventInput, meetLink: string | null): string | null {
  try {
    return buildAddToCalendarLink({
      title: interviewTitle(input.round, input.candidateName, input.position),
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      details: eventDescription(input, meetLink),
      location: eventLocation(input, meetLink),
    });
  } catch {
    return null;
  }
}

export async function upsertInterviewEvent(input: InterviewEventInput): Promise<CalendarWriteResult> {
  const config = calendarConfigured();
  const fallbackLink = safeCalendarLink(input, input.existingMeetLink ?? null);
  if (!config) {
    return {
      synced: false,
      eventId: input.eventId ?? null,
      meetLink: input.existingMeetLink ?? null,
      error: "Google Calendar is not configured",
      addToCalendarLink: fallbackLink,
    };
  }

  try {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.key,
      scopes: [CALENDAR_SCOPE],
      subject: config.subject,
    });
    const calendar = google.calendar({ version: "v3", auth });
    const createMeet = input.interviewMode === "virtual" && !input.existingMeetLink;
    const requestBody = buildEventBody(input, input.existingMeetLink ?? null, createMeet);
    let event: CalendarEventResponse | undefined;

    if (input.eventId) {
      try {
        const updated = await calendar.events.patch({
          calendarId: "primary",
          eventId: input.eventId,
          requestBody,
          sendUpdates: "none",
          conferenceDataVersion: createMeet ? 1 : 0,
        });
        event = updated.data;
      } catch (error: unknown) {
        if (!isNotFound(error)) throw error;
      }
    }

    if (!event) {
      const created = await calendar.events.insert({
        calendarId: "primary",
        requestBody,
        sendUpdates: "none",
        conferenceDataVersion: createMeet ? 1 : 0,
      });
      event = created.data;
    }

    const meetLink = meetLinkFromEvent(event) || input.existingMeetLink || null;
    return {
      synced: true,
      eventId: event.id ?? input.eventId ?? null,
      meetLink,
      error: null,
      addToCalendarLink: safeCalendarLink(input, meetLink),
    };
  } catch (error: unknown) {
    console.error("Google Calendar sync failed:", error);
    return {
      synced: false,
      eventId: input.eventId ?? null,
      meetLink: input.existingMeetLink ?? null,
      error: errorMessage(error),
      addToCalendarLink: fallbackLink,
    };
  }
}

export async function deleteInterviewEvent(
  eventId: string
): Promise<{ deleted: boolean; error: string | null }> {
  const config = calendarConfigured();
  if (!config) {
    return { deleted: false, error: "Google Calendar is not configured" };
  }

  try {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.key,
      scopes: [CALENDAR_SCOPE],
      subject: config.subject,
    });
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "none",
    });
    return { deleted: true, error: null };
  } catch (error: unknown) {
    if (isNotFound(error)) return { deleted: true, error: null };
    console.error("Google Calendar delete failed:", error);
    return { deleted: false, error: errorMessage(error) };
  }
}
