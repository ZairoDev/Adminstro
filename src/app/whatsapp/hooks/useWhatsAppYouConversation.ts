import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import type { Conversation } from "../types";

export const WHATSAPP_YOU_CONVERSATION_QUERY_KEY = [
  "whatsapp",
  "youConversation",
] as const;

export type WhatsAppYouConversationResponse = {
  success: boolean;
  conversation: Conversation | null;
};

export function useWhatsAppYouConversation(enabled: boolean) {
  return useQuery<WhatsAppYouConversationResponse>({
    queryKey: WHATSAPP_YOU_CONVERSATION_QUERY_KEY,
    queryFn: async () => {
      const response = await axios.get<WhatsAppYouConversationResponse>(
        "/api/whatsapp/conversations/you",
      );
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    enabled,
  });
}
