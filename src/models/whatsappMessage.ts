import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppMessage extends Document {
  conversationId: mongoose.Types.ObjectId;

  messageId: string; // WhatsApp message ID (wamid)
  businessPhoneId: string; // WhatsApp Business Phone Number ID

  from: string; // Sender phone number
  to: string; // Recipient phone number

  type:
    | "text"
    | "image"
    | "document"
    | "audio"
    | "video"
    | "sticker"
    | "location"
    | "contacts"
    | "interactive"
    | "template"
    | "button"
    | "reaction";

  content?: {
    text?: string;
    caption?: string;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    interactivePayload?: any;
  };

  mediaUrl?: string; // Permanent WhatsApp CDN URL
  mediaId?: string; // WhatsApp media ID
  mimeType?: string;
  filename?: string;

  templateName?: string;
  templateLanguage?: string;

  status: "sending" | "sent" | "delivered" | "read" | "failed";

  statusEvents?: {
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: Date;
    error?: string;
  }[];

  direction: "incoming" | "outgoing";

  pricing?: {
    category: "marketing" | "utility" | "authentication" | "service";
    billable: boolean;
  };

  timestamp: Date;

  sentBy?: mongoose.Types.ObjectId; // Employee (outgoing only)

  failureReason?: {
    code?: string;
    message?: string;
    raw?: any;
  };

  conversationSnapshot?: {
    participantPhone: string;
    assignedAgent?: mongoose.Types.ObjectId;
  };

  metadata?: Map<string, any>;

  // Forwarding fields
  isForwarded?: boolean;
  forwardedFrom?: mongoose.Types.ObjectId; // Reference to original message

  // Reaction fields
  reactedToMessageId?: string; // WhatsApp message ID (wamid) of the message being reacted to
  reactionEmoji?: string; // The emoji reaction (only for reaction type messages)
}

const whatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      required: true,
      index: true,
    },

    messageId: {
      type: String,
      required: true,
      index: true,
    },

    businessPhoneId: {
      type: String,
      required: true,
      index: true,
    },

    from: {
      type: String,
      required: true,
      index: true,
    },

    to: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "text",
        "image",
        "document",
        "audio",
        "video",
        "sticker",
        "location",
        "contacts",
        "interactive",
        "template",
        "button",
        "reaction",
      ],
      default: "text",
    },

    content: {
      text: String,
      caption: String,
      location: {
        latitude: Number,
        longitude: Number,
        name: String,
        address: String,
      },
      interactivePayload: Schema.Types.Mixed,
    },

    mediaUrl: {
      type: String,
    },

    mediaId: {
      type: String,
    },

    mimeType: {
      type: String,
    },

    filename: {
      type: String,
    },

    templateName: {
      type: String,
    },

    templateLanguage: {
      type: String,
    },

    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
      default: "sent",
      index: true,
    },

    statusEvents: [
      {
        status: {
          type: String,
          enum: ["sent", "delivered", "read", "failed"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        error: String,
      },
    ],

    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
      index: true,
    },

    pricing: {
      category: {
        type: String,
        enum: ["marketing", "utility", "authentication", "service"],
      },
      billable: Boolean,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      index: true,
    },

    failureReason: {
      code: String,
      message: String,
      raw: Schema.Types.Mixed,
    },

    conversationSnapshot: {
      participantPhone: String,
      assignedAgent: {
        type: Schema.Types.ObjectId,
        ref: "Employees",
      },
    },

    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },

    // Forwarding fields
    isForwarded: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppMessage",
    },

    // Reaction fields
    reactedToMessageId: {
      type: String,
      index: true,
    },
    reactionEmoji: {
      type: String,
    },
  },
  { timestamps: true }
);

// Unique per business phone number
whatsAppMessageSchema.index(
  { messageId: 1, businessPhoneId: 1 },
  { unique: true }
);

// Timeline loading
whatsAppMessageSchema.index({
  conversationId: 1,
  timestamp: -1,
});

// Unread inbound messages
whatsAppMessageSchema.index({
  conversationId: 1,
  direction: 1,
  status: 1,
  timestamp: -1,
});

const WhatsAppMessage =
  mongoose.models?.WhatsAppMessage ||
  mongoose.model<IWhatsAppMessage>("WhatsAppMessage", whatsAppMessageSchema);

export default WhatsAppMessage;
