import { normalizePhone } from "@/modules/whatsapp/services/normalize-phone";

export type InboundContact = {
  wa_id?: unknown;
  user_id?: unknown;
  parent_user_id?: unknown;
  profile?: { name?: unknown; username?: unknown };
};

export type InboundIdentityMessage = {
  from?: unknown;
  from_user_id?: unknown;
  from_parent_user_id?: unknown;
};

export type InboundIdentity = {
  phone: string | null;
  bsuid: string | null;
  username: string | null;
};

function asString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

/** A WhatsApp phone is digits only, 7–15 long. BSUIDs contain a dot and are longer. */
export function isWhatsAppPhone(raw: string): boolean {
  if (!raw || raw.includes(".")) return false;
  const digits = normalizePhone(raw);
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Meta omits `from` / `wa_id` when the person uses a WhatsApp username and
 * this business line cannot share their phone. The reply still includes
 * `from_user_id` (BSUID). Status webhooks for the template we sent usually
 * still include both `recipient_id` and `recipient_user_id`.
 */
export function resolveInboundIdentity(
  message: InboundIdentityMessage,
  contact?: InboundContact | null,
): InboundIdentity {
  const fromRaw = asString(message.from);
  const waRaw = asString(contact?.wa_id);
  const phone = isWhatsAppPhone(fromRaw)
    ? normalizePhone(fromRaw)
    : isWhatsAppPhone(waRaw)
      ? normalizePhone(waRaw)
      : null;

  const bsuid =
    asString(message.from_user_id) ||
    asString(contact?.user_id) ||
    asString(message.from_parent_user_id) ||
    asString(contact?.parent_user_id) ||
    (fromRaw.includes(".") ? fromRaw : "") ||
    (waRaw.includes(".") ? waRaw : "") ||
    "";

  const username = asString(contact?.profile?.username);
  return {
    phone,
    bsuid: bsuid || null,
    username: username || null,
  };
}
