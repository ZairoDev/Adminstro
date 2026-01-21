import mongoose, { Schema, Document } from "mongoose";

/**
 * Global archive state for WhatsApp conversations
 * Archive state is shared across all users:
 * - If one user archives a conversation, it's archived for everyone
 * - Archived conversations do NOT trigger notifications
 * - Incoming messages do NOT auto-unarchive
 * - archivedBy tracks who performed the archive action (for audit)
 */
export interface IConversationArchiveState extends Document {
  conversationId: mongoose.Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId; // Track who archived (for audit, optional)
  unarchivedAt?: Date;
  unarchivedBy?: mongoose.Types.ObjectId; // Track who unarchived (for audit, optional)
  createdAt?: Date;
  updatedAt?: Date;
}

const conversationArchiveStateSchema = new Schema<IConversationArchiveState>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      required: true,
      unique: true, // One archive state per conversation (global)
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
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      // Optional - tracks who archived for audit purposes
    },
    unarchivedAt: {
      type: Date,
    },
    unarchivedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      // Optional - tracks who unarchived for audit purposes
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one archive state per conversation (global)
conversationArchiveStateSchema.index(
  { conversationId: 1 },
  { unique: true }
);

// Index for fetching all archived conversations
conversationArchiveStateSchema.index({ isArchived: 1 });

const ConversationArchiveState =
  mongoose.models.ConversationArchiveState ||
  mongoose.model<IConversationArchiveState>(
    "ConversationArchiveState",
    conversationArchiveStateSchema
  );

export default ConversationArchiveState;
