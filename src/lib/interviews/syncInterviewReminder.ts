import mongoose from "mongoose";

import { toInterviewDateKey, type InterviewRound } from "@/lib/calendar/googleCalendar";
import {
  decideInterviewReminder,
  interviewReminderNote,
  interviewReminderTitle,
  interviewStartInstant,
  type InterviewReminderSnapshot,
  type InterviewReminderStatus,
} from "@/lib/interviews/interviewReminder";
import Candidate from "@/models/candidate";
import PersonalReminder from "@/models/personalReminder";

export interface InterviewReminderWrite {
  employeeId: string;
  candidateId: string;
  round: InterviewRound;
  candidateName: string;
  position: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewMode: "physical" | "virtual";
  officeName?: string | null;
  googleMeetLink?: string | null;
  notes?: string | null;
}

interface StoredRound {
  scheduledDate?: Date | string | null;
  scheduledTime?: string | null;
  interviewMode?: string | null;
  officeName?: string | null;
  googleMeetLink?: string | null;
  notes?: string | null;
  interviewerEmployeeId?: unknown;
}

function validId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

function snapshotOf(doc: {
  employeeId: unknown;
  scheduledAt: Date;
  status: InterviewReminderStatus;
}): InterviewReminderSnapshot {
  return {
    employeeId: String(doc.employeeId),
    scheduledAtMs: new Date(doc.scheduledAt).getTime(),
    status: doc.status,
  };
}

export async function upsertInterviewReminder(input: InterviewReminderWrite): Promise<void> {
  if (!validId(input.employeeId) || !validId(input.candidateId)) return;
  const scheduledAt = interviewStartInstant(input.scheduledDate, input.scheduledTime);
  if (!scheduledAt) return;

  const title = interviewReminderTitle(input.round, input.candidateName, input.position);
  const note = interviewReminderNote({
    candidateName: input.candidateName,
    position: input.position,
    round: input.round,
    scheduledDate: input.scheduledDate,
    scheduledTime: input.scheduledTime,
    interviewMode: input.interviewMode,
    officeName: input.officeName,
    googleMeetLink: input.googleMeetLink,
    notes: input.notes,
  });
  const candidateId = new mongoose.Types.ObjectId(input.candidateId);
  const existing = await PersonalReminder.findOne({
    source: "interview",
    candidateId,
    interviewRound: input.round,
  });
  const decision = decideInterviewReminder(
    existing ? snapshotOf(existing) : null,
    {
      employeeId: input.employeeId,
      scheduledAtMs: scheduledAt.getTime(),
      title,
      note,
    },
    Date.now(),
  );
  if (decision.type === "skip") return;

  await PersonalReminder.findOneAndUpdate(
    {
      source: "interview",
      candidateId,
      interviewRound: input.round,
    },
    {
      $set: {
        employeeId: new mongoose.Types.ObjectId(decision.employeeId),
        title: decision.title,
        note: decision.note,
        scheduledAt: new Date(decision.scheduledAtMs),
        status: "pending",
        emailSentAt: null,
        dismissedAt: null,
        source: "interview",
        candidateId,
        interviewRound: input.round,
      },
    },
    { upsert: true },
  );
}

export async function cancelInterviewReminder(
  candidateId: string,
  round: InterviewRound,
): Promise<void> {
  if (!validId(candidateId)) return;
  await PersonalReminder.deleteMany({
    source: "interview",
    candidateId: new mongoose.Types.ObjectId(candidateId),
    interviewRound: round,
  });
}

export async function ensureInterviewRemindersForEmployee(employeeId: string): Promise<void> {
  if (!validId(employeeId)) return;

  try {
    const candidates = await Candidate.find({
      status: "interview",
      $or: [
        { "interviewDetails.interviewerEmployeeId": employeeId },
        { "secondRoundInterviewDetails.interviewerEmployeeId": employeeId },
      ],
    })
      .select("name position interviewDetails secondRoundInterviewDetails")
      .lean();

    for (const candidate of candidates) {
      const record = candidate as {
        _id: unknown;
        name?: string;
        position?: string;
        interviewDetails?: StoredRound | null;
        secondRoundInterviewDetails?: StoredRound | null;
      };
      await syncRound(employeeId, String(record._id), record.name, record.position, "first", record.interviewDetails);
      await syncRound(
        employeeId,
        String(record._id),
        record.name,
        record.position,
        "second",
        record.secondRoundInterviewDetails,
      );
    }
  } catch (error: unknown) {
    console.error("Failed to sync interviewer reminders:", error);
  }
}

async function syncRound(
  employeeId: string,
  candidateId: string,
  candidateName: string | undefined,
  position: string | undefined,
  round: InterviewRound,
  details: StoredRound | null | undefined,
): Promise<void> {
  if (!details || String(details.interviewerEmployeeId ?? "") !== employeeId) return;
  const scheduledDate = toInterviewDateKey(details.scheduledDate);
  const scheduledTime = details.scheduledTime?.trim() ?? "";
  if (!scheduledDate || !scheduledTime) return;
  const interviewMode = details.interviewMode === "virtual" ? "virtual" : "physical";
  await upsertInterviewReminder({
    employeeId,
    candidateId,
    round,
    candidateName: candidateName?.trim() || "Candidate",
    position: position?.trim() || "",
    scheduledDate,
    scheduledTime,
    interviewMode,
    officeName: details.officeName,
    googleMeetLink: details.googleMeetLink,
    notes: details.notes,
  });
}
