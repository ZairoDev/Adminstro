import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ATTENDANCE_STATUSES, LEAVE_CATEGORIES } from "@/modules/attendance/types";

const attendanceRecordSchema = new Schema(
  {
    employeeId: { type: String, required: true },
    attendanceDate: { type: String, required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    isLate: { type: Boolean, default: false },
    lateByMinutes: { type: Number, default: 0 },
    leavePay: { type: String, enum: ["paid", "unpaid", null], default: null },
    leaveCategory: { type: String, enum: [...LEAVE_CATEGORIES, null], default: null },
    leaveRequestId: { type: String, default: null },
    firstLoginAt: { type: Date, default: null },
    /** Last logout of the attendance day (check-out). */
    lastLogoutAt: { type: Date, default: null },
    /** Device used for first check-in: desktop | mobile | system */
    checkInDevice: {
      type: String,
      enum: ["desktop", "mobile", "system"],
      default: null,
    },
    /** Device used for last check-out: desktop | mobile | system */
    checkOutDevice: {
      type: String,
      enum: ["desktop", "mobile", "system"],
      default: null,
    },
    sourceLoginId: { type: String, default: null },
    shiftStartAt: { type: Date, required: true },
    shiftEndAt: { type: Date, required: true },
    source: { type: String, enum: ["login", "manual", "system", "leave"], required: true },
    isManuallyAdjusted: { type: Boolean, default: false },
    anomalyFlags: { type: [String], default: [] },
    remarks: { type: String, default: "" },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

attendanceRecordSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });
attendanceRecordSchema.index({ attendanceDate: 1, status: 1 });
attendanceRecordSchema.index({ employeeId: 1, status: 1 });
attendanceRecordSchema.index({ leaveRequestId: 1 }, { sparse: true });

export type AttendanceRecordDoc = InferSchemaType<typeof attendanceRecordSchema> & {
  _id: mongoose.Types.ObjectId;
};

const AttendanceRecord =
  (mongoose.models.AttendanceRecord as mongoose.Model<AttendanceRecordDoc> | undefined) ??
  mongoose.model<AttendanceRecordDoc>(
    "AttendanceRecord",
    attendanceRecordSchema,
    "attendanceRecords",
  );

export default AttendanceRecord;
