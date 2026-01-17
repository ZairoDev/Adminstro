import mongoose, { Schema, Document } from "mongoose";

/**
 * Per-user archive state for WhatsApp conversations
 * This enables WhatsApp-style per-user archiving where:
 * - Each user can archive/unarchive conversations independently
 * - Archive state is NOT global (doesn't affect other users)
 * - Archived conversations do NOT trigger notifications
 * - Incoming messages do NOT auto-unarchive (WhatsApp-style behavior)
 */
export interface IConversationArchiveState extends Document {
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // employee
  isArchived: boolean;
  archivedAt?: Date;
  unarchivedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const conversationArchiveStateSchema = new Schema<IConversationArchiveState>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
      index: true,
    },
    isArchived: {
      type: Boolean,
      required: true,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
    unarchivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one archive state per user per conversation
conversationArchiveStateSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true }
);

// Index for fetching all archived conversations for a user
conversationArchiveStateSchema.index({ userId: 1, isArchived: 1 });

const ConversationArchiveState =
  mongoose.models.ConversationArchiveState ||
  mongoose.model<IConversationArchiveState>(
    "ConversationArchiveState",
    conversationArchiveStateSchema
  );

export default ConversationArchiveState;
