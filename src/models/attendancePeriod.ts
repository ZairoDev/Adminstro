import mongoose, { Schema, type InferSchemaType } from "mongoose";

const policySnapshotSchema = new Schema(
  {
    policyId: { type: String, default: null },
    policyName: { type: String, required: true },
    shiftStart: { type: String, required: true },
    shiftEnd: { type: String, required: true },
    graceMinutes: { type: Number, required: true },
    weeklyOffDays: { type: [Number], required: true },
    halfDayLopFactor: { type: Number, required: true },
    lateCreatesLop: { type: Boolean, required: true },
    lateLopFactor: { type: Number, required: true },
    cutoffTime: { type: String, required: true },
    confirmed: { type: Boolean, required: true },
  },
  { _id: false },
);

const attendancePeriodSchema = new Schema(
  {
    monthKey: { type: String, required: true, unique: true },
    status: { type: String, enum: ["open", "finalized"], required: true, default: "open" },
    finalizedAt: { type: Date, default: null },
    finalizedBy: { type: String, default: null },
    finalizedByName: { type: String, default: "" },
    policySnapshot: { type: policySnapshotSchema, default: null },
    reopenedAt: { type: Date, default: null },
    reopenedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export type AttendancePeriodDoc = InferSchemaType<typeof attendancePeriodSchema> & {
  _id: mongoose.Types.ObjectId;
};

const AttendancePeriod =
  (mongoose.models.AttendancePeriod as mongoose.Model<AttendancePeriodDoc> | undefined) ??
  mongoose.model<AttendancePeriodDoc>(
    "AttendancePeriod",
    attendancePeriodSchema,
    "attendancePeriods",
  );

export default AttendancePeriod;
