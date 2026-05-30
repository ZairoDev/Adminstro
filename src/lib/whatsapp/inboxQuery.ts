import {
  FULL_ACCESS_ROLES,
  isSalesWhatsAppRole,
} from "./config";
import {
  buildConversationVisibilityFilter,
  applyInboxLocationFilter,
} from "./locationAccess";
import { canAccessWhatsAppAdminQueue } from "./participantLocationPrivileges";
import type { WhatsAppToken } from "./apiContext";
import { normalizeWhatsAppToken } from "./apiContext";

export type InboxListParams = {
  status?: string;
  adminQueue?: boolean;
  locationFilter?: string;
  retargetOnly?: boolean;
  conversationType?: string;
  search?: string;
};

export function parseInboxListParams(
  searchParams: URLSearchParams
): InboxListParams {
  return {
    status: searchParams.get("status") || "active",
    adminQueue: searchParams.get("adminQueue") === "true",
    locationFilter: searchParams.get("locationFilter")?.trim() || "",
    retargetOnly:
      searchParams.get("retargetOnly") === "1" ||
      searchParams.get("retargetOnly") === "true",
    conversationType: searchParams.get("conversationType") || "",
    search: searchParams.get("search") || "",
  };
}

/**
 * Mongo filter for unified inbox list/search — location visibility, not phone tabs.
 * Deprecated: phoneId query param is ignored (use locationFilter / adminQueue).
 */
export function buildInboxListQuery(
  token: WhatsAppToken,
  params: InboxListParams
): Record<string, unknown> {
  const normalized = normalizeWhatsAppToken(token);
  const userRole = normalized.role || "";
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);
  const query: Record<string, unknown> = {
    status: params.status || "active",
    // "Message yourself" is injected per user in GET /conversations — never list all internal rows
    source: { $ne: "internal" },
  };

  if (params.adminQueue) {
    if (!canAccessWhatsAppAdminQueue(normalized)) return { _id: null };
    const visibilityFilter = buildConversationVisibilityFilter(normalized, {
      adminQueue: true,
    });
    Object.assign(query, visibilityFilter);
  } else if (!isFullAccess) {
    const visibilityFilter = buildConversationVisibilityFilter(normalized);
    if (visibilityFilter._id === null) return { _id: null };
    Object.assign(query, visibilityFilter);
  }

  if (!params.adminQueue) {
    applyInboxLocationFilter(query, normalized, params.locationFilter || "");
  }

  if (
    params.conversationType === "owner" ||
    params.conversationType === "guest"
  ) {
    query.conversationType = params.conversationType;
  }

  if (params.retargetOnly) {
    query.isRetarget = true;
  }

  if (userRole === "Advert") {
    query.isRetarget = true;
  }

  if (isSalesWhatsAppRole(userRole)) {
    const and = (query.$and as Record<string, unknown>[]) || [];
    and.push({
      $or: [
        { isRetarget: { $ne: true } },
        { isRetarget: true, retargetStage: "handed_to_sales" },
      ],
    });
    query.$and = and;
  }

  return query;
}
