import mongoose, { Schema, type InferSchemaType } from "mongoose";

const snapshotSchema = new Schema(
  {
    status: { type: String, required: true },
    isLate: { type: Boolean, required: true },
    lateByMinutes: { type: Number, required: true },
    leavePay: { type: String, default: null },
    firstLoginAt: { type: Date, default: null },
    remarks: { type: String, default: "" },
  },
  { _id: false },
);

const attendanceAuditLogSchema = new Schema(
  {
    attendanceRecordId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    attendanceDate: { type: String, required: true },
    changedBy: { type: String, required: true },
    changedByName: { type: String, default: "" },
    oldValues: { type: snapshotSchema, required: true },
    newValues: { type: snapshotSchema, required: true },
    reason: { type: String, required: true },
    approvedBy: { type: String, default: null },
    approvedByName: { type: String, default: null },
  },
  { timestamps: true },
);

export type AttendanceAuditLogDoc = InferSchemaType<typeof attendanceAuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

const AttendanceAuditLog =
  (mongoose.models.AttendanceAuditLog as mongoose.Model<AttendanceAuditLogDoc> | undefined) ??
  mongoose.model<AttendanceAuditLogDoc>(
    "AttendanceAuditLog",
    attendanceAuditLogSchema,
    "attendanceAuditLogs",
  );

export default AttendanceAuditLog;
