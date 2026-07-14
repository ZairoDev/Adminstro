/**
 * LeadGen → Sales ownership handoff.
 *
 * Rules (production-safe defaults):
 * - handedToSales unset / true / null → Sales owns (all existing chats)
 * - handedToSales === false → LeadGen-owned (created by LeadGen agents)
 *
 * Visibility restriction applies only to plain `LeadGen` so LeadGen-TeamLead
 * keeps its existing broader inbox (admin queue / supervision) unchanged.
 * Sales-family never see LeadGen-owned chats until forwarded.
 */

export const LEADGEN_WHATSAPP_ROLES = ["LeadGen", "LeadGen-TeamLead"] as const;

const SALES_OWNERSHIP_ROLES = [
  "Sales",
  "sales-intern",
  "Subscription-Sales",
  "Sales-TeamLead",
] as const;

export function isLeadGenWhatsAppRole(role: string): boolean {
  return (LEADGEN_WHATSAPP_ROLES as readonly string[]).includes(role);
}

/** Only plain LeadGen is limited to LeadGen-owned chats. */
export function isLeadGenInboxRestrictedRole(role: string): boolean {
  return role === "LeadGen";
}

export function isSalesOwnershipRole(role: string): boolean {
  return (SALES_OWNERSHIP_ROLES as readonly string[]).includes(role);
}

/** unset/true/null → Sales owns; only explicit false is LeadGen-owned. */
export function isHandedToSales(handedToSales: unknown): boolean {
  return handedToSales !== false;
}

/** Stamp only when LeadGen creates a NEW guest chat. TeamLead unchanged. */
export function leadGenCreateHandoffFields(
  role: string,
): { handedToSales?: false } {
  return isLeadGenInboxRestrictedRole(role) ? { handedToSales: false } : {};
}

export function canForwardLeadToSales(role: string): boolean {
  return isLeadGenWhatsAppRole(role);
}

export function canAccessByLeadGenHandoff(
  role: string,
  handedToSales: unknown,
): boolean {
  if (isLeadGenInboxRestrictedRole(role)) {
    return handedToSales === false;
  }
  if (isSalesOwnershipRole(role)) {
    return isHandedToSales(handedToSales);
  }
  return true;
}

/**
 * Inbox Mongo clause. Uses `$ne: false` for Sales so missing/null/true all
 * match without an expensive `$or` + `$exists` fan-out.
 */
export function applyLeadGenHandoffInboxFilter(
  query: Record<string, unknown>,
  userRole: string,
): void {
  if (isLeadGenInboxRestrictedRole(userRole)) {
    const and = (query.$and as Record<string, unknown>[]) || [];
    and.push({ handedToSales: false });
    query.$and = and;
    return;
  }

  if (isSalesOwnershipRole(userRole)) {
    const and = (query.$and as Record<string, unknown>[]) || [];
    and.push({ handedToSales: { $ne: false } });
    query.$and = and;
  }
}
