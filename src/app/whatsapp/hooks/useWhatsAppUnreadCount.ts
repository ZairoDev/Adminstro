import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import {
  buildUnreadCountQueryKey,
  type UnreadCountQueryFilters,
} from "../lib/whatsappQueryCache";

export type WhatsAppUnreadCountResponse = {
  success: boolean;
  unreadCount: number;
};

export function useWhatsAppUnreadCount(filters: UnreadCountQueryFilters) {
  return useQuery<WhatsAppUnreadCountResponse>({
    queryKey: buildUnreadCountQueryKey(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.retargetOnly) {
        params.retargetOnly = "1";
      }
      if (filters.adminQueue) {
        params.adminQueue = "true";
      } else if (filters.locationFilter) {
        params.locationFilter = filters.locationFilter;
      }

      const response = await axios.get<WhatsAppUnreadCountResponse>(
        "/api/whatsapp/conversations/unread-count",
        { params },
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: filters.enabled,
  });
}
