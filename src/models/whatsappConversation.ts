import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppConversation extends Document {
  participantPhone: string;
  participantName?: string;
  participantProfilePic?: string;

  businessPhoneId: string;

  assignedAgent?: mongoose.Types.ObjectId;
  assignmentHistory?: {
    agentId: mongoose.Types.ObjectId;
    assignedAt: Date;
    unassignedAt?: Date;
  }[];

  lastMessageId?: string;
  lastMessageContent?: string;
  lastMessageTime?: Date;
  lastMessageDirection?: "incoming" | "outgoing";
  lastMessageStatus?: "sending" | "sent" | "delivered" | "read" | "failed";

  unreadCount: number;

  status: "active" | "archived" | "blocked";

  lastCustomerMessageAt?: Date;
  sessionExpiresAt?: Date;

  firstMessageTime?: Date;
  lastIncomingMessageTime?: Date;
  lastOutgoingMessageTime?: Date;

  tags?: string[];
  notes?: string;

  metadata?: Map<string, any>;
}

const whatsAppConversationSchema = new Schema<IWhatsAppConversation>(
  {
    participantPhone: {
      type: String,
      required: true,
      index: true,
    },

    participantName: {
      type: String,
      default: "",
    },

    participantProfilePic: {
      type: String,
    },

    businessPhoneId: {
      type: String,
      required: true,
      index: true,
    },

    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      index: true,
    },

    assignmentHistory: [
      {
        agentId: {
          type: Schema.Types.ObjectId,
          ref: "Employees",
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        unassignedAt: {
          type: Date,
        },
      },
    ],

    lastMessageId: {
      type: String,
    },

    lastMessageContent: {
      type: String,
    },

    lastMessageTime: {
      type: Date,
      index: true,
    },

    lastMessageDirection: {
      type: String,
      enum: ["incoming", "outgoing"],
    },

    lastMessageStatus: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
    },

    unreadCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "archived", "blocked"],
      default: "active",
      index: true,
    },

    lastCustomerMessageAt: {
      type: Date,
    },

    sessionExpiresAt: {
      type: Date,
    },

    firstMessageTime: {
      type: Date,
    },

    lastIncomingMessageTime: {
      type: Date,
    },

    lastOutgoingMessageTime: {
      type: Date,
    },

    tags: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
    },

    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// One conversation per participant per business phone
whatsAppConversationSchema.index(
  { participantPhone: 1, businessPhoneId: 1 },
  { unique: true }
);

// Index for fetching conversations by agent
whatsAppConversationSchema.index({
  assignedAgent: 1,
  status: 1,
  lastMessageTime: -1,
});

// Index for inbox loading
whatsAppConversationSchema.index({
  status: 1,
  lastMessageTime: -1,
});

const WhatsAppConversation =
  mongoose.models?.WhatsAppConversation ||
  mongoose.model<IWhatsAppConversation>(
    "WhatsAppConversation",
    whatsAppConversationSchema
  );

export default WhatsAppConversation;
