import { z } from "zod";
import mongoose from "mongoose";
import {
  VISIT_OUTCOMES,
  VISIT_STATUSES,
  VISIT_STATUS_SOURCES,
} from "@/lib/visits/visitStatus";

const ScheduleSlotSchema = z.object({
  date: z.coerce.date(),
  time: z.string().min(1),
});

const ScheduleHistorySchema = z.object({
  date: z.coerce.date(),
  time: z.string(),
  changedAt: z.coerce.date(),
  changedBy: z.string(),
  reason: z.string().optional(),
});

const StatusHistorySchema = z.object({
  from: z.string(),
  to: z.enum(VISIT_STATUSES),
  at: z.coerce.date(),
  by: z.string(),
  source: z.enum(VISIT_STATUS_SOURCES),
  reason: z.string().optional(),
});

export const VisitStatusSchema = z.enum(VISIT_STATUSES);
export const VisitOutcomeSchema = z.enum(VISIT_OUTCOMES);

export const RescheduleVisitSchema = z.object({
  date: z.coerce.date(),
  time: z.string().min(1, "Time is required"),
  reason: z.string().optional(),
});

export const CompleteVisitSchema = z.object({
  reason: z.string().optional(),
});

export const CancelVisitSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

export const NoShowVisitSchema = z.object({
  reason: z.string().min(1, "No-show reason is required"),
});

const VisitSchema = z.object({
  lead: z.instanceof(mongoose.Schema.Types.ObjectId),
  propertyId: z.string(),
  VSID: z.string(),
  ownerName: z.string(),
  ownerPhone: z.string(),
  ownerEmail: z.string(),
  propertyDesc: z.string().optional(),
  schedule: z.array(ScheduleSlotSchema),
  scheduleHistory: z.array(ScheduleHistorySchema).optional(),
  visitType: z.enum(["physical", "virtual"]),
  agentName: z.string(),
  agentPhone: z.string(),
  pitchAmount: z.number(),
  vsFinal: z.number().optional(),
  ownerCommission: z.number(),
  travellerCommission: z.number(),
  agentCommission: z.number(),
  rejectionReason: z.string().optional(),
  documentationCharges: z.number(),
  visitStatus: VisitStatusSchema,
  statusHistory: z.array(StatusHistorySchema).optional(),
  outcome: VisitOutcomeSchema.optional(),
  outcomeReason: z.string().optional(),
  completedAt: z.coerce.date().optional(),
  completedBy: z.string().optional(),
  completionSource: z.enum(VISIT_STATUS_SOURCES).optional(),
  reason: z.string().optional(),
  note: z.string().optional(),
  createdBy: z.string(),
});

export type VisitValidationSchema = z.infer<typeof VisitSchema>;
