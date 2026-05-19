import { FULL_ACCESS_ROLES } from "./config";

export type WhatsAppPhoneMaskRules = {
  maskOwnerPhones: boolean;
  maskGuestPhones: boolean;
};

export type ConversationPhoneType = "owner" | "guest" | undefined;

/** Last 4 digits visible; e.g. 9170934520 → ******4520 */
const VISIBLE_TAIL_DIGIT_COUNT = 4;

/** Strip to digits for comparison. */
export function normalizePhoneDigits(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

export function isAlreadyMaskedPhone(value: string): boolean {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return /\*{4,}/.test(trimmed);
}

/**
 * Mask phone: last 4 digits visible, all leading digits as asterisks.
 * e.g. 9170934520 → ******4520
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (isAlreadyMaskedPhone(raw)) return raw;

  const hasPlus = raw.startsWith("+");
  const cleaned = normalizePhoneDigits(raw);

  if (cleaned.length <= VISIBLE_TAIL_DIGIT_COUNT) {
    const allMasked = "*".repeat(Math.max(cleaned.length, 4));
    return hasPlus ? `+${allMasked}` : allMasked;
  }

  const masked =
    "*".repeat(cleaned.length - VISIBLE_TAIL_DIGIT_COUNT) +
    cleaned.slice(-VISIBLE_TAIL_DIGIT_COUNT);

  return hasPlus ? `+${masked}` : masked;
}

/** Mask phone numbers embedded in message text (e.g. "Hi +91 9170939951"). */
export function maskPhoneNumbersInText(text: string): string {
  const input = String(text || "");
  if (!input || !/\d/.test(input)) return input;

  return input.replace(
    /\+?\s*91[\s\-]?\d{10}|\+\d{11,15}|\b\d{10,12}\b/g,
    (segment) => {
      if (isAlreadyMaskedPhone(segment)) return segment;
      const compact = segment.replace(/\s/g, "");
      return maskPhoneNumber(compact);
    },
  );
}

/** True when text is mostly a phone number (used as contact title). */
export function looksLikePhoneNumber(value: string): boolean {
  if (isAlreadyMaskedPhone(value)) return false;
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  const digits = normalizePhoneDigits(trimmed);
  if (digits.length < 7 || digits.length > 15) return false;
  const nonDigit = trimmed.replace(/[\d\s+\-().]/g, "");
  return nonDigit.length === 0;
}

export function phonesMatchLoosely(a: string, b: string): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  if (isAlreadyMaskedPhone(a) || isAlreadyMaskedPhone(b)) return false;
  if (da === db) return true;
  const minLen = 7;
  if (da.length >= minLen && db.length >= minLen) {
    return da.slice(-minLen) === db.slice(-minLen);
  }
  return da.endsWith(db) || db.endsWith(da);
}

/**
 * When masking applies, replace a contact title that is really a phone number
 * with the masked phone (e.g. no saved name → list shows number as title).
 */
export function getMaskedContactTitle(
  participantName: string | undefined,
  participantPhone: string,
  conversationType: ConversationPhoneType,
  rules: WhatsAppPhoneMaskRules,
  userRole: string,
): string {
  const maskedPhone = getDisplayPhone(
    participantPhone,
    conversationType,
    rules,
    userRole,
  );
  const shouldMask = shouldMaskConversationPhone(conversationType, rules, userRole);

  if (!shouldMask) {
    return participantName?.trim() || maskedPhone;
  }

  const name = participantName?.trim() || "";
  if (!name) return maskedPhone;
  if (looksLikePhoneNumber(name) || phonesMatchLoosely(name, participantPhone)) {
    return maskedPhone;
  }
  return name;
}

/** Sidebar/header title: real names stay; missing name or phone-as-name → masked number. */
export function resolveConversationDisplayLabel(
  params: {
    participantName?: string;
    participantPhone: string;
    whatsappName?: string;
    conversationType?: ConversationPhoneType;
    isInternal?: boolean;
  },
  rules: WhatsAppPhoneMaskRules,
  userRole: string,
): { title: string; maskedPhone: string } {
  if (params.isInternal) {
    return { title: "You", maskedPhone: "" };
  }

  const maskedPhone = getDisplayPhone(
    params.participantPhone,
    params.conversationType,
    rules,
    userRole,
  );
  const savedName = params.participantName?.trim();
  const whatsappName = params.whatsappName?.trim();

  let combined: string | null = null;
  if (savedName && whatsappName && whatsappName !== savedName) {
    combined = `${savedName} (${whatsappName})`;
  } else if (savedName) {
    combined = savedName;
  } else if (whatsappName) {
    combined = whatsappName;
  }

  if (!combined) {
    return { title: maskedPhone, maskedPhone };
  }

  const shouldMask = shouldMaskConversationPhone(
    params.conversationType,
    rules,
    userRole,
  );
  if (!shouldMask) {
    return { title: combined, maskedPhone };
  }

  if (
    looksLikePhoneNumber(combined) ||
    phonesMatchLoosely(combined, params.participantPhone)
  ) {
    return { title: maskedPhone, maskedPhone };
  }

  if (savedName && phonesMatchLoosely(savedName, params.participantPhone)) {
    const title =
      whatsappName && whatsappName !== savedName
        ? `${maskedPhone} (${whatsappName})`
        : maskedPhone;
    return { title, maskedPhone };
  }

  return { title: combined, maskedPhone };
}

/** Mask last-message preview (full line or phone embedded in text). */
export function getMaskedMessagePreview(
  preview: string | undefined,
  participantPhone: string,
  conversationType: ConversationPhoneType,
  rules: WhatsAppPhoneMaskRules,
  userRole: string,
): string {
  const text = String(preview || "").trim();
  if (!text) return "";
  if (!shouldMaskConversationPhone(conversationType, rules, userRole)) {
    return text;
  }
  if (looksLikePhoneNumber(text) || phonesMatchLoosely(text, participantPhone)) {
    return getDisplayPhone(participantPhone, conversationType, rules, userRole);
  }
  return maskPhoneNumbersInText(text);
}

export function getWhatsAppPhoneMaskFromToken(token: {
  role?: string;
  whatsappPhoneMask?: Partial<WhatsAppPhoneMaskRules>;
} | null | undefined): WhatsAppPhoneMaskRules {
  const m = token?.whatsappPhoneMask;
  return {
    maskOwnerPhones: Boolean(m?.maskOwnerPhones),
    maskGuestPhones: Boolean(m?.maskGuestPhones),
  };
}

export function shouldMaskConversationPhone(
  conversationType: ConversationPhoneType,
  rules: WhatsAppPhoneMaskRules,
  userRole: string,
): boolean {
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(userRole)) {
    return false;
  }
  if (conversationType === "owner") return rules.maskOwnerPhones;
  if (conversationType === "guest") return rules.maskGuestPhones;
  return rules.maskGuestPhones;
}

export function getDisplayPhone(
  phone: string,
  conversationType: ConversationPhoneType,
  rules: WhatsAppPhoneMaskRules,
  userRole: string,
): string {
  if (!phone) return "";
  if (isAlreadyMaskedPhone(phone)) return phone.trim();
  if (shouldMaskConversationPhone(conversationType, rules, userRole)) {
    return maskPhoneNumber(phone);
  }
  return phone;
}

export function applyPhoneMaskToConversation<
  T extends {
    participantPhone?: string;
    conversationType?: string;
    lastMessageContent?: string;
  },
>(conv: T, rules: WhatsAppPhoneMaskRules, userRole: string): T {
  if (!conv?.participantPhone) return conv;
  const type =
    conv.conversationType === "owner" || conv.conversationType === "guest"
      ? conv.conversationType
      : undefined;
  if (!shouldMaskConversationPhone(type, rules, userRole)) return conv;

  const maskedPhone = isAlreadyMaskedPhone(conv.participantPhone)
    ? conv.participantPhone
    : maskPhoneNumber(conv.participantPhone);

  return {
    ...conv,
    participantPhone: maskedPhone,
    ...(conv.lastMessageContent
      ? {
          lastMessageContent: getMaskedMessagePreview(
            conv.lastMessageContent,
            conv.participantPhone,
            type,
            rules,
            userRole,
          ),
        }
      : {}),
  };
}

export async function loadEmployeeWhatsAppPhoneMask(
  employeeId: string,
): Promise<WhatsAppPhoneMaskRules> {
  const Employee = (await import("@/models/employee")).default;
  const doc = await Employee.findById(employeeId)
    .select("whatsappPhoneMask")
    .lean();
  const m = (doc as { whatsappPhoneMask?: Partial<WhatsAppPhoneMaskRules> } | null)
    ?.whatsappPhoneMask;
  return {
    maskOwnerPhones: Boolean(m?.maskOwnerPhones),
    maskGuestPhones: Boolean(m?.maskGuestPhones),
  };
}

export async function resolveMaskRulesForToken(
  token: { id?: string; _id?: string; role?: string; whatsappPhoneMask?: Partial<WhatsAppPhoneMaskRules> } | null,
): Promise<WhatsAppPhoneMaskRules> {
  const userId = token?.id || token?._id;
  if (!userId) {
    return getWhatsAppPhoneMaskFromToken(token);
  }
  return loadEmployeeWhatsAppPhoneMask(String(userId));
}

export function maskConversationsForViewer<
  T extends { participantPhone?: string; conversationType?: string },
>(conversations: T[], rules: WhatsAppPhoneMaskRules, userRole: string): T[] {
  return conversations.map((conv) => applyPhoneMaskToConversation(conv, rules, userRole));
}
