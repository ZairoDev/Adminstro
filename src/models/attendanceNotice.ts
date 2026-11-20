import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const ATTENDANCE_NOTICE_KINDS = [
  "leave_requested",
  "leave_approved",
  "leave_rejected",
  "leave_cancelled",
  "missing_login",
  "missing_login_digest",
] as const;

const attendanceNoticeSchema = new Schema(
  {
    recipientId: { type: String, required: true, index: true },
    kind: { type: String, enum: ATTENDANCE_NOTICE_KINDS, required: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 4000 },
    href: { type: String, required: true },
    relatedId: { type: String, default: "" },
    dedupeKey: { type: String, required: true, unique: true },
    readAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
    /** People included in a missing-login digest. */
    subjectIds: { type: [String], default: [] },
    /** Subject ids already included in an email, so a later name sends one follow-up. */
    emailedSubjectIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

attendanceNoticeSchema.index({ recipientId: 1, createdAt: -1 });
attendanceNoticeSchema.index({ emailSentAt: 1, createdAt: -1 });

export type AttendanceNoticeDoc = InferSchemaType<typeof attendanceNoticeSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

const AttendanceNotice =
  (mongoose.models.AttendanceNotice as mongoose.Model<AttendanceNoticeDoc> | undefined) ??
  mongoose.model<AttendanceNoticeDoc>("AttendanceNotice", attendanceNoticeSchema, "attendanceNotices");

export default AttendanceNotice;
