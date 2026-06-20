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

import { toDisplayCity } from "@/lib/city-normalizer";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { getPhoneIdsForUserAreasSync } from "@/lib/whatsapp/phoneAreaConfigService";
import {
  canAccessWhatsAppAdminQueue,
  getUserScopedLocationKeys,
} from "@/lib/whatsapp/participantLocationPrivileges";
import {
  buildRentalTypeVisibilityClause,
  rentalTypeVisibleToUser,
} from "@/lib/whatsapp/rentalTypeAccess";
import {
  buildChannelTypeVisibilityClause,
  channelTypeVisibleToRole,
} from "@/lib/whatsapp/channelTypeAccess";
import Query from "@/models/query";
import {
  SUPERADMIN_INBOX_LOCATION_ALL,
  SUPERADMIN_DEFAULT_INBOX_LOCATION,
} from "@/lib/whatsapp/locationConstants";

export {
  SUPERADMIN_INBOX_LOCATION_ALL,
  SUPERADMIN_DEFAULT_INBOX_LOCATION,
} from "@/lib/whatsapp/locationConstants";

type VisibilityUser = {
  role?: string;
  email?: string;
  allotedArea?: string | string[];
  rentalType?: unknown;
};

/**
 * Append rental-type and channelType restrictions (if any) to a Mongo visibility filter.
 * Uses `$and` so it never collides with a search `$or` (name/phone) that
 * callers assign later — preventing visibility leaks during search.
 */
function applyVisibilityFilters(
  filter: Record<string, unknown>,
  user: VisibilityUser,
): Record<string, unknown> {
  const and = Array.isArray(filter.$and)
    ? (filter.$and as Record<string, unknown>[])
    : [];

  const rentalClause = buildRentalTypeVisibilityClause(user.role, user.rentalType);
  if (rentalClause) and.push(rentalClause);

  const channelClause = buildChannelTypeVisibilityClause(user.role);
  if (channelClause) and.push(channelClause);

  if (and.length > 0) filter.$and = and;
  return filter;
}

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

/** Match participant city — lowercase-normalize keys and display labels before compare. */
function buildParticipantLocationMatchClause(
  normalizedAreas: string[],
): Record<string, unknown> {
  if (normalizedAreas.length === 0) return {};

  const matchLower = (field: string) => ({
    $expr: {
      $or: normalizedAreas.map((area) => ({
        $eq: [
          {
            $toLower: {
              $trim: { input: { $ifNull: [`$${field}`, ""] } },
            },
          },
          area,
        ],
      })),
    },
  });

  return {
    $or: [matchLower("participantLocationKey"), matchLower("participantLocation")],
  };
}

function buildWhatsappChannelIdVisibilityBranch(
  accessibleChannelIds: string[],
  normalizedAreas: string[],
): Record<string, unknown> {
  const base = { whatsappChannelId: { $in: accessibleChannelIds } };
  if (normalizedAreas.length === 0) return base;
  const locationClause = buildParticipantLocationMatchClause(normalizedAreas);
  if (!("$or" in locationClause)) return base;
  return { $and: [base, locationClause] };
}

const UNALLOCATED_AREA_SKIP_LOCATION_CHECK: readonly string[] = [
  "Sales",
  "sales-intern",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
];

/**
 * Runtime location check — mirrors Mongo staff location clauses.
 * Allocated staff must have an explicit area match; unset location is excluded.
 */
export function participantLocationMatchesUserAreas(
  conversation: {
    participantLocationKey?: string;
    participantLocation?: string;
  },
  userAreas: string[],
  role = "",
): boolean {
  const normalizedAreas = normalizeAreas(userAreas);

  const rawKey = conversation.participantLocationKey?.trim() || "";
  const rawDisplay = conversation.participantLocation?.trim() || "";
  const conversationKey = rawKey
    ? locationKeyFromDisplay(rawKey)
    : rawDisplay
      ? locationKeyFromDisplay(rawDisplay)
      : "";

  if (!conversationKey) {
    if (
      normalizedAreas.length === 0 &&
      UNALLOCATED_AREA_SKIP_LOCATION_CHECK.includes(role)
    ) {
      return true;
    }
    return false;
  }

  if (normalizedAreas.length === 0) {
    if (UNALLOCATED_AREA_SKIP_LOCATION_CHECK.includes(role)) return true;
    return false;
  }

  return normalizedAreas.includes(conversationKey);
}

/**
 * Async runtime check — mirrors buildConversationVisibilityFilterAsync.
 * Use in API routes instead of duplicating phone/location/channel rules.
 */
export async function conversationMatchesStaffVisibilityAsync(
  user: VisibilityUser,
  conversation: Record<string, unknown>,
): Promise<boolean> {
  const role = user.role || "";

  if (
    !rentalTypeVisibleToUser(role, user.rentalType, conversation.rentalType)
  ) {
    return false;
  }

  if (!channelTypeVisibleToRole(role, conversation.channelType, conversation.conversationType)) {
    return false;
  }

  const userAreas = getUserAreasFromToken(user);
  const { resolveUserAllowedPhoneIds, getAccessibleChannelIds, canUserAccessPhoneId } =
    await import("@/lib/whatsapp/phoneAreaConfigService");

  const allowedPhoneIds = await resolveUserAllowedPhoneIds(role, userAreas);
  const accessibleChannelIds = await getAccessibleChannelIds(
    role,
    userAreas,
    user.rentalType,
  );

  if (
    conversation.whatsappChannelId &&
    accessibleChannelIds.includes(String(conversation.whatsappChannelId))
  ) {
    const normalizedAreas = normalizeAreas(userAreas);
    if (normalizedAreas.length === 0) return true;
    return participantLocationMatchesUserAreas(
      conversation as { participantLocationKey?: string; participantLocation?: string },
      userAreas,
      role,
    );
  }

  const phoneId = String(conversation.businessPhoneId || "").trim();
  if (!phoneId) return false;

  const phoneOk =
    allowedPhoneIds.includes(phoneId) ||
    (await canUserAccessPhoneId(phoneId, role, userAreas, {
      userRentalType: user.rentalType,
    }));

  if (!phoneOk) return false;

  return participantLocationMatchesUserAreas(
    conversation as { participantLocationKey?: string; participantLocation?: string },
    userAreas,
    role,
  );
}

function buildScopedStaffVisibilityFilter(
  user: VisibilityUser,
  allowedPhoneIds: string[],
): Record<string, unknown> {
  const role = user.role || "";

  if (allowedPhoneIds.length === 0) {
    return { _id: null };
  }

  const normalizedAreas = normalizeAreas(getUserAreasFromToken(user));
  if (normalizedAreas.length === 0) {
    const unallocatedBypassRoles: readonly string[] = [
      "Sales", "sales-intern", "Sales-TeamLead", "LeadGen", "LeadGen-TeamLead",
    ];
    if (unallocatedBypassRoles.includes(role)) {
      return applyVisibilityFilters(
        { businessPhoneId: { $in: allowedPhoneIds } },
        user,
      );
    }
    return { _id: null };
  }

  return applyVisibilityFilters(
    {
      $and: [
        { businessPhoneId: { $in: allowedPhoneIds } },
        buildParticipantLocationMatchClause(normalizedAreas),
      ],
    },
    user,
  );
}

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
  user: VisibilityUser,
  opts: { adminQueue?: boolean } = {}
): Record<string, unknown> {
  const role = user.role || "";
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(role);
  const userAreas = getUserAreasFromToken(user);
  const allowedPhoneIds = getPhoneIdsForUserAreasSync(role, userAreas);

  // Admin Queue mode — full-access roles + location coordinator email
  if (opts.adminQueue) {
    if (!canAccessWhatsAppAdminQueue(user)) return { _id: null };
    return buildAdminQueueFilter();
  }

  // Full-access roles: no location constraint beyond phone (if they chose a specific phone)
  if (isFullAccess) {
    return {};
  }

  return buildScopedStaffVisibilityFilter(user, allowedPhoneIds);
}

/**
 * Async version of buildConversationVisibilityFilter with an additional OR branch:
 * conversations whose whatsappChannelId belongs to a channel accessible to the user
 * are always visible, regardless of the (possibly stale) businessPhoneId.
 *
 * This ensures that conversations created before a number migration remain visible
 * after the phone is replaced — their frozen whatsappChannelId bridges the gap.
 */
export async function buildConversationVisibilityFilterAsync(
  user: VisibilityUser,
  opts: { adminQueue?: boolean } = {},
): Promise<Record<string, unknown>> {
  const { getAccessibleChannelIds, resolveUserAllowedPhoneIds } = await import(
    "@/lib/whatsapp/phoneAreaConfigService"
  );

  const role = user.role || "";
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(role);

  if (opts.adminQueue) {
    if (!canAccessWhatsAppAdminQueue(user)) return { _id: null };
    return buildAdminQueueFilter();
  }

  if (isFullAccess) return {};

  const userAreas = getUserAreasFromToken(user);
  const allowedPhoneIds = await resolveUserAllowedPhoneIds(role, userAreas);
  const accessibleChannelIds = await getAccessibleChannelIds(
    role,
    userAreas,
    user.rentalType,
  );

  const normalizedAreas = normalizeAreas(userAreas);

  const syncFilter = buildScopedStaffVisibilityFilter(user, allowedPhoneIds);

  if ("_id" in syncFilter && syncFilter._id === null) {
    if (accessibleChannelIds.length === 0) return syncFilter;
    return applyVisibilityFilters(
      buildWhatsappChannelIdVisibilityBranch(accessibleChannelIds, normalizedAreas),
      user,
    );
  }

  if (accessibleChannelIds.length === 0) return syncFilter;

  return {
    $or: [
      syncFilter,
      applyVisibilityFilters(
        buildWhatsappChannelIdVisibilityBranch(accessibleChannelIds, normalizedAreas),
        user,
      ),
    ],
  };
}

/**
 * Inbox: optional filter by participant city (display name or key).
 * SuperAdmin: any configured city; multi-area staff: only their assigned keys.
 */
export function applyInboxLocationFilter(
  query: Record<string, unknown>,
  user: VisibilityUser,
  locationFilter: string | null | undefined
): void {
  const raw = locationFilter?.trim();
  if (!raw) return;
  const key = locationKeyFromDisplay(raw);
  if (!key || key === SUPERADMIN_INBOX_LOCATION_ALL) return;

  const role = (user.role || "").trim();
  if (role === "SuperAdmin") {
    query.participantLocationKey = key;
    return;
  }

  const scopedKeys = getUserScopedLocationKeys(user);
  if (scopedKeys.length > 1 && scopedKeys.includes(key)) {
    query.participantLocationKey = key;
  }
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
  user: VisibilityUser,
  conversation: {
    businessPhoneId?: string;
    source?: string;
    participantLocationKey?: string;
    participantLocation?: string;
    rentalType?: unknown;
    channelType?: unknown;
    conversationType?: "owner" | "guest";
  },
  opts: { skipPhoneCheck?: boolean; skipLocationCheck?: boolean } = {},
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

  // Rental-type gate (backward compatible).
  if (!rentalTypeVisibleToUser(role, user.rentalType, conversation.rentalType)) {
    return false;
  }

  // Channel-type gate (backward compatible: legacy conversations without channelType pass).
  if (!channelTypeVisibleToRole(role, conversation.channelType, conversation.conversationType)) {
    return false;
  }

  const userAreas = getUserAreasFromToken(user as any);
  const allowedPhoneIds = getPhoneIdsForUserAreasSync(role, userAreas);

  // Phone check
  if (
    !opts.skipPhoneCheck &&
    conversation.businessPhoneId &&
    !allowedPhoneIds.includes(conversation.businessPhoneId)
  ) {
    // Cache may be cold — allow if location matches allotted area for WhatsApp roles
    const normalizedAreas = normalizeAreas(userAreas);
    const fallbackKey =
      conversation.participantLocationKey?.trim()
        ? locationKeyFromDisplay(conversation.participantLocationKey)
        : conversation.participantLocation?.trim()
          ? locationKeyFromDisplay(conversation.participantLocation)
          : "";
    const locationOk =
      fallbackKey &&
      (normalizedAreas.includes(fallbackKey) ||
        (normalizedAreas.length === 0 &&
          ["Sales", "sales-intern", "Sales-TeamLead", "LeadGen", "LeadGen-TeamLead"].includes(
            role,
          )));
    if (!locationOk) return false;
  }

  // When inbox visibility came from whatsappChannelId (migrated phone), do not
  // re-fail on participantLocationKey — mirrors buildConversationVisibilityFilterAsync.
  if (opts.skipLocationCheck) {
    return true;
  }

  return participantLocationMatchesUserAreas(conversation, userAreas, role);
}

// ─────────────────────────────────────────────────────────────────────────────
// Create-path validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a non-admin user is allowed to create/associate a conversation
 * with a given location and phone. Throws with { message, status } on failure.
 */
// Roles that are allowed to create conversations for any location when they
// have no allotedArea configured — mirrors the UNALLOCATED_AREA_USES_ALL_LINES
// bypass in config.ts so the phone-access and location-key checks are consistent.
export function assertLocationAllowedForCreate(
  user: { role?: string; allotedArea?: string | string[] },
  location: string,
  _phoneId: string
): void {
  const role = user.role || "";
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) return;

  const userAreas = getUserAreasFromToken(user as any);

  const locationKey = locationKeyFromDisplay(location);
  const normalizedAreas = normalizeAreas(userAreas);

  // When this role has no configured areas we granted them all phone lines
  // (UNALLOCATED_AREA_USES_ALL_LINES in config.ts). Apply the same bypass
  // to the location-key check so the two guards stay in sync.
  if (normalizedAreas.length === 0 && UNALLOCATED_AREA_SKIP_LOCATION_CHECK.includes(role)) {
    return;
  }

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
      $or: [{ phoneNo: digits }, { phoneNo: `+${digits}` }],
      location: { $exists: true, $nin: [null, ""] },
    })
      .select("location")
      .lean() as { location?: string } | null;

    return lead?.location?.trim() || null;
  } catch {
    return null;
  }
}
