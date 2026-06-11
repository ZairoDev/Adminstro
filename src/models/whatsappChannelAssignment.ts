import mongoose, { Schema, Document } from "mongoose";
import type { WhatsappChannelType, WhatsappChannelRentalType } from "./whatsappChannel";

/**
 * WhatsappChannelAssignment
 *
 * Tracks the history of which channel owned a given (location, rentalType, channelType)
 * triple at any point in time.
 *
 * DB-level uniqueness guarantee:
 *   A partial unique index on { locationKey, rentalType, channelType } where
 *   endedAt is null ensures only ONE active assignment exists per triple —
 *   even under concurrent admin requests.
 *
 * Lifecycle:
 *   - Create: insert row with endedAt: null (atomic, rejected by DB if duplicate active)
 *   - Reassign: set endedAt on old row + insert new row in a session transaction
 *   - Read: find where endedAt: null for current routing; find all for history
 */
export interface IWhatsappChannelAssignment extends Document {
  channelId: mongoose.Types.ObjectId;
  locationKey: string;
  rentalType: WhatsappChannelRentalType;
  channelType: WhatsappChannelType;
  assignedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const whatsappChannelAssignmentSchema = new Schema<IWhatsappChannelAssignment>(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappChannel",
      required: true,
      index: true,
    },
    locationKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rentalType: {
      type: String,
      enum: ["Short Term", "Long Term", "General"],
      required: true,
    },
    channelType: {
      type: String,
      enum: ["guest", "owner", "support", "backup"],
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// DB-level guarantee: only one active assignment per (location, rentalType, channelType).
// Partial unique index on endedAt: null rows only (inactive rows are not constrained).
whatsappChannelAssignmentSchema.index(
  { locationKey: 1, rentalType: 1, channelType: 1 },
  {
    unique: true,
    partialFilterExpression: { endedAt: null },
    name: "unique_active_triple",
  },
);

// Lookup all historical assignments for a channel
whatsappChannelAssignmentSchema.index({ channelId: 1, assignedAt: -1 });

const WhatsappChannelAssignment =
  (mongoose.models?.WhatsappChannelAssignment as mongoose.Model<IWhatsappChannelAssignment>) ||
  mongoose.model<IWhatsappChannelAssignment>(
    "WhatsappChannelAssignment",
    whatsappChannelAssignmentSchema,
  );

export default WhatsappChannelAssignment;
