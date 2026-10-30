import mongoose, { Schema, type InferSchemaType } from "mongoose";

const attendanceOrgShiftSchema = new Schema(
  {
    departmentId: { type: String, required: true },
    jobPositionId: { type: String, default: null },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    weeklyOffDays: { type: [Number], required: true },
  },
  { timestamps: true },
);

attendanceOrgShiftSchema.index({ departmentId: 1, jobPositionId: 1 }, { unique: true });

export type AttendanceOrgShiftDoc = InferSchemaType<typeof attendanceOrgShiftSchema> & {
  _id: mongoose.Types.ObjectId;
};

const AttendanceOrgShift =
  (mongoose.models.AttendanceOrgShift as mongoose.Model<AttendanceOrgShiftDoc> | undefined) ??
  mongoose.model<AttendanceOrgShiftDoc>(
    "AttendanceOrgShift",
    attendanceOrgShiftSchema,
    "attendanceOrgShifts",
  );

export default AttendanceOrgShift;
