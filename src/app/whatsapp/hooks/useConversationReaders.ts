"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import type { ConversationReader } from "@/lib/whatsapp/conversationReaders";

export const conversationReadersQueryKey = (
  conversationId: string,
  refreshToken: number,
) => ["whatsappConversationReaders", conversationId, refreshToken] as const;

type ReadersResponse = {
  success: boolean;
  readers?: ConversationReader[];
};

export function useConversationReaders(
  conversationId: string | null,
  options: {
    enabled: boolean;
    refreshToken: number;
  },
) {
  return useQuery<ConversationReader[]>({
    queryKey: conversationReadersQueryKey(
      conversationId ?? "",
      options.refreshToken,
    ),
    queryFn: async () => {
      const response = await axios.get<ReadersResponse>(
        `/api/whatsapp/conversations/${conversationId}/readers`,
      );
      if (!response.data?.success) {
        throw new Error("Failed to fetch readers");
      }
      return response.data.readers ?? [];
    },
    enabled: Boolean(conversationId) && options.enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
