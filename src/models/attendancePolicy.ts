import mongoose, { Schema, type InferSchemaType } from "mongoose";

const attendancePolicySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    policyName: { type: String, required: true },
    timezone: { type: String, required: true, default: "Asia/Kolkata" },
    shiftStart: { type: String, required: true },
    shiftEnd: { type: String, required: true },
    graceMinutes: { type: Number, required: true },
    weeklyOffDays: { type: [Number], required: true },
    halfDayLopFactor: { type: Number, required: true },
    lateCreatesLop: { type: Boolean, required: true, default: false },
    lateLopFactor: { type: Number, required: true, default: 0 },
    cutoffTime: { type: String, required: true },
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
