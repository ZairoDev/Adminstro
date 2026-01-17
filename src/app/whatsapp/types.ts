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
  participantRole?: "owner" | "guest";
  lastMessageId?: string;
  lastMessageContent?: string;
  lastMessageTime?: Date;
  lastMessageDirection?: string;
  lastMessageStatus?: "sending" | "sent" | "delivered" | "read" | "failed";
  unreadCount: number;
  status: string;
  lastCustomerMessageAt?: Date;
  sessionExpiresAt?: Date;
  conversationType?: "owner" | "guest"; // Determined by first template message
  referenceLink?: string; // Property listing URL or reference link
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
   * Per-user archive state (WhatsApp-style)
   */
  isArchivedByUser?: boolean;
  archivedAt?: Date;
  /**
   * Flag for internal conversations (convenience flag)
   */
  isInternal?: boolean;
}

export interface Template {
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

