import mongoose, { Schema, Document } from "mongoose";

export interface IConversationReadState extends Document {
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // employee
  lastReadMessageId: string; // messageId (wamid) of the last read message
  lastReadAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const conversationReadStateSchema = new Schema<IConversationReadState>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      // This references the Employees collection/model
      ref: "Employees",
      required: true,
      index: true,
    },
    lastReadMessageId: {
      type: String,
      required: true,
    },
    lastReadAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index on conversationId + userId (one read state per user per conversation)
conversationReadStateSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true }
);

// Compound index for efficient queries
conversationReadStateSchema.index({ conversationId: 1, lastReadAt: -1 });

const ConversationReadState =
  mongoose.models.ConversationReadState ||
  mongoose.model<IConversationReadState>(
    "ConversationReadState",
    conversationReadStateSchema
  );

export default ConversationReadState;
