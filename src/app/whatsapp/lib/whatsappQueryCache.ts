import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Conversation, Message } from "../types";
import type {
  ConversationsListFilters,
  WhatsAppConversationsListPage,
  WhatsAppMessagesListPage,
} from "../types";

export {
  sortConversationsList,
  compareConversationsForSort,
  isInternalConversation,
  findConversationInsertIndex,
  repositionConversationAfterUpdate,
  insertConversationAtCorrectPosition,
  upsertConversationWithReposition,
  patchConversationInList,
  mapConversationsInList,
} from "./conversationListUpdates";

export const WHATSAPP_CONVERSATIONS_QUERY_KEY = "whatsappConversations" as const;
export const WHATSAPP_MESSAGES_QUERY_KEY = "whatsappMessages" as const;
export const WHATSAPP_UNREAD_COUNT_QUERY_KEY = "whatsappUnreadCount" as const;

/** Scope for inbox-wide unread badge (label filter excluded — matches server badge query). */
export type UnreadCountQueryFilters = {
  locationFilter?: string;
  adminQueue: boolean;
  retargetOnly: boolean;
  enabled: boolean;
};

export function buildUnreadCountQueryKey(
  filters: UnreadCountQueryFilters,
): readonly [typeof WHATSAPP_UNREAD_COUNT_QUERY_KEY, UnreadCountQueryFilters] {
  return [WHATSAPP_UNREAD_COUNT_QUERY_KEY, filters];
}

export function toUnreadCountQueryFilters(
  filters: ConversationsListFilters,
): UnreadCountQueryFilters {
  return {
    locationFilter: filters.locationFilter,
    adminQueue: filters.adminQueue,
    retargetOnly: filters.retargetOnly,
    enabled: filters.enabled,
  };
}

export function buildConversationsQueryKey(
  filters: ConversationsListFilters,
): readonly [typeof WHATSAPP_CONVERSATIONS_QUERY_KEY, ConversationsListFilters] {
  return [WHATSAPP_CONVERSATIONS_QUERY_KEY, filters];
}

export function buildMessagesQueryKey(
  conversationId: string,
): readonly [typeof WHATSAPP_MESSAGES_QUERY_KEY, string] {
  return [WHATSAPP_MESSAGES_QUERY_KEY, conversationId];
}

export function flattenConversationsPages(
  pages: WhatsAppConversationsListPage[],
): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const page of pages) {
    for (const conv of page.conversations ?? []) {
      byId.set(String(conv._id), conv);
    }
  }
  return Array.from(byId.values());
}

export function flattenMessagesPages(
  pages: WhatsAppMessagesListPage[],
): Message[] {
  return pages
    .slice()
    .reverse()
    .flatMap((page) => page.messages ?? []);
}

function rebuildConversationPages(
  old: InfiniteData<WhatsAppConversationsListPage>,
  nextFlat: Conversation[],
): InfiniteData<WhatsAppConversationsListPage> {
  if (!old.pages.length) {
    return {
      pageParams: [undefined],
      pages: [
        {
          success: true,
          conversations: nextFlat,
          pagination: { limit: 25, hasMore: false, nextCursor: null },
        },
      ],
    };
  }

  const sizes = old.pages.map((p) => (p.conversations ?? []).length);
  const totalOld = sizes.reduce((sum, n) => sum + n, 0);
  const growth = nextFlat.length - totalOld;

  if (growth !== 0 && sizes.length > 0) {
    sizes[0] = Math.max(0, sizes[0] + growth);
  }

  let offset = 0;
  const pages = old.pages.map((page, index) => {
    const take = sizes[index] ?? 0;
    const conversations = nextFlat.slice(offset, offset + take);
    offset += take;
    return { ...page, conversations };
  });

  if (offset < nextFlat.length && pages.length > 0) {
    pages[0] = {
      ...pages[0],
      conversations: [
        ...nextFlat.slice(0, nextFlat.length - offset + pages[0].conversations.length),
      ],
    };
  }

  return { ...old, pages };
}

export function mutateWhatsAppConversationsListCache(
  queryClient: QueryClient,
  filters: ConversationsListFilters,
  mutator: (conversations: Conversation[]) => Conversation[],
): void {
  queryClient.setQueryData<InfiniteData<WhatsAppConversationsListPage>>(
    buildConversationsQueryKey(filters),
    (old) => {
      if (!old?.pages?.length) return old;
      const flat = flattenConversationsPages(old.pages);
      const nextFlat = mutator(flat);
      if (nextFlat === flat) return old;
      return rebuildConversationPages(old, nextFlat);
    },
  );
}

/** Keep inbox tab badge in sync when unread state changes without a refetch. */
export function adjustWhatsAppUnreadCountQueryCache(
  queryClient: QueryClient,
  filters: UnreadCountQueryFilters,
  delta: number,
): void {
  if (delta === 0) return;

  queryClient.setQueryData<{ unreadCount: number }>(
    buildUnreadCountQueryKey(filters),
    (old) => ({
      unreadCount: Math.max(0, (old?.unreadCount ?? 0) + delta),
    }),
  );
}

/** @deprecated List response no longer carries unreadCount — use adjustWhatsAppUnreadCountQueryCache */
export function adjustWhatsAppInboxUnreadCountCache(
  queryClient: QueryClient,
  filters: ConversationsListFilters,
  delta: number,
): void {
  if (delta === 0) return;

  queryClient.setQueryData<InfiniteData<WhatsAppConversationsListPage>>(
    buildConversationsQueryKey(filters),
    (old) => {
      if (!old?.pages?.length) return old;
      const first = old.pages[0];
      if (!first.counts) return old;

      const unreadCount = Math.max(
        0,
        (first.counts.unreadCount ?? 0) + delta,
      );
      const pages = [...old.pages];
      pages[0] = {
        ...first,
        counts: { ...first.counts, unreadCount },
      };
      return { ...old, pages };
    },
  );
}

/** Bump unread badge cache for the active inbox scope (socket-driven). */
export function syncWhatsAppInboxUnreadCountAcrossFilters(
  queryClient: QueryClient,
  baseFilters: ConversationsListFilters,
  delta: number,
): void {
  if (delta === 0) return;

  adjustWhatsAppUnreadCountQueryCache(
    queryClient,
    toUnreadCountQueryFilters(baseFilters),
    delta,
  );
}

/**
 * Apply a mutator to EVERY active conversation-list cache entry simultaneously.
 * Use this for socket-driven updates (new message, status change) so all filter
 * tabs (Unread, Search, Location …) stay in sync without a full invalidation.
 */
export function broadcastConversationPatch(
  queryClient: QueryClient,
  mutator: (conversations: Conversation[]) => Conversation[],
): void {
  queryClient.setQueriesData<InfiniteData<WhatsAppConversationsListPage>>(
    { queryKey: [WHATSAPP_CONVERSATIONS_QUERY_KEY] },
    (old) => {
      if (!old?.pages?.length) return old;
      const flat = flattenConversationsPages(old.pages);
      const nextFlat = mutator(flat);
      if (nextFlat === flat) return old;
      return rebuildConversationPages(old, nextFlat);
    },
  );
}

export function removeConversationFromListCache(
  queryClient: QueryClient,
  filters: ConversationsListFilters,
  conversationId: string,
): void {
  mutateWhatsAppConversationsListCache(queryClient, filters, (list) =>
    list.filter((c) => String(c._id) !== String(conversationId)),
  );
}

export function invalidateWhatsAppConversationsList(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient
    .invalidateQueries({ queryKey: [WHATSAPP_CONVERSATIONS_QUERY_KEY] })
    .then(() => undefined);
}

function mergeConversationEnrichmentFields(
  existing: Conversation,
  enriched: Conversation,
): Conversation {
  const profilePic =
    enriched.participantProfilePic ?? existing.participantProfilePic;
  const listingLinkSentCount =
    enriched.listingLinkSentCount ?? existing.listingLinkSentCount ?? 0;
  const optionsSentCount =
    enriched.optionsSentCount ?? existing.optionsSentCount ?? 0;

  if (
    profilePic === existing.participantProfilePic &&
    listingLinkSentCount === (existing.listingLinkSentCount ?? 0) &&
    optionsSentCount === (existing.optionsSentCount ?? 0)
  ) {
    return existing;
  }

  return {
    ...existing,
    ...(profilePic ? { participantProfilePic: profilePic } : {}),
    listingLinkSentCount,
    optionsSentCount,
  };
}

/** Merge profile pics and guest stats from a full-enrichment refetch into page 1. */
export function patchConversationsListFirstPageEnrichment(
  queryClient: QueryClient,
  filters: ConversationsListFilters,
  enrichedConversations: Conversation[],
): void {
  const byId = new Map(
    enrichedConversations.map((c) => [String(c._id), c]),
  );

  mutateWhatsAppConversationsListCache(queryClient, filters, (list) => {
    let changed = false;
    const next = list.map((conv) => {
      const enriched = byId.get(String(conv._id));
      if (!enriched) return conv;
      const merged = mergeConversationEnrichmentFields(conv, enriched);
      if (merged !== conv) changed = true;
      return merged;
    });
    return changed ? next : list;
  });
}

export function mutateWhatsAppMessagesCache(
  queryClient: QueryClient,
  conversationId: string,
  mutator: (messages: Message[]) => Message[],
): void {
  queryClient.setQueryData<InfiniteData<WhatsAppMessagesListPage>>(
    buildMessagesQueryKey(conversationId),
    (old) => {
      if (!old?.pages?.length) {
        // No cache yet — nothing to update.
        return old;
      }

      const flatBefore = flattenMessagesPages(old.pages);
      const nextFlat = mutator(flatBefore);
      if (nextFlat === flatBefore) return old;

      // ── Single-page fast path ────────────────────────────────────────────
      if (old.pages.length === 1) {
        return {
          ...old,
          pages: [{ ...old.pages[0], messages: nextFlat }],
        };
      }

      // ── Multi-page: try to preserve page structure ───────────────────────
      // Build a map of existing message ids and their page index so we can
      // detect pure in-place edits (status/reaction updates) vs structural changes.
      const idToPage = new Map<string, number>();
      old.pages.forEach((page, idx) => {
        for (const msg of page.messages ?? []) {
          idToPage.set(String(msg._id), idx);
          idToPage.set(String(msg.messageId), idx);
        }
      });

      const addedIds = nextFlat.filter(
        (m) =>
          !idToPage.has(String(m._id)) && !idToPage.has(String(m.messageId)),
      );
      const removedCount = flatBefore.length - nextFlat.length + addedIds.length;
      const isPureInPlaceEdit = addedIds.length === 0 && removedCount === 0;

      if (isPureInPlaceEdit) {
        // Only field values changed — rebuild each page in-place.
        const nextById = new Map(nextFlat.map((m) => [String(m._id), m]));
        const pages = old.pages.map((page) => ({
          ...page,
          messages: (page.messages ?? []).map(
            (m) => nextById.get(String(m._id)) ?? m,
          ),
        }));
        return { ...old, pages };
      }

      // New messages added or some removed: append additions to the newest page
      // (index 0, since pages are newest-first) and handle removals in-place.
      //
      // NOTE: flattenMessagesPages reverses pages before flattening, so nextFlat
      // is oldest→newest. The newest messages are at the END of nextFlat, and
      // page[0] holds the newest messages.

      const nextByIdAll = new Map(nextFlat.map((m) => [String(m._id), m]));

      const pages = old.pages.map((page) => ({
        ...page,
        // Remove deleted messages from each page
        messages: (page.messages ?? []).filter((m) =>
          nextByIdAll.has(String(m._id)),
        ),
      }));

      // Append genuinely new messages to the first (newest) page
      if (addedIds.length > 0) {
        pages[0] = {
          ...pages[0],
          messages: [...(pages[0].messages ?? []), ...addedIds],
        };
      }

      return { ...old, pages };
    },
  );
}

export function clearWhatsAppMessagesCache(
  queryClient: QueryClient,
  conversationId: string,
): void {
  queryClient.removeQueries({ queryKey: buildMessagesQueryKey(conversationId) });
}
