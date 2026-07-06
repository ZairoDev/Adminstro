/** Meta customer care window — 24 hours from last customer message on the same line. */
export const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

export type MessagingWindowConversation = {
  lastCustomerMessageAt?: Date | string | null;
  lastCustomerMessageAtByPhone?: Record<string, Date | string> | Map<string, Date> | null;
  businessPhoneId?: string;
  sessionExpiresAt?: Date | string | null;
  lastIncomingMessageTime?: Date | string | null;
};

export function isWithinMessagingWindow(
  lastCustomerMessageAt: Date | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!lastCustomerMessageAt) return false;
  return nowMs - lastCustomerMessageAt.getTime() < MESSAGING_WINDOW_MS;
}

function toTimeMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Single source of truth for "can the business send free-form messages?".
 * Uses sessionExpiresAt when present, then falls back to anchor timestamps.
 */
export function isSessionActive(
  conversation: MessagingWindowConversation | null | undefined,
  _outboundPhoneId?: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (!conversation) return false;

  if (conversation.sessionExpiresAt) {
    return new Date(conversation.sessionExpiresAt).getTime() > nowMs;
  }

  if (conversation.lastCustomerMessageAt) {
    return (
      new Date(conversation.lastCustomerMessageAt).getTime() + MESSAGING_WINDOW_MS >
      nowMs
    );
  }

  if (conversation.lastIncomingMessageTime) {
    return (
      new Date(conversation.lastIncomingMessageTime).getTime() + MESSAGING_WINDOW_MS >
      nowMs
    );
  }

  return false;
}

/** Epoch ms for the effective window anchor (newest known inbound customer time). */
export function resolveSessionAnchorMs(
  conversation: MessagingWindowConversation | null | undefined,
  outboundPhoneId?: string | null,
): number | null {
  if (!conversation) return null;

  const candidates: number[] = [];

  const sessionExpiresMs = toTimeMs(conversation.sessionExpiresAt);
  if (sessionExpiresMs !== null) {
    candidates.push(sessionExpiresMs - MESSAGING_WINDOW_MS);
  }
  const customerMs = toTimeMs(conversation.lastCustomerMessageAt);
  if (customerMs !== null) candidates.push(customerMs);
  const incomingMs = toTimeMs(conversation.lastIncomingMessageTime);
  if (incomingMs !== null) candidates.push(incomingMs);

  const phone = outboundPhoneId?.trim();
  if (phone) {
    const fromMap = toTimeMs(
      readByPhoneTimestamp(conversation.lastCustomerMessageAtByPhone, phone),
    );
    if (fromMap !== null) candidates.push(fromMap);
  }

  return candidates.length > 0 ? Math.max(...candidates) : null;
}

export function getMessagingWindowRemaining(
  lastCustomerMessageAt: Date | null | undefined,
  nowMs: number = Date.now(),
): { hours: number; minutes: number } | null {
  if (!lastCustomerMessageAt) return null;
  const msRemaining =
    lastCustomerMessageAt.getTime() + MESSAGING_WINDOW_MS - nowMs;
  if (msRemaining <= 0) return null;

  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
}

function readByPhoneTimestamp(
  byPhone: MessagingWindowConversation["lastCustomerMessageAtByPhone"],
  phone: string,
): Date | null {
  if (!byPhone) return null;
  const raw =
    byPhone instanceof Map
      ? byPhone.get(phone)
      : (byPhone as Record<string, unknown>)[phone];
  if (!raw) return null;
  return new Date(raw as string | Date);
}

/**
 * Last customer message that opens the window on a specific business line.
 * Meta enforces the 24h window per (businessPhoneId, customer) pair.
 */
export function getLastCustomerMessageAtForPhone(
  conversation: MessagingWindowConversation | null | undefined,
  outboundPhoneId: string | null | undefined,
): Date | null {
  if (!conversation) return null;

  const phone = outboundPhoneId?.trim();
  if (!phone) {
    return conversation.lastCustomerMessageAt
      ? new Date(conversation.lastCustomerMessageAt)
      : null;
  }

  const fromMap = readByPhoneTimestamp(
    conversation.lastCustomerMessageAtByPhone,
    phone,
  );
  if (fromMap) return fromMap;

  if (
    conversation.lastCustomerMessageAt &&
    conversation.businessPhoneId?.trim() === phone
  ) {
    return new Date(conversation.lastCustomerMessageAt);
  }

  return null;
}
