import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { LEDGER_ENTRY_TYPES } from "@/modules/attendance/leave/types";

/**
 * Append-only paid leave ledger. The balance is the sum of `days`.
 * `idempotencyKey` is unique so a retried accrual or approval can never double-post.
 */
const leaveLedgerSchema = new Schema(
  {
    employeeId: { type: String, required: true },
    monthKey: { type: String, required: true },
    entryType: { type: String, enum: LEDGER_ENTRY_TYPES, required: true },
    days: { type: Number, required: true },
    leaveRequestId: { type: String, default: null },
    attendanceRecordId: { type: String, default: null },
    leaveDate: { type: String, default: null },
    reason: { type: String, default: "" },
    createdBy: { type: String, default: null },
    createdByName: { type: String, default: null },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

leaveLedgerSchema.index({ employeeId: 1, createdAt: -1 });
leaveLedgerSchema.index({ leaveRequestId: 1 }, { sparse: true });
leaveLedgerSchema.index({ attendanceRecordId: 1 }, { sparse: true });

export type LeaveLedgerDoc = InferSchemaType<typeof leaveLedgerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
};

const LeaveLedger =
  (mongoose.models.LeaveLedger as mongoose.Model<LeaveLedgerDoc> | undefined) ??
  mongoose.model<LeaveLedgerDoc>("LeaveLedger", leaveLedgerSchema, "leaveLedger");

export default LeaveLedger;
