/**
 * Notification Normalization Layer
 * 
 * Converts raw system/WhatsApp notifications into unified format
 */

import { UnifiedNotification, RawSystemNotification, RawWhatsAppMessage, NotificationAction } from "./types";

/**
 * Normalize system notification to unified format
 */
export function normalizeSystemNotification(
  raw: RawSystemNotification
): UnifiedNotification {
  const isCritical = raw.type === "critical";

  const actions: NotificationAction[] = [];
  
  // Add mute action (except for critical)
  if (!isCritical) {
    actions.push({
      label: "Mute",
      action: () => {}, // Will be handled by parent component
      variant: "ghost",
    });
  }

  return {
    id: raw._id,
    source: "system",
    title: raw.title,
    message: raw.message,
    severity: raw.type,
    timestamp: new Date(raw.createdAt),
    metadata: {
      createdBy: raw.createdBy,
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : undefined,
    },
    actions,
    isCritical,
  };
}

/**
 * Normalize WhatsApp message to unified format
 */
export function normalizeWhatsAppNotification(
  raw: RawWhatsAppMessage
): UnifiedNotification {
  const { conversationId, message } = raw;

  // Extract display text
  let displayText = "";
  if (typeof message.content === "string") {
    displayText = message.content;
  } else if (message.content && typeof message.content === "object") {
    displayText = message.content.text || 
                  message.content.caption || 
                  (message.content.location ? `📍 ${message.content.location.name || 'Location'}` : '') ||
                  `${message.type} message`;
  } else {
    displayText = `${message.type} message`;
  }

  const actions: NotificationAction[] = [
    {
      label: "Open",
      action: () => {
        // Navigation will be handled by parent component
        if (typeof window !== "undefined" && message.from) {
          window.location.href = `/whatsapp?phone=${encodeURIComponent(message.from)}`;
        }
      },
      variant: "outline",
    },
    {
      label: "Mute",
      action: () => {}, // Will be handled by parent component
      variant: "ghost",
    },
  ];

  // For stacked notifications, we'll count messages in the same conversation
  // Note: unreadCount is now per-user, so we don't use it here
  const participantName = (raw as any).participantName || message.senderName || "Unknown";
  const lastMessagePreview = (raw as any).lastMessagePreview || displayText;
  const lastMessageTime = (raw as any).lastMessageTime || message.timestamp;
  
  const finalTitle = participantName;
  const finalMessage = displayText; // Stacking will be handled by queue engine

  // FREEZE: Use createdAt if provided (from backend), otherwise use first message time
  const stableCreatedAt = (raw as any).createdAt 
    ? new Date((raw as any).createdAt)
    : new Date(lastMessageTime || message.timestamp || Date.now());
  
  return {
    id: conversationId, // Use conversationId as unique ID for grouping (STABLE KEY)
    source: "whatsapp",
    title: finalTitle,
    message: finalMessage,
    severity: "whatsapp",
    timestamp: stableCreatedAt, // FREEZE: Use stable createdAt for notification identity
    metadata: {
      conversationId,
      participantPhone: message.from,
      lastMessageId: message.messageId || message.id, // Store message ID for deduplication
      lastMessagePreview: lastMessagePreview, // Preview of the last message
      eventId: (raw as any).eventId, // Store eventId for deduplication
    },
    actions: [
      {
        label: "Open",
        action: () => {
          if (typeof window !== "undefined" && message.from) {
            window.location.href = `/whatsapp?phone=${encodeURIComponent(message.from)}`;
          }
        },
        variant: "outline",
      },
      {
        label: "Clear",
        action: () => {}, // Will be handled by parent component
        variant: "ghost",
      },
      {
        label: "Mute",
        action: () => {}, // Will be handled by parent component
        variant: "ghost",
      },
    ],
    groupKey: `whatsapp:${conversationId}`, // Group WhatsApp messages by conversation with prefix
  };
}

