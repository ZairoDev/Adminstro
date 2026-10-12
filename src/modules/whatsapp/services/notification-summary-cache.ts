import type { SummaryExpiringItem, SummaryUnreadItem } from "./notificationSummaryQuery";

export type NotificationSummaryPayload = {
  expiringCount: number;
  unreadCount: number;
  topItems: Array<
    (SummaryExpiringItem & { type: "expiring" }) | (SummaryUnreadItem & { type: "unread" })
  >;
};

type CacheEntry = {
  expiresAt: number;
  payload: NotificationSummaryPayload;
};

const SUMMARY_CACHE_TTL_MS = 60 * 1000;
const cacheByUserId = new Map<string, CacheEntry>();

export function getCachedNotificationSummary(
  userId: string,
): NotificationSummaryPayload | null {
  const entry = cacheByUserId.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheByUserId.delete(userId);
    return null;
  }
  return entry.payload;
}

export function setCachedNotificationSummary(
  userId: string,
  payload: NotificationSummaryPayload,
): void {
  cacheByUserId.set(userId, {
    payload,
    expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS,
  });
}
