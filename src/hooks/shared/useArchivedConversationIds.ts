import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";

export const WHATSAPP_ARCHIVED_IDS_QUERY_KEY = ["whatsappArchivedIds"] as const;

export type ArchivedConversationIdsSnapshot = {
  archivedIds: string[];
  archivedUnreadMessageCount?: number;
};

const EMPTY_ARCHIVED_IDS: string[] = [];

export function useArchivedConversationIds(enabled = true) {
  const { data, isFetched } = useQuery<ArchivedConversationIdsSnapshot>({
    queryKey: WHATSAPP_ARCHIVED_IDS_QUERY_KEY,
    queryFn: async () => {
      const response = await axios.get(
        "/api/whatsapp/conversations/archive?idsOnly=true",
      );
      return {
        archivedIds: (response.data?.archivedIds ?? []) as string[],
        archivedUnreadMessageCount: response.data?.archivedUnreadMessageCount as
          | number
          | undefined,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return useMemo(
    () => ({
      archivedIds: data?.archivedIds ?? EMPTY_ARCHIVED_IDS,
      archivedUnreadMessageCount: data?.archivedUnreadMessageCount,
      isFetched,
    }),
    [data, isFetched],
  );
}
