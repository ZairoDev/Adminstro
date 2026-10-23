import { EmailTemplate } from "../types";
import { parseLocalDateString } from "@/lib/utils";
import type { InterviewMode, InterviewRound } from "@/lib/calendar/googleCalendar";

export type InterviewNoticeKind = "scheduled" | "rescheduled" | "cancelled";
export type InterviewNoticeAudience = "interviewer" | "hr" | "candidate";

export interface InterviewAssignmentEmailInput {
  audience: InterviewNoticeAudience;
  kind: InterviewNoticeKind;
  round: InterviewRound;
  candidateName: string;
  position: string;
  interviewerName: string;
  interviewerEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewMode: InterviewMode;
  officeName?: string | null;
  officeAddress?: string | null;
  googleMapsLink?: string | null;
  googleMeetLink?: string | null;
  addToCalendarLink?: string | null;
  notes?: string | null;
  companyName: string;
  /** Interviewer address is the HR inbox, so this mail covers both roles. */
  coversHrDuty?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateLabel(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || "TBD";
  return parseLocalDateString(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function roundLabel(round: InterviewRound): string {
  return round === "second" ? "second round interview" : "interview";
}

export function getInterviewAssignmentTemplate(
  input: InterviewAssignmentEmailInput
): EmailTemplate {
  const roundText = roundLabel(input.round);
  const dateLabel = formatDateLabel(input.scheduledDate);
  const timeLabel = input.scheduledTime || "TBD";
  const candidate = escapeHtml(input.candidateName);
  const interviewer = escapeHtml(input.interviewerName);
  const position = escapeHtml(input.position);
  const company = escapeHtml(input.companyName);

  const instruction = instructionCopy(input, roundText);
  const subject = subjectCopy(input, roundText);

  const venue = venueHtml(input);
  const calendar =
    input.kind !== "cancelled" && input.addToCalendarLink
      ? `<p style="margin: 24px 0;"><a href="${escapeHtml(input.addToCalendarLink)}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Add to Google Calendar</a></p>`
      : "";
  const notes = input.notes?.trim()
    ? `<p><strong>Notes:</strong> ${escapeHtml(input.notes.trim())}</p>`
    : "";

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
        <p>${instruction}</p>
        <p>
          <strong>Candidate:</strong> ${candidate}<br/>
          <strong>Position:</strong> ${position}<br/>
          <strong>Interviewer:</strong> ${interviewer}<br/>
          <strong>Date:</strong> ${escapeHtml(dateLabel)}<br/>
          <strong>Time:</strong> ${escapeHtml(timeLabel)}<br/>
          <strong>Mode:</strong> ${input.interviewMode === "virtual" ? "Virtual" : "Physical (in office)"}
        </p>
        ${venue}
        ${notes}
        ${calendar}
        <p style="font-size: 13px; color: #6b7280;">${company}</p>
      </div>
    `,
  };
}

function instructionCopy(input: InterviewAssignmentEmailInput, roundText: string): string {
  const candidate = escapeHtml(input.candidateName);
  const interviewer = escapeHtml(input.interviewerName);
  if (input.kind === "cancelled") {
    if (input.audience === "hr") {
      return `This ${roundText} has been cancelled. ${interviewer} no longer has to take it, and ${candidate} no longer has to give it.`;
    }
    if (input.audience === "candidate") {
      return `This ${roundText} has been cancelled. You no longer have to give this interview.`;
    }
    return `This ${roundText} has been cancelled. You no longer have to take this interview with ${candidate}.`;
  }

  const changed = input.kind === "rescheduled" ? `The ${roundText} time has changed. ` : "";
  if (input.audience === "hr") {
    return `${changed}You are responsible for this ${roundText}. ${interviewer} has to take this interview. ${candidate} has to give this interview.`;
  }
  const hrDuty = input.coversHrDuty
    ? " You are also responsible for this interview as HR."
    : "";
  return `${changed}You have to take this ${roundText} with ${candidate}.${hrDuty}`;
}

function subjectCopy(input: InterviewAssignmentEmailInput, roundText: string): string {
  const name = input.candidateName;
  if (input.kind === "cancelled") {
    if (input.audience === "candidate") return `Your ${roundText} has been cancelled`;
    return `Interview cancelled — ${name}`;
  }
  if (input.audience === "hr") {
    return input.kind === "rescheduled"
      ? `Interview time updated — ${name} has to give this interview`
      : `Interview booked — ${name} has to give this interview`;
  }
  return input.kind === "rescheduled"
    ? `Interview time updated — you have to take this ${roundText}`
    : `You have to take this ${roundText} — ${name}`;
}

function venueHtml(input: InterviewAssignmentEmailInput): string {
  if (input.kind === "cancelled") return "";
  if (input.interviewMode === "virtual") {
    if (!input.googleMeetLink) {
      return `<p>This is a virtual interview. A Google Meet link will be added when the company calendar is connected.</p>`;
    }
    const link = escapeHtml(input.googleMeetLink);
    return `<p><a href="${link}">Join Google Meet</a></p>`;
  }
  const office = escapeHtml(
    [input.officeName, input.officeAddress].filter(Boolean).join(" — ") ||
      "Office address will be shared by HR."
  );
  const maps = input.googleMapsLink
    ? `<p><a href="${escapeHtml(input.googleMapsLink)}">View location on Google Maps</a></p>`
    : "";
  return `<p><strong>Office:</strong> ${office}</p>${maps}`;
}
