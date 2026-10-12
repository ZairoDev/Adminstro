/**
 * WhatsApp Channel-Type Visibility — Role-Based Map
 *
 * Determines which channelTypes a given employee role may see.
 * Layered on top of the existing location + rentalType visibility.
 *
 * Rules:
 * - Full-access roles (SuperAdmin/Admin/HAdmin/Developer) see ALL channel types.
 * - Other roles see a subset based on their job function.
 * - A conversation with NO channelType (legacy, pre-backfill) is visible to
 *   everyone who already passes location + rentalType checks (backward compatible).
 * - "backup" channel conversations are admin-only by default.
 *
 * Role → allowed channelTypes map:
 *   Sales / sales-intern / Sales-TeamLead  → guest (they work guest acquisition)
 *   LeadGen / LeadGen-TeamLead             → guest, support
 *   Advert                                 → guest, support
 *   owner-sheet roles (OwnerSales, etc.)   → owner
 *   Full-access                            → guest, owner, support, backup (all)
 */

import type { WhatsappChannelType } from "@/models/whatsappChannel";
import { FULL_ACCESS_ROLES, WHATSAPP_ACCESS_ROLES } from "@/lib/whatsapp/config";

/** Roles that may open owner threads (owner sheet, add owner) in their allotted area. */
const OWNER_OUTREACH_ROLES: readonly string[] = [
  "Sales",
  "sales-intern",
  "Sales-TeamLead",
  "OwnerSales",
  "OwnerLeadGen",
  "OwnerAdvert",
];

function effectiveConversationChannelType(params: {
  channelType?: unknown;
  conversationType?: unknown;
}): WhatsappChannelType | null {
  if (params.conversationType === "guest") return "guest";
  if (params.conversationType === "owner") return "owner";
  const ct = String(params.channelType ?? "").trim();
  return ct ? (ct as WhatsappChannelType) : null;
}

const CHANNEL_TYPE_ROLE_MAP: Record<string, WhatsappChannelType[]> = {
  // Guest-facing sales & lead gen
  Sales: ["guest"],
  "sales-intern": ["guest"],
  "Sales-TeamLead": ["guest"],
  LeadGen: ["guest", "support"],
  "LeadGen-TeamLead": ["guest", "support"],
  // Advert/retarget team sees guests + support but NOT owner
  Advert: ["guest", "support"],
  // Owner-sheet roles
  OwnerSales: ["owner"],
  OwnerLeadGen: ["owner"],
  OwnerAdvert: ["owner"],
};

/**
 * Returns the channelTypes visible to this role.
 * Returns null when NO restriction applies (full-access role or unknown role
 * that should receive all types for backward compatibility).
 */
export function getAllowedChannelTypes(role: string | undefined): WhatsappChannelType[] | null {
  const r = (role || "").trim();
  if (!r) return null;
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(r)) return null; // all types

  const mapped = CHANNEL_TYPE_ROLE_MAP[r];
  if (!mapped) {
    // Unknown roles (e.g. future roles, coordinator) get backward-compat: see all.
    return null;
  }
  return mapped;
}

/**
 * Runtime check: may a user with this role see a conversation of the given channelType?
 *
 * Returns true (visible) in all backward-compatible cases:
 * - Full-access role → always true
 * - No channelType on conversation (legacy) → true
 * - Role not in map (unknown) → true (backward compat)
 */
export function channelTypeVisibleToRole(
  role: string | undefined,
  conversationChannelType: unknown,
  conversationType?: unknown,
): boolean {
  const r = (role || "").trim();
  const allowed = getAllowedChannelTypes(r);
  if (allowed === null) return true;

  const effective = effectiveConversationChannelType({
    channelType: conversationChannelType,
    conversationType,
  });
  if (!effective) return true;

  if (allowed.includes(effective)) return true;

  // Owner-sheet / add-owner: Sales-family roles may access owner threads in
  // their allotted area (location gate is applied separately).
  if (
    effective === "owner" &&
    OWNER_OUTREACH_ROLES.includes(r) &&
    (WHATSAPP_ACCESS_ROLES as readonly string[]).includes(r)
  ) {
    return true;
  }

  return false;
}

/**
 * Mongo $in clause for the channelType field, or null when no restriction applies.
 * Use in buildConversationVisibilityFilter to add the channelType dimension.
 */
export function buildChannelTypeVisibilityClause(
  role: string | undefined,
): Record<string, unknown> | null {
  const r = (role || "").trim();
  const allowed = getAllowedChannelTypes(r);
  if (allowed === null) return null;

  const orClauses: Record<string, unknown>[] = [
    { channelType: { $in: allowed } },
    { channelType: { $exists: false } },
    { channelType: null },
    { channelType: "" },
  ];

  // Owner outreach roles see explicit owner threads even when channelType is guest/stale.
  if (
    OWNER_OUTREACH_ROLES.includes(r) &&
    (WHATSAPP_ACCESS_ROLES as readonly string[]).includes(r) &&
    !allowed.includes("owner")
  ) {
    orClauses.push({ conversationType: "owner" });
  }

  const guestOwnerTypes = allowed.filter(
    (t): t is "guest" | "owner" => t === "guest" || t === "owner",
  );
  if (guestOwnerTypes.length > 0) {
    orClauses.push({ conversationType: { $in: guestOwnerTypes } });
  }

  return { $or: orClauses };
}
