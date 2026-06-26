import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import { buildMessagesQueryKey } from "../lib/whatsappQueryCache";
import type { WhatsAppMessagesListPage } from "../types";

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery<WhatsAppMessagesListPage>({
    queryKey: buildMessagesQueryKey(conversationId ?? ""),
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        throw new Error("conversationId is required");
      }

      const params = new URLSearchParams({ limit: "20" });
      if (pageParam) {
        params.set("beforeMessageId", String(pageParam));
      }

      const response = await axios.get(
        `/api/whatsapp/conversations/${conversationId}/messages?${params.toString()}`,
      );
      if (!response.data?.success) {
        throw new Error("Failed to fetch messages");
      }
      return response.data as WhatsAppMessagesListPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination?.hasMore || !pagination.nextCursor?.messageId) {
        return undefined;
      }
      return pagination.nextCursor.messageId;
    },
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
