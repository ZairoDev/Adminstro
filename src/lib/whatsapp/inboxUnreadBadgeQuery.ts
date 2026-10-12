import mongoose from "mongoose";
import { buildInboxListQueryAsync, type InboxListParams } from "./inboxQuery";
import type { WhatsAppToken } from "./apiContext";
import { aggregateUnreadInboxConversationCount } from "./inboxUnreadQuery";
import { loadGlobalArchivedConversationIds } from "./conversationsListEnrichment";

export type InboxUnreadBadgeQueryOptions = {
  archivedOnly?: boolean;
  includeArchived?: boolean;
};

/**
 * Mongo filter for inbox-wide unread badge (label filter cleared — badge is scope-wide).
 */
export async function buildInboxUnreadBadgeMongoQuery(
  normalizedToken: WhatsAppToken,
  inboxParams: InboxListParams,
  archivedConversationIds: mongoose.Types.ObjectId[],
  options: InboxUnreadBadgeQueryOptions = {},
): Promise<Record<string, unknown> | null> {
  const unreadBadgeVisibilityQuery = await buildInboxListQueryAsync(
    normalizedToken,
    { ...inboxParams, labelFilter: "" },
  );

  if (unreadBadgeVisibilityQuery._id === null) {
    return null;
  }

  const unreadCountQuery: Record<string, unknown> = {
    ...unreadBadgeVisibilityQuery,
  };

  const { archivedOnly = false, includeArchived = false } = options;
  if (
    !archivedOnly &&
    !includeArchived &&
    archivedConversationIds.length > 0
  ) {
    unreadCountQuery._id = { $nin: archivedConversationIds };
  }

  return unreadCountQuery;
}

export async function resolveInboxUnreadBadgeCount(
  normalizedToken: WhatsAppToken,
  inboxParams: InboxListParams,
  userId: string | mongoose.Types.ObjectId,
  options: InboxUnreadBadgeQueryOptions = {},
): Promise<number> {
  const { archivedConversationIds } = await loadGlobalArchivedConversationIds();
  const query = await buildInboxUnreadBadgeMongoQuery(
    normalizedToken,
    inboxParams,
    archivedConversationIds,
    options,
  );
  if (!query) {
    return 0;
  }
  return aggregateUnreadInboxConversationCount(query, userId);
}
