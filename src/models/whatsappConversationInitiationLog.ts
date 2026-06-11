import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppConversationInitiationLog extends Document {
  employeeId: mongoose.Types.ObjectId;
  guestPhone: string;
  /** UTC date key YYYY-MM-DD for daily aggregation */
  dateKey: string;
  conversationId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const initiationLogSchema = new Schema<IWhatsAppConversationInitiationLog>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
      index: true,
    },
    guestPhone: {
      type: String,
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

initiationLogSchema.index(
  { employeeId: 1, guestPhone: 1, dateKey: 1 },
  { unique: true },
);
initiationLogSchema.index({ employeeId: 1, dateKey: 1 });

const WhatsAppConversationInitiationLog =
  mongoose.models.WhatsAppConversationInitiationLog ||
  mongoose.model<IWhatsAppConversationInitiationLog>(
    "WhatsAppConversationInitiationLog",
    initiationLogSchema,
  );

export default WhatsAppConversationInitiationLog;
