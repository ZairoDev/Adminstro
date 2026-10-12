import mongoose, { Schema, Document } from "mongoose";

/**
 * WhatsappChannel
 *
 * A channel encapsulates one outbound identity in the multi-portfolio /
 * multi-WABA / multi-token architecture:
 *
 *   Location + Rental Type + Channel Type  ──▶  WhatsappChannel  ──▶  Phone + Token + WABA + Portfolio
 *
 * Employees never interact with channels directly — they keep working through
 * Locations + Rental Type. Channels are the routing layer.
 *
 * Business invariant (enforced in service layer + DB partial unique index):
 *   For a given (location, rentalType, channelType) there is at most ONE active channel.
 *
 * Channel versioning: when an assignment changes, the old channel row gets
 * active=false + endedAt=now, and a NEW row is created. Conversations keep
 * their whatsappChannelId frozen to the original row for historical accuracy.
 */

export type WhatsappChannelRentalType = "Short Term" | "Long Term" | "General";
export type WhatsappChannelType = "guest" | "owner" | "support" | "backup";

export interface IWhatsappChannel extends Document {
  name: string;
  channelType: WhatsappChannelType;
  businessPortfolioId: string;
  businessPortfolioName: string;
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  rentalType: WhatsappChannelRentalType;
  /** Normalized lowercase city keys (e.g. "athens"). */
  assignedLocations: string[];
  active: boolean;
  /** When this channel/assignment became active. */
  assignedAt: Date;
  /** Set when deactivated; null while active. */
  endedAt: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const whatsappChannelSchema = new Schema<IWhatsappChannel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    channelType: {
      type: String,
      enum: ["guest", "owner", "support", "backup"],
      required: true,
      index: true,
    },

    businessPortfolioId: {
      type: String,
      default: "",
      trim: true,
    },

    businessPortfolioName: {
      type: String,
      default: "",
      trim: true,
    },

    wabaId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    wabaName: {
      type: String,
      default: "",
      trim: true,
    },

    phoneNumberId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    displayPhoneNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // Stored server-side only; never sent to non-admin clients.
    accessToken: {
      type: String,
      default: "",
    },

    rentalType: {
      type: String,
      enum: ["Short Term", "Long Term", "General"],
      required: true,
      index: true,
    },

    // Normalized lowercase city keys for reliable matching.
    assignedLocations: {
      type: [String],
      default: [],
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

// Outbound routing: active channels by location + rental type + channel type.
whatsappChannelSchema.index({ assignedLocations: 1, rentalType: 1, channelType: 1, active: 1 });

// Inbound routing: resolve channel by phone number id (active only).
// Partial unique: only one active channel per phone line.
whatsappChannelSchema.index(
  { phoneNumberId: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: "unique_active_phoneNumberId",
  },
);

const WhatsappChannel =
  (mongoose.models?.WhatsappChannel as mongoose.Model<IWhatsappChannel>) ||
  mongoose.model<IWhatsappChannel>("WhatsappChannel", whatsappChannelSchema);

export default WhatsappChannel;
