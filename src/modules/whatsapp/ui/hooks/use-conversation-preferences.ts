"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";

export const conversationPreferencesQueryKey = (conversationId: string) =>
  ["whatsappConversationPreferences", conversationId] as const;

type PreferencesResponse = {
  preferredLanguageCode?: string;
  preferredLanguage?: string;
};

export function useConversationPreferences(
  conversationId: string | undefined,
  options: {
    preferredLanguageCodeOnConversation?: string;
    loadDeferred: boolean;
  },
) {
  const codeOnConversation = options.preferredLanguageCodeOnConversation?.trim();

  return useQuery<string | null>({
    queryKey: conversationPreferencesQueryKey(conversationId ?? ""),
    queryFn: async () => {
      const response = await axios.get<PreferencesResponse>(
        `/api/whatsapp/conversations/${conversationId}/preferences`,
      );
      return response.data?.preferredLanguageCode?.trim() || null;
    },
    enabled: Boolean(conversationId && !codeOnConversation && options.loadDeferred),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
