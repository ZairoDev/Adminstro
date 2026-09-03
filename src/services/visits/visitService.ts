import { Types } from "mongoose";
import Visits from "@/models/visit";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { assertCanAccessVisit, type VisitActor } from "@/lib/visits/visitAuth";
import {
  ACTIVE_VISIT_STATUSES,
  assertTransitionAllowed,
  combineScheduleDateTime,
  getVisitCloseCutoffDate,
  getVisitDaysOverdue,
  isVisitOverdue,
  normalizeLegacyVisitStatus,
  VISIT_STATUS_LOCK_START,
  VISIT_STATUSES,
  VisitNotFoundError,
  type VisitScheduleSlot,
  type VisitStatus,
  type VisitStatusSource,
} from "@/lib/visits/visitStatus";
import type { OverdueVisitSummary } from "@/lib/visits/overdueVisit";

export interface StatusHistoryEntry {
  from: VisitStatus | string;
  to: VisitStatus;
  at: Date;
  by: string;
  source: VisitStatusSource;
  reason?: string;
}

export interface ScheduleHistoryEntry {
  date: Date;
  time: string;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

export interface VisitDocument {
  _id: Types.ObjectId;
  VSID?: string;
  ownerName?: string;
  ownerPhone?: string;
  visitType?: string;
  agentName?: string;
  agentPhone?: string;
  visitStatus: string;
  schedule?: VisitScheduleSlot[];
  scheduleHistory?: ScheduleHistoryEntry[];
  statusHistory?: StatusHistoryEntry[];
  createdBy?: string;
  createdAt?: Date;
  outcome?: string;
  outcomeReason?: string;
  rejectionReason?: string;
  completedAt?: Date;
  completedBy?: string;
  completionSource?: VisitStatusSource;
  lead?:
    | Types.ObjectId
    | {
        _id?: Types.ObjectId | string;
        name?: string;
        phoneNo?: string | number;
      };
}

export interface RescheduleVisitInput {
  visitId: string;
  date: Date;
  time: string;
  reason?: string;
  actor: VisitActor;
}

export interface CompleteVisitInput {
  visitId: string;
  reason?: string;
  actor: VisitActor;
  source?: VisitStatusSource;
}

export interface CancelVisitInput {
  visitId: string;
  reason: string;
  actor: VisitActor;
}

export interface NoShowVisitInput {
  visitId: string;
  reason: string;
  actor: VisitActor;
}

function buildStatusHistoryEntry(
  from: string,
  to: VisitStatus,
  actor: VisitActor,
  source: VisitStatusSource,
  reason?: string,
): StatusHistoryEntry {
  return {
    from,
    to,
    at: new Date(),
    by: actor.email,
    source,
    ...(reason ? { reason } : {}),
  };
}

function normalizeVisitStatusForRead(visit: VisitDocument): VisitStatus {
  return normalizeLegacyVisitStatus(visit.visitStatus);
}

export async function getVisitByIdOrThrow(visitId: string): Promise<VisitDocument> {
  await connectDb();
  const visit = await Visits.findById(visitId).lean<VisitDocument>();
  if (!visit) throw new VisitNotFoundError();
  return visit;
}

export async function transitionVisitStatus(
  visit: VisitDocument,
  to: VisitStatus,
  actor: VisitActor,
  source: VisitStatusSource,
  reason?: string,
): Promise<VisitDocument> {
  const from = normalizeVisitStatusForRead(visit);
  assertTransitionAllowed(from, to);

  const update: Record<string, unknown> = {
    visitStatus: to,
    $push: {
      statusHistory: buildStatusHistoryEntry(from, to, actor, source, reason),
    },
  };

  if (to === "completed") {
    update.completedAt = new Date();
    update.completedBy = actor.email;
    update.completionSource = source;
    update.outcome = "none";
  }

  const updated = await Visits.findByIdAndUpdate(visit._id, update, {
    new: true,
  }).lean<VisitDocument>();

  if (!updated) throw new VisitNotFoundError();
  return updated;
}

export async function rescheduleVisit(
  input: RescheduleVisitInput,
): Promise<VisitDocument> {
  const visit = await getVisitByIdOrThrow(input.visitId);
  assertCanAccessVisit(visit, input.actor);

  const currentStatus = normalizeVisitStatusForRead(visit);
  if (currentStatus === "completed") {
    throw new Error("Completed visits cannot be rescheduled");
  }

  const scheduledAt = combineScheduleDateTime(input.date, input.time);
  if (scheduledAt.getTime() <= Date.now()) {
    throw new Error("Reschedule date and time must be in the future");
  }

  const currentSlot = visit.schedule?.[0];
  const scheduleHistoryEntry: ScheduleHistoryEntry | null = currentSlot
    ? {
        date: new Date(currentSlot.date),
        time: currentSlot.time,
        changedAt: new Date(),
        changedBy: input.actor.email,
        ...(input.reason ? { reason: input.reason } : {}),
      }
    : null;

  const update: Record<string, unknown> = {
    visitStatus: "rescheduled",
    schedule: [{ date: input.date, time: input.time }],
    $push: {
      statusHistory: buildStatusHistoryEntry(
        currentStatus,
        "rescheduled",
        input.actor,
        "manual",
        input.reason,
      ),
      ...(scheduleHistoryEntry ? { scheduleHistory: scheduleHistoryEntry } : {}),
    },
  };

  const updated = await Visits.findByIdAndUpdate(visit._id, update, {
    new: true,
  }).lean<VisitDocument>();

  if (!updated) throw new VisitNotFoundError();
  return updated;
}

export async function completeVisit(
  input: CompleteVisitInput,
): Promise<VisitDocument> {
  const visit = await getVisitByIdOrThrow(input.visitId);
  assertCanAccessVisit(visit, input.actor);

  return transitionVisitStatus(
    visit,
    "completed",
    input.actor,
    input.source ?? "manual",
    input.reason,
  );
}

export async function cancelVisit(input: CancelVisitInput): Promise<VisitDocument> {
  const visit = await getVisitByIdOrThrow(input.visitId);
  assertCanAccessVisit(visit, input.actor);

  const currentStatus = normalizeVisitStatusForRead(visit);
  assertTransitionAllowed(currentStatus, "completed");

  const updated = await Visits.findByIdAndUpdate(
    visit._id,
    {
      visitStatus: "completed",
      outcome: "cancelled",
      outcomeReason: input.reason,
      rejectionReason: input.reason,
      completedAt: new Date(),
      completedBy: input.actor.email,
      completionSource: "manual",
      $push: {
        statusHistory: buildStatusHistoryEntry(
          currentStatus,
          "completed",
          input.actor,
          "manual",
          input.reason,
        ),
      },
    },
    { new: true },
  ).lean<VisitDocument>();

  if (!updated) throw new VisitNotFoundError();
  return updated;
}

export async function noShowVisit(input: NoShowVisitInput): Promise<VisitDocument> {
  const visit = await getVisitByIdOrThrow(input.visitId);
  assertCanAccessVisit(visit, input.actor);

  const currentStatus = normalizeVisitStatusForRead(visit);
  assertTransitionAllowed(currentStatus, "completed");

  const updated = await Visits.findByIdAndUpdate(
    visit._id,
    {
      visitStatus: "completed",
      outcome: "no_show",
      outcomeReason: input.reason,
      completedAt: new Date(),
      completedBy: input.actor.email,
      completionSource: "manual",
      $push: {
        statusHistory: buildStatusHistoryEntry(
          currentStatus,
          "completed",
          input.actor,
          "manual",
          input.reason,
        ),
      },
    },
    { new: true },
  ).lean<VisitDocument>();

  if (!updated) throw new VisitNotFoundError();
  return updated;
}

function mapLeadForOverdue(
  lead: VisitDocument["lead"],
): OverdueVisitSummary["lead"] | undefined {
  if (!lead || typeof lead !== "object" || !("name" in lead)) return undefined;
  const id = lead._id ? String(lead._id) : "";
  return {
    _id: id,
    name: lead.name ?? "",
    phoneNo: lead.phoneNo ?? "",
  };
}

export async function getOverdueVisitsForUser(
  email: string,
): Promise<OverdueVisitSummary[]> {
  if (!email) return [];

  await connectDb();
  const cutoff = getVisitCloseCutoffDate();

  const visits = await Visits.find({
    createdBy: email,
    visitStatus: { $in: ACTIVE_VISIT_STATUSES },
    createdAt: { $gte: VISIT_STATUS_LOCK_START },
    "schedule.date": { $lte: cutoff },
  })
    .populate({
      path: "lead",
      select: "name phoneNo",
      model: Query,
    })
    .sort({ "schedule.date": 1 })
    .lean<VisitDocument[]>();

  return visits
    .filter((visit) =>
      isVisitOverdue(
        normalizeLegacyVisitStatus(visit.visitStatus),
        visit.schedule,
        visit.createdAt,
      ),
    )
    .map((visit) => {
      const visitStatus = normalizeLegacyVisitStatus(visit.visitStatus);
      return {
        _id: visit._id.toString(),
        VSID: visit.VSID ?? "",
        ownerName: visit.ownerName ?? "",
        ownerPhone: visit.ownerPhone ?? "",
        visitType: visit.visitType ?? "",
        agentName: visit.agentName ?? "",
        agentPhone: visit.agentPhone ?? "",
        visitStatus,
        schedule: visit.schedule ?? [],
        createdBy: visit.createdBy ?? email,
        daysOverdue: getVisitDaysOverdue(visitStatus, visit.schedule, visit.createdAt),
        lead: mapLeadForOverdue(visit.lead),
      };
    });
}

export function matchesVisitCategory(
  visitStatus: string,
  visitCategory: string,
): boolean {
  const normalized = normalizeLegacyVisitStatus(visitStatus);

  if (visitCategory === "all") {
    return (VISIT_STATUSES as readonly string[]).includes(normalized);
  }

  return normalized === visitCategory;
}
