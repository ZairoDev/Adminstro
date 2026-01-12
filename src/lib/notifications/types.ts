/**
 * Unified Notification System - Core Types
 * 
 * All notifications (System + WhatsApp) are normalized into this format
 * before being processed by the queue engine.
 */

export type NotificationSource = "system" | "whatsapp";
export type NotificationSeverity = "info" | "warning" | "critical" | "whatsapp";

export interface UnifiedNotification {
  id: string; // Unique identifier (system: _id, whatsapp: conversationId)
  source: NotificationSource;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: Date;
  metadata?: {
    conversationId?: string;
    participantPhone?: string;
    location?: string;
    createdBy?: {
      _id: string;
      name: string;
      email?: string;
    };
    expiresAt?: Date;
    groupedMessages?: UnifiedNotification[]; // For grouped WhatsApp messages
    messageCount?: number; // Number of messages in a grouped notification (deprecated, use groupedMessages.length)
    lastMessageId?: string; // ID of the last message (for deduplication)
    lastMessagePreview?: string; // Preview of the last message (for stacking)
    eventId?: string; // Stable event ID for deduplication: `${conversationId}:${messageId}:${userId}`
  };
  actions?: NotificationAction[];
  // Internal flags
  isCritical?: boolean; // Critical notifications cannot be muted/auto-dismissed
  groupKey?: string; // For WhatsApp grouping by conversation
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: "default" | "outline" | "ghost";
}

/**
 * Raw notification inputs (before normalization)
 */
export interface RawSystemNotification {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical";
  target: {
    roles?: string[];
    locations?: string[];
    allUsers?: boolean;
  };
  createdBy: {
    _id: string;
    name: string;
    email?: string;
  };
  createdAt: string;
  expiresAt?: string;
}

export interface RawWhatsAppMessage {
  conversationId: string;
  message: {
    id: string;
    messageId: string;
    from: string;
    to: string;
    type: string;
    content: any;
    direction: "incoming" | "outgoing";
    timestamp: Date | string;
    senderName?: string;
  };
  businessPhoneId: string;
  assignedAgent?: string;
  // Per-user notification fields
  deliveryId?: string; // For acknowledgement tracking: `${eventId}:${timestamp}`
  eventId?: string; // Stable event ID for deduplication: `${conversationId}:${messageId}:${userId}`
  userId?: string; // Target user for this notification
  participantName?: string; // Name of the participant
  lastMessagePreview?: string; // Preview of the last message
  lastMessageTime?: Date | string; // Timestamp of the last message
  createdAt?: Date | string; // FREEZE: First message time for stable notification identity
}

