import mongoose, { Schema, type InferSchemaType } from "mongoose";

const attendancePayrollSnapshotSchema = new Schema(
  {
    employeeId: { type: String, required: true },
    monthKey: { type: String, required: true },
    lossOfPayDays: { type: Number, required: true },
    policyId: { type: String, default: null },
    attendanceRecordIds: { type: [String], default: [] },
    slipNumber: { type: String, required: true },
    generatedBy: { type: String, default: null },
    payrollStale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

attendancePayrollSnapshotSchema.index({ employeeId: 1, monthKey: 1, createdAt: -1 });

export type AttendancePayrollSnapshotDoc = InferSchemaType<typeof attendancePayrollSnapshotSchema> & {
  _id: mongoose.Types.ObjectId;
};

const AttendancePayrollSnapshot =
  (mongoose.models.AttendancePayrollSnapshot as
    | mongoose.Model<AttendancePayrollSnapshotDoc>
    | undefined) ??
  mongoose.model<AttendancePayrollSnapshotDoc>(
    "AttendancePayrollSnapshot",
    attendancePayrollSnapshotSchema,
    "attendancePayrollSnapshots",
  );

export default AttendancePayrollSnapshot;
