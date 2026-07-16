export interface MessageContent {
  text?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactivePayload?: any;
}

export interface ReplyContext {
  messageId: string;
  from: string;
  type: string;
  content?: {
    text?: string;
    caption?: string;
  };
  mediaUrl?: string;
}

// Alias for backwards compatibility
export type QuotedMessage = ReplyContext;

export interface Message {
  _id?: string;
  messageId: string;
  from: string;
  to: string;
  type: string;
  content: MessageContent | string;
  displayText?: string;
  mediaUrl?: string;
  filename?: string;
  fileSize?: number;
  timestamp: Date;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  direction: "incoming" | "outgoing";
  isEcho?: boolean;
  isForwarded?: boolean;
  forwardedFrom?: string;
  reactions?: Array<{
    emoji: string;
    direction: "incoming" | "outgoing";
    from?: string;
  }>;
  // Reply context (backend field names)
  replyToMessageId?: string;
  replyContext?: ReplyContext;
  // Aliases for backwards compatibility
  quotedMessageId?: string;
  quotedMessage?: QuotedMessage;
  /**
   * Source of message:
   * - "meta": Real WhatsApp message via Meta API
   * - "internal": Internal-only message (e.g., "You" messages, notes)
   */
  source?: "meta" | "internal";
  /**
   * Flag for internal messages (convenience flag)
   */
  isInternal?: boolean;
  /**
   * Failure reason for failed messages
   */
  failureReason?: {
    code?: string;
    message?: string;
    raw?: any;
  };
}

export interface Conversation {
  _id: string;
  participantPhone: string;
  participantName: string; // Saved CRM/display name
  participantProfilePic?: string;
  // Optional WhatsApp-fetched display name (if available from metadata/backend)
  whatsappName?: string;
  // Snapshot identity fields mirrored from backend schema
  participantLocation?: string;
  lastMessageId?: string;
  lastMessageContent?: string;
  lastMessageTime?: Date;
  lastMessageDirection?: string;
  lastMessageStatus?: "sending" | "sent" | "delivered" | "read" | "failed";
  unreadCount: number;
  status: string;
  lastCustomerMessageAt?: Date;
  lastCustomerMessageAtByPhone?: Record<string, string | Date>;
  sessionExpiresAt?: Date;
  conversationType?: "owner" | "guest"; // Determined by first template message
  rentalType?: "Short Term" | "Long Term" | "General";
  referenceLink?: string; // Property listing URL or reference link
  /** Outgoing VacationSaga listing links sent to this guest (sidebar) */
  listingLinkSentCount?: number;
  /** Outgoing text messages matching "options sent" (sidebar, guests only) */
  optionsSentCount?: number;
  // Real-time presence (if supported by backend)
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: Date;
  /**
   * Source of conversation:
   * - "meta": Real WhatsApp conversation via Meta API
   * - "internal": Internal-only conversation (e.g., "You" virtual number)
   */
  source?: "meta" | "internal";
  /**
   * WhatsApp Business Phone Number ID that owns this conversation.
   * CRITICAL: used to scope contacts/chats per account so Athens contacts
   * never appear under Thessaloniki/Milan and vice versa.
   */
  businessPhoneId?: string;
  /**
   * Per-user archive state (WhatsApp-style)
   */
  isArchivedByUser?: boolean;
  archivedAt?: Date;
  /**
   * Flag for internal conversations (convenience flag)
   */
  isInternal?: boolean;
  /** CRM workflow labels */
  labels?: string[];
  /** Free-text note for this chat (searchable in inbox) */
  notes?: string;
  preferredLanguage?: string;
  preferredLanguageCode?: string;
  hasActiveReminder?: boolean;
  reminderAt?: Date | string;
  leadQueryId?: string;
  /**
   * LeadGen → Sales ownership.
   * false = LeadGen working; true/undefined = Sales owns.
   */
  handedToSales?: boolean;
  handedToSalesAt?: Date | string | null;
  handedToSalesBy?: string | null;
  handedToSalesByName?: string | null;
}

export interface Template {
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

export interface ConversationsListFilters {
  search: string;
  labelFilter: string;
  adminQueue: boolean;
  locationFilter?: string;
  retargetOnly: boolean;
  enabled: boolean;
}

export interface WhatsAppConversationsListPage {
  success: boolean;
  conversations: Conversation[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  counts?: {
    totalCount: number;
    ownerCount: number;
    guestCount: number;
    unreadCount?: number;
  };
  archivedCount?: number;
  phoneMaskRules?: {
    maskOwnerPhones: boolean;
    maskGuestPhones: boolean;
  };
}

export interface WhatsAppMessagesListPage {
  success: boolean;
  messages: Message[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: {
      messageId: string;
      timestamp: string;
    } | null;
  };
}

/** @deprecated Use WhatsAppConversationsListPage */
export type ConversationListResponse = WhatsAppConversationsListPage;

