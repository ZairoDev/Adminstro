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
  },
  { timestamps: true },
);

personalReminderSchema.index({ employeeId: 1, scheduledAt: 1 });
personalReminderSchema.index({ status: 1, scheduledAt: 1, emailSentAt: 1 });

const PersonalReminder =
  mongoose.models.PersonalReminder ||
  mongoose.model<IPersonalReminder>("PersonalReminder", personalReminderSchema);

export default PersonalReminder;
