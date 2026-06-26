import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppConversation extends Document {
  participantPhone: string;
  participantName?: string;
  participantProfilePic?: string;

  // Snapshot identity fields (immutable unless explicitly edited)
  participantLocation?: string;
  // Normalized lowercase city key — used for indexed visibility queries
  participantLocationKey?: string;

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

  status: "active" | "archived" | "blocked" | "merged";

  /** Set when status is merged — points to the surviving conversation */
  mergedInto?: mongoose.Types.ObjectId;
  mergedAt?: Date;

  lastCustomerMessageAt?: Date;
  /** Per business line — Meta 24h window is scoped to each phone number. */
  lastCustomerMessageAtByPhone?: Map<string, Date>;
  sessionExpiresAt?: Date;

  firstMessageTime?: Date;
  lastIncomingMessageTime?: Date;
  lastOutgoingMessageTime?: Date;

  /** First outbound (agent/system) message timestamp */
  firstOutboundMessageAt?: Date;
  /** First customer reply after outbound */
  firstCustomerReplyAt?: Date;
  /** First agent reply after customer's first message */
  firstAgentReplyAt?: Date;
  customerMessageCount?: number;
  agentMessageCount?: number;
  lastCustomerReplyAt?: Date;
  lastAgentReplyAt?: Date;
  /** 0–100 engagement score (derived) */
  engagementScore?: number;
  leadTemperature?: "hot" | "warm" | "cold" | "dormant";
  /** Agent first response exceeded SLA threshold */
  slaBreached?: boolean;
  /** First template that opened the conversation */
  openingTemplateName?: string;

  /** Sales daily guest-initiation quota (replaces separate initiation log collection) */
  guestInitiationAgentId?: mongoose.Types.ObjectId;
  /** Meta accepted outbound — slot reserved until delivery or failure */
  guestInitiationReservedAt?: Date;
  /** First delivered outbound to a new guest — awaiting reply */
  guestInitiationPendingAt?: Date;
  /** Guest's first reply after guestInitiationPendingAt */
  guestInitiationConfirmedAt?: Date;

  tags?: string[];
  /** CRM disposition / workflow labels (indexed for sidebar filters) */
  labels?: string[];
  notes?: string;

  /** Conversation-level translation preference */
  preferredLanguage?: string;
  preferredLanguageCode?: string;
  preferredLanguageUpdatedAt?: Date;

  /** Linked CRM Query document */
  leadQueryId?: mongoose.Types.ObjectId;

  /** Active reminder metadata (mirrors PersonalReminder when set from WhatsApp) */
  hasActiveReminder?: boolean;
  reminderAt?: Date;
  reminderNote?: string;

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

  // Multi-portfolio / multi-WABA routing (additive — populated from the
  // WhatsappChannel that owns this conversation's businessPhoneId).
  // These fields are FROZEN at creation; never updated when admin remaps channels.
  whatsappChannelId?: mongoose.Types.ObjectId;
  channelType?: "guest" | "owner" | "support" | "backup";
  rentalType?: "Short Term" | "Long Term" | "General";
  businessPortfolioId?: string;
  wabaId?: string;

  /** Conversation identity schema version (2 = phone + whatsappChannelId) */
  identityVersion?: number;

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

    // Normalized lowercase city key for indexed visibility queries (e.g. "athens")
    participantLocationKey: {
      type: String,
      default: "",
      index: true,
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
      enum: ["active", "archived", "blocked", "merged"],
      default: "active",
      index: true,
    },

    mergedInto: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
    },

    mergedAt: {
      type: Date,
    },

    lastCustomerMessageAt: {
      type: Date,
    },

    lastCustomerMessageAtByPhone: {
      type: Map,
      of: Date,
      default: undefined,
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

    firstOutboundMessageAt: {
      type: Date,
      index: true,
    },
    firstCustomerReplyAt: {
      type: Date,
      index: true,
    },
    firstAgentReplyAt: {
      type: Date,
      index: true,
    },
    customerMessageCount: {
      type: Number,
      default: 0,
    },
    agentMessageCount: {
      type: Number,
      default: 0,
    },
    lastCustomerReplyAt: {
      type: Date,
    },
    lastAgentReplyAt: {
      type: Date,
    },
    engagementScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    leadTemperature: {
      type: String,
      enum: ["hot", "warm", "cold", "dormant"],
      index: true,
    },
    slaBreached: {
      type: Boolean,
      default: false,
      index: true,
    },
    openingTemplateName: {
      type: String,
      default: "",
      index: true,
    },

    guestInitiationAgentId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      index: true,
    },
    guestInitiationReservedAt: {
      type: Date,
      index: true,
    },
    guestInitiationPendingAt: {
      type: Date,
      index: true,
    },
    guestInitiationConfirmedAt: {
      type: Date,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    labels: {
      type: [String],
      default: [],
      index: true,
    },

    notes: {
      type: String,
    },

    preferredLanguage: {
      type: String,
      default: "",
    },

    preferredLanguageCode: {
      type: String,
      default: "",
    },

    preferredLanguageUpdatedAt: {
      type: Date,
    },

    leadQueryId: {
      type: Schema.Types.ObjectId,
      ref: "Query",
      index: true,
    },

    hasActiveReminder: {
      type: Boolean,
      default: false,
      index: true,
    },

    reminderAt: {
      type: Date,
      index: true,
    },

    reminderNote: {
      type: String,
      default: "",
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

    // Multi-portfolio / multi-WABA routing (additive, frozen at creation).
    whatsappChannelId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappChannel",
      default: undefined,
      index: true,
    },
    channelType: {
      type: String,
      enum: ["guest", "owner", "support", "backup"],
      default: undefined,
      index: true,
    },
    rentalType: {
      type: String,
      enum: ["Short Term", "Long Term", "General"],
      default: undefined,
      index: true,
    },
    businessPortfolioId: {
      type: String,
      default: undefined,
    },
    wabaId: {
      type: String,
      default: undefined,
    },

    identityVersion: {
      type: Number,
      default: 2,
    },

    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Runtime line lookup (non-unique — businessPhoneId is mutable)
whatsAppConversationSchema.index({
  participantPhone: 1,
  businessPhoneId: 1,
});

// Permanent identity: one conversation per participant per business channel
whatsAppConversationSchema.index(
  { participantPhone: 1, whatsappChannelId: 1 },
  { unique: true, sparse: true, name: "identity_v2" },
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

// Compound index for dual-filter visibility queries (phone + location key)
whatsAppConversationSchema.index({
  businessPhoneId: 1,
  participantLocationKey: 1,
  status: 1,
});

// Compound index for triple-filter visibility (location + rental type + channel type)
whatsAppConversationSchema.index({
  participantLocationKey: 1,
  rentalType: 1,
  channelType: 1,
  status: 1,
  lastMessageTime: -1,
}, { name: "visibility_channel_idx" });

// Channel-scoped reporting and inbox queries
whatsAppConversationSchema.index({
  whatsappChannelId: 1,
  status: 1,
  lastMessageTime: -1,
}, { name: "channel_lookup_idx" });

// Inbox location + recency (SuperAdmin location filter)
whatsAppConversationSchema.index(
  { lastMessageTime: -1, participantLocationKey: 1 },
  { name: "wa_inbox_location_recency_idx" },
);

whatsAppConversationSchema.index({
  labels: 1,
  status: 1,
  lastMessageTime: -1,
}, { name: "crm_labels_inbox_idx" });

whatsAppConversationSchema.index({
  firstOutboundMessageAt: 1,
  participantLocationKey: 1,
  conversationType: 1,
}, { name: "wa_analytics_outbound_idx" });

whatsAppConversationSchema.index({
  leadTemperature: 1,
  status: 1,
  lastMessageTime: -1,
}, { name: "wa_lead_temperature_idx" });

whatsAppConversationSchema.index(
  { guestInitiationAgentId: 1, guestInitiationConfirmedAt: 1 },
  { name: "wa_guest_initiation_confirmed_idx" },
);
whatsAppConversationSchema.index(
  { guestInitiationAgentId: 1, guestInitiationPendingAt: 1 },
  { name: "wa_guest_initiation_pending_idx" },
);
whatsAppConversationSchema.index(
  { guestInitiationAgentId: 1, guestInitiationReservedAt: 1 },
  { name: "wa_guest_initiation_reserved_idx" },
);

// Notification bell: expiring 24h window scans by customer message time + agent scope
whatsAppConversationSchema.index(
  { lastCustomerMessageAt: 1, assignedAgent: 1 },
  { name: "wa_expiring_window_agent_idx" },
);

const WhatsAppConversation =
  mongoose.models?.WhatsAppConversation ||
  mongoose.model<IWhatsAppConversation>(
    "WhatsAppConversation",
    whatsAppConversationSchema
  );

export default WhatsAppConversation;
