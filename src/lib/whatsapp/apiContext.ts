import {
  getAllowedPhoneIds,
  getRetargetPhoneId,
  WHATSAPP_ACCESS_ROLES,
  FULL_ACCESS_ROLES,
} from "./config";
import { getUserAreasFromToken } from "./locationAccess";
import { resolveUserAllowedPhoneIds } from "./phoneAreaConfigService";

export type WhatsAppToken = {
  id?: string;
  _id?: string;
  role?: string;
  allotedArea?: string | string[];
  name?: string;
};

/** Normalize token id and allotedArea for all WhatsApp API routes. */
export function normalizeWhatsAppToken(token: WhatsAppToken): WhatsAppToken & {
  id: string;
  allotedArea: string[];
} {
  const id = String(token.id || token._id || "");
  return {
    ...token,
    id,
    _id: id,
    allotedArea: getUserAreasFromToken(token),
  };
}

export function isWhatsAppRole(role: string): boolean {
  return (WHATSAPP_ACCESS_ROLES as readonly string[]).includes(role);
}

export function hasFullWhatsAppAccess(role: string): boolean {
  return (FULL_ACCESS_ROLES as readonly string[]).includes(role);
}

/**
 * Resolve Meta business phone IDs the user may use (lines, not inbox tabs).
 * Advert without areas gets retarget phone only.
 */
export function resolveAllowedPhoneIds(
  token: WhatsAppToken,
  opts: { retargetOnly?: boolean } = {}
): string[] {
  const normalized = normalizeWhatsAppToken(token);
  const role = normalized.role || "";
  let ids = getAllowedPhoneIds(role, normalized.allotedArea);

  if (ids.length === 0 && role === "Advert") {
    const retargetPhoneId = getRetargetPhoneId();
    if (retargetPhoneId) ids = [retargetPhoneId];
  }

  if (ids.length === 0 && opts.retargetOnly) {
    const retargetPhoneId = getRetargetPhoneId();
    if (retargetPhoneId) ids = [retargetPhoneId];
  }

  return ids;
}

/** DB + static phone access (use in API routes that must match resolvePhoneIdForLocation). */
export async function resolveAllowedPhoneIdsAsync(
  token: WhatsAppToken,
  opts: { retargetOnly?: boolean } = {},
): Promise<string[]> {
  const normalized = normalizeWhatsAppToken(token);
  const role = normalized.role || "";
  let ids = await resolveUserAllowedPhoneIds(role, normalized.allotedArea);

  if (ids.length === 0 && role === "Advert") {
    const retargetPhoneId = getRetargetPhoneId();
    if (retargetPhoneId) ids = [retargetPhoneId];
  }

  if (ids.length === 0 && opts.retargetOnly) {
    const retargetPhoneId = getRetargetPhoneId();
    if (retargetPhoneId) ids = [retargetPhoneId];
  }

  return ids;
}

export function requireWhatsAppAccess(
  token: WhatsAppToken,
  opts: { retargetOnly?: boolean } = {}
): { token: WhatsAppToken & { id: string; allotedArea: string[] }; allowedPhoneIds: string[] } | null {
  const normalized = normalizeWhatsAppToken(token);
  const role = normalized.role || "";
  if (!isWhatsAppRole(role) && role !== "Advert") return null;
  const allowedPhoneIds = resolveAllowedPhoneIds(normalized, opts);
  if (allowedPhoneIds.length === 0 && role !== "Advert") return null;
  return { token: normalized, allowedPhoneIds };
}
