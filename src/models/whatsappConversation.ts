import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppConversation extends Document {
  participantPhone: string;
  participantName?: string;
  participantProfilePic?: string;

  // Snapshot identity fields (immutable unless explicitly edited)
  participantLocation?: string;
  participantRole?: "owner" | "guest";

  businessPhoneId: string;

  /**
   * Source of conversation:
   * - "meta": Real WhatsApp conversation via Meta API
   * - "internal": Internal-only conversation (e.g., "You" virtual number)
   * 
   * Internal conversations:
   * - Never sync with Meta
   * - Never trigger notifications
   * - Don't affect phone health tracking
   */
  source?: "meta" | "internal";

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

  conversationType?: "owner" | "guest"; // Determined by first template message
  referenceLink?: string; // Property listing URL or reference link

  // Retarget lifecycle fields
  isRetarget?: boolean;
  retargetStage?: 
    | "initiated"
    | "awaiting_reply"
    | "engaged"
    | "handed_to_sales"
    | "converted"
    | "dropped";
  ownerRole?: "Advert" | "Sales" | null;
  ownerUserId?: mongoose.Types.ObjectId | null;
  handoverCompletedAt?: Date | null;
  retargetTemplateName?: string;
  retargetAgentId?: mongoose.Types.ObjectId | null;

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

    // Snapshot identity: where this participant belongs (e.g. city/area)
    participantLocation: {
      type: String,
      default: "",
    },

    // Snapshot identity: role of participant in our system
    participantRole: {
      type: String,
      enum: ["owner", "guest"],
    },

    businessPhoneId: {
      type: String,
      required: function(this: any) {
        // businessPhoneId is required only for meta (external) conversations
        return this.source !== "internal";
      },
      index: true,
    },

    source: {
      type: String,
      enum: ["meta", "internal"],
      default: "meta",
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

    conversationType: {
      type: String,
      enum: ["owner", "guest"],
      index: true,
    },

    referenceLink: {
      type: String,
    },

    // Retarget lifecycle fields
    isRetarget: {
      type: Boolean,
      default: false,
      index: true,
    },
    retargetStage: {
      type: String,
      enum: ["initiated", "awaiting_reply", "engaged", "handed_to_sales", "converted", "dropped"],
      default: undefined,
      index: true,
    },
    ownerRole: {
      type: String,
      enum: ["Advert", "Sales"],
      default: undefined,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      default: undefined,
      index: true,
    },
    handoverCompletedAt: {
      type: Date,
      default: null,
    },
    retargetTemplateName: {
      type: String,
      default: "",
    },
    retargetAgentId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      default: undefined,
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
