import { z } from "zod";
import { LEAVE_CATEGORIES } from "@/modules/attendance/types";
import { LEAVE_REQUEST_STATUSES } from "@/modules/attendance/leave/types";

const dateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const objectIdSchema = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const leaveRangeSchema = z.object({
  /** Leave on behalf of someone else. Leave it out to apply for yourself. */
  employeeId: objectIdSchema.optional(),
  /** The applicant must choose this explicitly. There is no default. */
  leaveType: z.enum(LEAVE_CATEGORIES),
  fromDate: dateSchema,
  toDate: dateSchema,
});

export const leaveApplySchema = leaveRangeSchema.extend({
  reason: z.string().trim().min(3, "Give a short reason").max(500),
  /** HR and admins filing for someone else can approve in the same step. */
  approveNow: z.boolean().optional().default(false),
});

export const leaveDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional().default(""),
});

export const leaveListQuerySchema = z.object({
  scope: z.enum(["mine", "all"]).optional().default("mine"),
  status: z.enum(LEAVE_REQUEST_STATUSES).optional(),
  leaveType: z.enum(LEAVE_CATEGORIES).optional(),
  month: monthSchema.optional(),
  employeeId: objectIdSchema.optional(),
});

export const leaveBalanceQuerySchema = z.object({
  employeeId: objectIdSchema.optional(),
});

export const leaveBalanceAdjustSchema = z.object({
  employeeId: objectIdSchema,
  days: z
    .number()
    .refine((value) => value !== 0, "Enter a number of days other than zero")
    .refine((value) => Math.abs(value) <= 60, "Adjust by at most 60 days at a time"),
  reason: z.string().trim().min(3, "Give a reason").max(300),
});

export type LeaveRangeInput = z.infer<typeof leaveRangeSchema>;
export type LeaveApplyInput = z.infer<typeof leaveApplySchema>;
export type LeaveDecisionInput = z.infer<typeof leaveDecisionSchema>;
export type LeaveListQuery = z.infer<typeof leaveListQuerySchema>;
export type LeaveBalanceAdjustInput = z.infer<typeof leaveBalanceAdjustSchema>;
