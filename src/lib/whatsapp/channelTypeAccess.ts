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
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";

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
): boolean {
  const allowed = getAllowedChannelTypes(role);
  if (allowed === null) return true; // no restriction

  // Legacy conversation without channelType — visible
  const ct = String(conversationChannelType ?? "").trim();
  if (!ct) return true;

  return allowed.includes(ct as WhatsappChannelType);
}

/**
 * Mongo $in clause for the channelType field, or null when no restriction applies.
 * Use in buildConversationVisibilityFilter to add the channelType dimension.
 */
export function buildChannelTypeVisibilityClause(
  role: string | undefined,
): Record<string, unknown> | null {
  const allowed = getAllowedChannelTypes(role);
  if (allowed === null) return null;

  return {
    $or: [
      { channelType: { $in: allowed } },
      { channelType: { $exists: false } },
      { channelType: null },
      { channelType: "" },
    ],
  };
}
