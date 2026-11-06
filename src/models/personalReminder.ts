import mongoose, { Schema, Document } from "mongoose";

export type PersonalReminderStatus = "pending" | "sent" | "cancelled";

export interface IPersonalReminder extends Document {
  employeeId: mongoose.Types.ObjectId;
  title: string;
  note: string;
  scheduledAt: Date;
  status: PersonalReminderStatus;
  emailSentAt: Date | null;
  dismissedAt: Date | null;
  whatsappConversationId?: mongoose.Types.ObjectId | null;
  leadQueryId?: mongoose.Types.ObjectId | null;
  source?: "manual" | "interview";
  candidateId?: mongoose.Types.ObjectId | null;
  interviewRound?: "first" | "second" | null;
  createdAt: Date;
  updatedAt: Date;
}

const personalReminderSchema = new Schema<IPersonalReminder>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "cancelled"],
      default: "pending",
      index: true,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
    whatsappConversationId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      default: null,
      index: true,
    },
    leadQueryId: {
      type: Schema.Types.ObjectId,
      ref: "Query",
      default: null,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "interview"],
      default: "manual",
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
    },
    interviewRound: {
      type: String,
      enum: ["first", "second"],
      default: null,
    },
  },
  { timestamps: true },
);

personalReminderSchema.index({ employeeId: 1, scheduledAt: 1 });
personalReminderSchema.index({ status: 1, scheduledAt: 1, emailSentAt: 1 });
personalReminderSchema.index(
  { candidateId: 1, interviewRound: 1 },
  { unique: true, partialFilterExpression: { source: "interview" } },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.PersonalReminder) {
  mongoose.deleteModel("PersonalReminder");
}

const PersonalReminder =
  mongoose.models.PersonalReminder ||
  mongoose.model<IPersonalReminder>("PersonalReminder", personalReminderSchema);

export default PersonalReminder;
