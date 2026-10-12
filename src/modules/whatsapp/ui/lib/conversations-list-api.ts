import axios from "@/util/axios";
import type {
  ConversationsListFilters,
  WhatsAppConversationsListPage,
} from "../types";

export type ConversationsListRequestOptions = {
  cursor?: string;
  /** When false, skips lead profile picture lookup (faster first paint). */
  profilePics?: boolean;
  /** When false, skips guest outbound stats aggregation. */
  guestStats?: boolean;
  /** When true, includes unread badge count on first list fetch only. */
  includeUnread?: boolean;
};

/** Build query string for GET /api/whatsapp/conversations. */
export function buildConversationsListSearchParams(
  filters: ConversationsListFilters,
  options: ConversationsListRequestOptions = {},
): URLSearchParams {
  const params = new URLSearchParams();
  params.append("limit", "25");

  if (filters.search) {
    params.append("search", filters.search);
  } else if (options.cursor) {
    params.append("cursor", options.cursor);
  }

  if (filters.retargetOnly) {
    params.append("retargetOnly", "1");
  }
  if (filters.labelFilter) {
    params.append("labelFilter", filters.labelFilter);
  }
  if (filters.adminQueue) {
    params.append("adminQueue", "true");
  } else if (filters.locationFilter) {
    params.append("locationFilter", filters.locationFilter);
  }

  if (options.profilePics === false) {
    params.append("profilePics", "false");
  }
  if (options.guestStats === false) {
    params.append("guestStats", "false");
  }
  if (options.includeUnread) {
    params.append("includeUnread", "true");
  }

  return params;
}

/** Refetch page 1 with full enrichment (profile pics + guest stats). */
export async function fetchConversationsFirstPageFullEnrichment(
  filters: ConversationsListFilters,
): Promise<WhatsAppConversationsListPage> {
  const params = buildConversationsListSearchParams(filters);
  const response = await axios.get<WhatsAppConversationsListPage>(
    `/api/whatsapp/conversations?${params.toString()}`,
  );
  if (!response.data?.success) {
    throw new Error("Failed to fetch conversation enrichment");
  }
  return response.data;
}
