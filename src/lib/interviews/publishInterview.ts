import Candidate from "@/models/candidate";
import { sendCustomEmail, sendEmail } from "@/lib/email";
import { JOB_APPLICATION_HR_INBOX } from "@/lib/email/templates/jobApplication";
import {
  getInterviewAssignmentTemplate,
  type InterviewAssignmentEmailInput,
  type InterviewNoticeKind,
} from "@/lib/email/templates/interviewAssignment";
import {
  deleteInterviewEvent,
  toInterviewDateKey,
  upsertInterviewEvent,
  type InterviewMode,
  type InterviewRound,
} from "@/lib/calendar/googleCalendar";
import type { CandidateEmailStatus } from "@/lib/email/types";

const HR_INBOX = JOB_APPLICATION_HR_INBOX;

export interface InterviewPartyNotice {
  candidateId: string;
  round: InterviewRound;
  candidateName: string;
  candidateEmail: string;
  position: string;
  interviewerName: string;
  interviewerEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewMode: InterviewMode;
  officeName?: string | null;
  officeAddress?: string | null;
  googleMapsLink?: string | null;
  notes?: string | null;
  rescheduleLink?: string | null;
  existingEventId?: string | null;
  existingMeetLink?: string | null;
}

interface StoredInterviewRound {
  scheduledDate?: Date | string | null;
  scheduledTime?: string | null;
  interviewMode?: string | null;
  officeName?: string | null;
  interviewerName?: string | null;
  interviewerEmail?: string | null;
  googleEventId?: string | null;
  googleMeetLink?: string | null;
  notes?: string | null;
}

function sameEmail(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function companyName(): string {
  return process.env.COMPANY_NAME || "Zairo International";
}

function candidateStatus(
  round: InterviewRound,
  kind: InterviewNoticeKind
): CandidateEmailStatus {
  if (kind === "rescheduled") {
    return round === "first" ? "interviewRescheduled" : "secondRoundInterviewRescheduled";
  }
  return round === "first" ? "interview" : "secondRoundInterview";
}

function detailPrefix(round: InterviewRound): "interviewDetails" | "secondRoundInterviewDetails" {
  return round === "first" ? "interviewDetails" : "secondRoundInterviewDetails";
}

async function saveCalendarFields(
  candidateId: string,
  round: InterviewRound,
  fields: {
    eventId: string | null;
    meetLink: string | null;
    error: string | null;
  }
): Promise<void> {
  const prefix = detailPrefix(round);
  await Candidate.findByIdAndUpdate(candidateId, {
    $set: {
      [`${prefix}.googleEventId`]: fields.eventId,
      [`${prefix}.googleMeetLink`]: fields.meetLink,
      [`${prefix}.calendarSyncError`]: fields.error,
    },
  });
}

async function deliverNotice(
  notice: InterviewPartyNotice,
  kind: InterviewNoticeKind,
  meetLink: string | null,
  addToCalendarLink: string | null
): Promise<void> {
  const shared = {
    round: notice.round,
    kind,
    candidateName: notice.candidateName,
    position: notice.position,
    interviewerName: notice.interviewerName || "Interviewer",
    interviewerEmail: notice.interviewerEmail,
    scheduledDate: notice.scheduledDate,
    scheduledTime: notice.scheduledTime,
    interviewMode: notice.interviewMode,
    officeName: notice.officeName,
    officeAddress: notice.officeAddress,
    googleMapsLink: notice.googleMapsLink,
    googleMeetLink: meetLink,
    addToCalendarLink,
    notes: notice.notes,
    companyName: companyName(),
  } satisfies Omit<InterviewAssignmentEmailInput, "audience" | "coversHrDuty">;

  if (kind !== "cancelled") {
    await sendEmail({
      to: notice.candidateEmail,
      candidateName: notice.candidateName,
      status: candidateStatus(notice.round, kind),
      position: notice.position,
      companyName: companyName(),
      interviewDetails: {
        scheduledDate: notice.scheduledDate,
        scheduledTime: notice.scheduledTime,
        interviewMode: notice.interviewMode,
        officeName: notice.officeName || undefined,
        officeAddress:
          notice.officeAddress ||
          "Office address will be shared by HR before your visit.",
        googleMapsLink:
          notice.interviewMode === "physical"
            ? notice.googleMapsLink || undefined
            : undefined,
        candidateId: notice.candidateId,
        interviewType: notice.round,
        rescheduleLink: kind === "scheduled" ? notice.rescheduleLink || undefined : undefined,
        interviewerName: notice.interviewerName || undefined,
        googleMeetLink: meetLink || undefined,
        addToCalendarLink: addToCalendarLink || undefined,
      },
    });
  } else {
    await sendCustomEmail(
      notice.candidateEmail,
      getInterviewAssignmentTemplate({
        ...shared,
        audience: "candidate",
      }),
      companyName()
    );
  }

  const interviewerEmail = notice.interviewerEmail.trim();
  const hrIsInterviewer = interviewerEmail
    ? sameEmail(interviewerEmail, HR_INBOX)
    : false;

  if (interviewerEmail) {
    await sendCustomEmail(
      interviewerEmail,
      getInterviewAssignmentTemplate({
        ...shared,
        audience: "interviewer",
        coversHrDuty: hrIsInterviewer,
      }),
      companyName()
    );
  }

  if (!hrIsInterviewer) {
    await sendCustomEmail(
      HR_INBOX,
      getInterviewAssignmentTemplate({
        ...shared,
        audience: "hr",
      }),
      companyName()
    );
  }
}

export async function finalizeScheduledInterview(
  notice: InterviewPartyNotice
): Promise<void> {
  await publishLiveInterview(notice, "scheduled");
}

export async function finalizeRescheduledInterview(
  notice: InterviewPartyNotice
): Promise<void> {
  await publishLiveInterview(notice, "rescheduled");
}

async function publishLiveInterview(
  notice: InterviewPartyNotice,
  kind: Extract<InterviewNoticeKind, "scheduled" | "rescheduled">
): Promise<void> {
  const result = await upsertInterviewEvent({
    eventId: notice.existingEventId,
    existingMeetLink: notice.existingMeetLink,
    round: notice.round,
    candidateName: notice.candidateName,
    candidateEmail: notice.candidateEmail,
    position: notice.position,
    interviewerName: notice.interviewerName || "Interviewer",
    interviewerEmail: notice.interviewerEmail,
    hrEmail: HR_INBOX,
    scheduledDate: notice.scheduledDate,
    scheduledTime: notice.scheduledTime,
    interviewMode: notice.interviewMode,
    officeName: notice.officeName,
    officeAddress: notice.officeAddress,
    notes: notice.notes,
  });

  try {
    await saveCalendarFields(notice.candidateId, notice.round, {
      eventId: result.eventId,
      meetLink: result.meetLink,
      error: result.synced ? null : result.error,
    });
  } catch (error: unknown) {
    console.error("Failed to store interview calendar result:", error);
  }

  await deliverNotice(notice, kind, result.meetLink, result.addToCalendarLink);
}

function readRound(value: unknown): StoredInterviewRound | null {
  if (!value || typeof value !== "object") return null;
  return value as StoredInterviewRound;
}

function asMode(value: string | null | undefined): InterviewMode {
  return value === "virtual" ? "virtual" : "physical";
}

export async function cancelCandidateInterviews(candidate: {
  _id: { toString(): string } | string;
  name: string;
  email: string;
  position: string;
  interviewDetails?: unknown;
  secondRoundInterviewDetails?: unknown;
}): Promise<void> {
  const candidateId = String(candidate._id);
  await cancelRound(candidate, candidateId, "first", readRound(candidate.interviewDetails));
  await cancelRound(
    candidate,
    candidateId,
    "second",
    readRound(candidate.secondRoundInterviewDetails)
  );
}

async function cancelRound(
  candidate: { name: string; email: string; position: string },
  candidateId: string,
  round: InterviewRound,
  details: StoredInterviewRound | null
): Promise<void> {
  if (!details?.scheduledDate) return;

  const scheduledDate = toInterviewDateKey(details.scheduledDate);
  if (!scheduledDate || !details.scheduledTime) return;

  let eventId = details.googleEventId?.trim() || null;
  let calendarSyncError: string | null = null;
  if (eventId) {
    const deleted = await deleteInterviewEvent(eventId);
    if (deleted.deleted) {
      eventId = null;
    } else {
      calendarSyncError = deleted.error;
    }
  }

  try {
    await saveCalendarFields(candidateId, round, {
      eventId,
      meetLink: null,
      error: calendarSyncError,
    });
  } catch (error: unknown) {
    console.error("Failed to store interview cancellation:", error);
  }

  await deliverNotice(
    {
      candidateId,
      round,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      position: candidate.position,
      interviewerName: details.interviewerName || "",
      interviewerEmail: details.interviewerEmail || "",
      scheduledDate,
      scheduledTime: details.scheduledTime,
      interviewMode: asMode(details.interviewMode),
      officeName: details.officeName,
      notes: details.notes,
      existingEventId: details.googleEventId,
    },
    "cancelled",
    null,
    null
  );
}
