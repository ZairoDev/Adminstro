import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import axios from "@/util/axios";
import {
  buildConversationsQueryKey,
  sortConversationsList,
} from "../lib/whatsappQueryCache";
import { buildConversationsListSearchParams } from "../lib/conversationsListApi";
import type {
  Conversation,
  ConversationsListFilters,
  WhatsAppConversationsListPage,
} from "../types";
import type { WhatsAppPhoneMaskRules } from "@/lib/whatsapp/phoneMask";

function dedupeConversations(conversations: Conversation[]): Conversation[] {
  return Array.from(
    new Map(conversations.map((c) => [String(c._id), c])).values(),
  );
}

export function useConversationsList(filters: ConversationsListFilters) {
  return useInfiniteQuery<WhatsAppConversationsListPage>({
    queryKey: buildConversationsQueryKey(filters),
    queryFn: async ({ pageParam }) => {
      const isFirstPage = !pageParam;
      const params = buildConversationsListSearchParams(filters, {
        cursor: pageParam ? String(pageParam) : undefined,
        // Fast first paint: skip non-critical enrichments on the initial page.
        profilePics: isFirstPage ? false : undefined,
        guestStats: isFirstPage ? false : undefined,
        includeUnread: isFirstPage,
      });

      const response = await axios.get(
        `/api/whatsapp/conversations?${params.toString()}`,
      );
      if (!response.data?.success) {
        throw new Error("Failed to fetch conversations");
      }

      const page = response.data as WhatsAppConversationsListPage;
      return {
        ...page,
        conversations: dedupeConversations(page.conversations ?? []),
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination?.hasMore || !pagination.nextCursor) return undefined;
      return pagination.nextCursor;
    },
    enabled: filters.enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export type ConversationsListMeta = {
  phoneMaskRules?: WhatsAppPhoneMaskRules;
  archivedCount?: number;
  counts?: WhatsAppConversationsListPage["counts"];
};

export function extractConversationsListMeta(
  pages: WhatsAppConversationsListPage[] | undefined,
): ConversationsListMeta {
  const first = pages?.[0];
  return {
    phoneMaskRules: first?.phoneMaskRules,
    archivedCount: first?.archivedCount,
    counts: first?.counts,
  };
}

export function mergeOpenConversationIntoList(
  conversations: Conversation[],
  openConversation: Conversation | null,
): Conversation[] {
  if (!openConversation?._id) return conversations;
  const openId = String(openConversation._id);
  if (conversations.some((c) => String(c._id) === openId)) {
    return conversations;
  }
  return sortConversationsList([openConversation, ...conversations]);
}
