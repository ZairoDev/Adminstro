import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { DEFAULT_LEAVE_POLICY } from "@/modules/attendance/types";

const attendancePolicySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    policyName: { type: String, required: true },
    timezone: { type: String, required: true, default: "Asia/Kolkata" },
    shiftStart: { type: String, required: true },
    shiftEnd: { type: String, required: true },
    graceMinutes: { type: Number, required: true },
    weeklyOffDays: { type: [Number], required: true },
    alternateSaturdayOff: {
      type: String,
      enum: ["none", "cycle_a", "cycle_b", "first_third", "second_fourth"],
      required: true,
      default: "cycle_a",
    },
    halfDayLopFactor: { type: Number, required: true },
    lateCreatesLop: { type: Boolean, required: true, default: false },
    lateLopFactor: { type: Number, required: true, default: 0.25 },
    lateGraceThresholdCount: { type: Number, required: true, default: 10 },
    severeLateMinutes: { type: Number, required: true, default: 30 },
    cutoffTime: { type: String, required: true },
    paidLeaveMonthlyAccrual: { type: Number, default: DEFAULT_LEAVE_POLICY.paidLeaveMonthlyAccrual, min: 0 },
    paidLeaveCarryForwardCap: { type: Number, default: DEFAULT_LEAVE_POLICY.paidLeaveCarryForwardCap, min: 0 },
    paidLeaveMaxBalance: { type: Number, default: DEFAULT_LEAVE_POLICY.paidLeaveMaxBalance, min: 0 },
    unplannedLeaveLopDays: { type: Number, default: DEFAULT_LEAVE_POLICY.unplannedLeaveLopDays, min: 0 },
    plannedLeaveMinNoticeDays: { type: Number, default: DEFAULT_LEAVE_POLICY.plannedLeaveMinNoticeDays, min: 0 },
    unplannedBackdateDays: { type: Number, default: DEFAULT_LEAVE_POLICY.unplannedBackdateDays, min: 0 },
    leaveAccrualStartMonth: { type: String, default: "" },
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export type AttendancePolicyDoc = InferSchemaType<typeof attendancePolicySchema> & {
  _id: mongoose.Types.ObjectId;
};

const AttendancePolicy =
  (mongoose.models.AttendancePolicy as mongoose.Model<AttendancePolicyDoc> | undefined) ??
  mongoose.model<AttendancePolicyDoc>(
    "AttendancePolicy",
    attendancePolicySchema,
    "attendancePolicies",
  );

export default AttendancePolicy;
