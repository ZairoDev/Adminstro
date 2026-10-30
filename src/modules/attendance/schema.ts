import { z } from "zod";
import { ATTENDANCE_STATUSES, LEAVE_PAYS } from "@/modules/attendance/types";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dateSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);
const weekdaySchema = z.number().int().min(0).max(6);

export const monthQuerySchema = z.object({
  month: monthSchema,
  department: z.string().trim().optional().default(""),
  search: z.string().trim().optional().default(""),
  card: z
    .enum(["", "present", "absent", "on_leave", "late", "pending", "lop"])
    .optional()
    .default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const employeeMonthQuerySchema = z.object({
  month: monthSchema,
});

export const dayQuerySchema = z.object({
  employeeId: z.string().trim().min(1),
  date: dateSchema,
});

export const reconcileSchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

export const periodSchema = z.object({
  month: monthSchema,
});

export const correctionSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
  leavePay: z.enum(LEAVE_PAYS).nullable().optional(),
  firstLoginTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  remarks: z.string().trim().max(500).optional().default(""),
  reason: z.string().trim().min(3).max(500),
});

export const policyUpdateSchema = z.object({
  policyName: z.string().trim().min(2).max(80),
  shiftStart: clockSchema,
  shiftEnd: clockSchema,
  graceMinutes: z.number().int().min(0).max(180),
  weeklyOffDays: z.array(weekdaySchema).max(7),
  halfDayLopFactor: z.number().min(0).max(1),
  lateCreatesLop: z.boolean(),
  lateLopFactor: z.number().min(0).max(1),
  cutoffTime: clockSchema,
  confirmed: z.boolean(),
});

export const holidayCreateSchema = z.object({
  date: dateSchema,
  name: z.string().trim().min(2).max(120),
  departmentId: z.string().trim().nullable().optional(),
});

export const departmentShiftSchema = z.object({
  departmentId: z.string().trim().regex(/^[a-f\d]{24}$/i),
  jobPositionId: z.string().trim().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  startTime: clockSchema,
  endTime: clockSchema,
  weeklyOffDays: z.array(weekdaySchema).max(7),
});

export const departmentShiftClearSchema = z.object({
  departmentId: z.string().trim().regex(/^[a-f\d]{24}$/i),
  jobPositionId: z.string().trim().optional().default(""),
});

export const shiftCreateSchema = z.object({
  employeeCode: z.string().trim().min(1).max(120),
  startTime: clockSchema,
  endTime: clockSchema,
  weeklyOffDays: z.array(weekdaySchema).max(7),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.nullable().optional(),
});

export const lopQuerySchema = z.object({
  month: monthSchema,
  employeeId: z.string().trim().min(1),
});

export const exportQuerySchema = monthQuerySchema.omit({ page: true });
