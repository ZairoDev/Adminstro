import mongoose, { Schema, type Types } from "mongoose";
import { MAILBOX_KEYS } from "@/lib/email/mailbox-config";

export interface IEmailMailbox {
  _id: Types.ObjectId;
  key: (typeof MAILBOX_KEYS)[number];
  loginEmail: string;
  fromEmail: string;
  connectedEmails: string[];
  appPasswordCipher: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const emailMailboxSchema = new Schema<IEmailMailbox>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: [...MAILBOX_KEYS],
    },
    loginEmail: { type: String, required: true, lowercase: true, trim: true },
    fromEmail: { type: String, required: true, lowercase: true, trim: true },
    connectedEmails: { type: [String], default: [] },
    appPasswordCipher: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

const EmailMailbox =
  mongoose.models.EmailMailbox ||
  mongoose.model<IEmailMailbox>("EmailMailbox", emailMailboxSchema);

export default EmailMailbox;
