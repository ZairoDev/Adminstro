/**
 * WhatsApp Location Visibility — Single Source of Truth
 *
 * Canonical access contract:
 *   Visibility = PhoneAccess AND participantLocationKeyAccess
 *   Ownership  = assignedAgent (separate concern — never used for list/search visibility)
 *   AdminQueue = participantLocationKey empty / missing
 *
 * All surfaces (inbox, search, notifications, sockets, send, call) must use
 * buildConversationVisibilityFilter() for Mongo queries and
 * canUserSeeConversation() for runtime per-document checks.
 */

import { getAllowedPhoneIds, FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import Query from "@/models/query";

export {
  normalizeAreas,
  locationKeyFromDisplay,
  getUserAreasFromToken,
} from "@/lib/whatsapp/areaTokenUtils";
import {
  getUserAreasFromToken,
  locationKeyFromDisplay,
  normalizeAreas,
} from "@/lib/whatsapp/areaTokenUtils";

// ─────────────────────────────────────────────────────────────────────────────
// Mongo filter builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a MongoDB filter that enforces the dual visibility rule:
 *   (phone ∈ allowedPhoneIds) AND (locationKey ∈ userNormalizedAreas)
 *
 * For full-access roles the location constraint is omitted — they see every
 * keyed chat on any phone. They must separately opt-in to the Admin Queue
 * via buildAdminQueueFilter().
 *
 * @param user  Token-like object with { role, allotedArea }
 * @param opts  adminQueue — if true, skip the location key constraint and
 *              instead require an empty/missing key (Admin Queue mode).
 */
export function buildConversationVisibilityFilter(
  user: { role?: string; allotedArea?: string | string[] },
  opts: { adminQueue?: boolean } = {}
): Record<string, unknown> {
  const role = user.role || "";
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(role);
  const userAreas = getUserAreasFromToken(user as any);
  const allowedPhoneIds = getAllowedPhoneIds(role, userAreas);

  // Admin Queue mode — only full-access roles may query this
  if (opts.adminQueue) {
    if (!isFullAccess) return { _id: null }; // deny
    return buildAdminQueueFilter();
  }

  // Full-access roles: no location constraint beyond phone (if they chose a specific phone)
  if (isFullAccess) {
    // Return empty filter — phone scoping handled by callers via phoneIdFilter
    return {};
  }

  if (allowedPhoneIds.length === 0) {
    return { _id: null };
  }

  const normalizedAreas = normalizeAreas(userAreas);
  if (normalizedAreas.length === 0) {
    // No areas configured on this user — they see nothing
    return { _id: null };
  }

  return {
    businessPhoneId: { $in: allowedPhoneIds },
    participantLocationKey: { $in: normalizedAreas },
  };
}

/**
 * MongoDB filter selecting conversations without a location key set.
 * Used by full-access roles to view the Admin Queue.
 */
export const SUPERADMIN_INBOX_LOCATION_ALL = "all";

/**
 * SuperAdmin inbox: optional filter by participant city (display name or key).
 * No-op for other roles, when value is "all", or when empty.
 */
export function applySuperAdminInboxLocationFilter(
  query: Record<string, unknown>,
  userRole: string,
  locationFilter: string | null | undefined
): void {
  if (userRole !== "SuperAdmin") return;
  const raw = locationFilter?.trim();
  if (!raw) return;
  const key = locationKeyFromDisplay(raw);
  if (!key || key === SUPERADMIN_INBOX_LOCATION_ALL) return;
  query.participantLocationKey = key;
}

export function buildAdminQueueFilter(): Record<string, unknown> {
  return {
    $or: [
      { participantLocationKey: { $exists: false } },
      { participantLocationKey: "" },
      { participantLocationKey: null },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime visibility check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synchronous check — can this user see this conversation?
 * Used by access.ts and socket emit guards.
 *
 * Rules:
 * 1. Internal-source conversations are always visible.
 * 2. Full-access roles see everything (including missing location key).
 * 3. Others need: phone ∈ allowed AND locationKey ∈ normalizedUserAreas.
 */
export function canUserSeeConversation(
  user: { role?: string; allotedArea?: string | string[] },
  conversation: { businessPhoneId?: string; source?: string; participantLocationKey?: string }
): boolean {
  // Internal conversations are always visible
  if (
    conversation.source === "internal" ||
    conversation.businessPhoneId === "internal-you"
  ) {
    return true;
  }

  const role = user.role || "";
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(role);

  if (isFullAccess) return true;

  const userAreas = getUserAreasFromToken(user as any);
  const allowedPhoneIds = getAllowedPhoneIds(role, userAreas);

  // Phone check
  if (conversation.businessPhoneId && !allowedPhoneIds.includes(conversation.businessPhoneId)) {
    return false;
  }

  // Location key check — empty key means Admin Queue: city users cannot see
  const key = conversation.participantLocationKey || "";
  if (!key) return false;

  const normalizedAreas = normalizeAreas(userAreas);
  return normalizedAreas.includes(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Create-path validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a non-admin user is allowed to create/associate a conversation
 * with a given location and phone. Throws with { message, status } on failure.
 */
export function assertLocationAllowedForCreate(
  user: { role?: string; allotedArea?: string | string[] },
  location: string,
  phoneId: string
): void {
  const role = user.role || "";
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) return;

  const userAreas = getUserAreasFromToken(user as any);
  const allowedPhoneIds = getAllowedPhoneIds(role, userAreas);

  if (!allowedPhoneIds.includes(phoneId)) {
    const err: { message: string; status: number } = {
      message: "You don't have access to this WhatsApp phone line",
      status: 403,
    };
    throw err;
  }

  const locationKey = locationKeyFromDisplay(location);
  const normalizedAreas = normalizeAreas(userAreas);

  if (locationKey && !normalizedAreas.includes(locationKey)) {
    const err: { message: string; status: number } = {
      message: "Participant location is outside your assigned areas",
      status: 403,
    };
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook lead lookup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a lead's location from the Query (CRM) model by participant phone number.
 * Returns the display location string if found, or null.
 * Used by the inbound webhook to backfill participantLocation on new conversations.
 */
export async function resolveLocationFromLeadPhone(
  participantPhone: string
): Promise<string | null> {
  if (!participantPhone) return null;
  const digits = participantPhone.replace(/\D/g, "");
  if (!digits) return null;

  try {
    const lead = await Query.findOne({
      $or: [
        { phone: digits },
        { phone: `+${digits}` },
        { whatsappNumber: digits },
        { whatsappNumber: `+${digits}` },
      ],
      location: { $exists: true, $nin: [null, ""] },
    })
      .select("location")
      .lean() as { location?: string } | null;

    return lead?.location?.trim() || null;
  } catch {
    return null;
  }
}
