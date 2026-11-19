import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { LEAVE_CATEGORIES, LEAVE_PAYS } from "@/modules/attendance/types";
import { LEAVE_REQUEST_STATUSES } from "@/modules/attendance/leave/types";

const leaveDaySchema = new Schema(
  {
    date: { type: String, required: true },
    pay: { type: String, enum: LEAVE_PAYS, required: true },
    category: { type: String, enum: LEAVE_CATEGORIES, required: true },
  },
  { _id: false },
);

const leaveRequestSchema = new Schema(
  {
    employeeId: { type: String, required: true },
    leaveType: { type: String, enum: LEAVE_CATEGORIES, required: true },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: LEAVE_REQUEST_STATUSES, required: true, default: "pending" },
    /** Working days found when the request was filed. The final list is fixed on approval. */
    workingDayCount: { type: Number, required: true, default: 0 },
    days: { type: [leaveDaySchema], default: [] },
    paidDays: { type: Number, default: 0 },
    unpaidDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 },
    requestedBy: { type: String, required: true },
    requestedByName: { type: String, default: "" },
    decidedBy: { type: String, default: null },
    decidedByName: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: "" },
    cancelledBy: { type: String, default: null },
    cancelledByName: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ fromDate: 1, toDate: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

export type LeaveRequestDoc = InferSchemaType<typeof leaveRequestSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

const LeaveRequest =
  (mongoose.models.LeaveRequest as mongoose.Model<LeaveRequestDoc> | undefined) ??
  mongoose.model<LeaveRequestDoc>("LeaveRequest", leaveRequestSchema, "leaveRequests");

export default LeaveRequest;
