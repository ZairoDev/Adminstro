import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppConversationInitiationLog from "@/models/whatsappConversationInitiationLog";
import { FULL_ACCESS_ROLES, isSalesWhatsAppRole } from "./config";

export const DAILY_GUEST_INITIATION_LIMIT = 15;

export function normalizeGuestPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function todayDateKey(timezoneOffsetMinutes = 0): string {
  const now = new Date();
  const local = new Date(now.getTime() - timezoneOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Sales-family guest outreach is limited; owners and admins are exempt.
 */
export function isSubjectToGuestInitiationLimit(
  userRole: string,
  conversationType?: "owner" | "guest" | null,
): boolean {
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(userRole)) {
    return false;
  }
  if (conversationType === "owner") return false;
  return isSalesWhatsAppRole(userRole);
}

/**
 * True when any non-internal guest conversation already exists for this phone.
 */
export async function guestConversationExists(guestPhone: string): Promise<boolean> {
  const normalized = normalizeGuestPhone(guestPhone);
  if (!normalized) return false;

  const exists = await WhatsAppConversation.exists({
    participantPhone: normalized,
    source: { $ne: "internal" },
    $or: [
      { conversationType: "guest" },
      { conversationType: { $exists: false } },
      { conversationType: null },
      { conversationType: "" },
    ],
  });
  return Boolean(exists);
}

export async function getDailyInitiationCount(
  employeeId: string,
  dateKey = todayDateKey(),
): Promise<number> {
  return WhatsAppConversationInitiationLog.countDocuments({
    employeeId,
    dateKey,
  });
}

export async function getInitiationLimitStatus(
  employeeId: string,
  userRole: string,
  conversationType?: "owner" | "guest" | null,
): Promise<{
  limited: boolean;
  limit: number;
  used: number;
  remaining: number;
  atLimit: boolean;
}> {
  const limited = isSubjectToGuestInitiationLimit(userRole, conversationType);
  if (!limited) {
    return {
      limited: false,
      limit: DAILY_GUEST_INITIATION_LIMIT,
      used: 0,
      remaining: DAILY_GUEST_INITIATION_LIMIT,
      atLimit: false,
    };
  }

  const used = await getDailyInitiationCount(employeeId);
  const remaining = Math.max(0, DAILY_GUEST_INITIATION_LIMIT - used);
  return {
    limited: true,
    limit: DAILY_GUEST_INITIATION_LIMIT,
    used,
    remaining,
    atLimit: remaining <= 0,
  };
}

export type InitiationCheckResult =
  | { allowed: true }
  | { allowed: false; code: "DAILY_LIMIT_REACHED"; message: string };

/**
 * Gate before creating a first-contact guest conversation.
 * Existing guest conversations never consume quota.
 */
export async function assertCanInitiateGuestConversation(params: {
  employeeId: string;
  userRole: string;
  guestPhone: string;
  conversationType?: "owner" | "guest" | null;
}): Promise<InitiationCheckResult> {
  const { employeeId, userRole, guestPhone, conversationType } = params;

  if (!isSubjectToGuestInitiationLimit(userRole, conversationType)) {
    return { allowed: true };
  }

  if (await guestConversationExists(guestPhone)) {
    return { allowed: true };
  }

  const status = await getInitiationLimitStatus(
    employeeId,
    userRole,
    conversationType,
  );
  if (status.atLimit) {
    return {
      allowed: false,
      code: "DAILY_LIMIT_REACHED",
      message: `You have reached your daily limit of ${DAILY_GUEST_INITIATION_LIMIT} new guest conversations.`,
    };
  }

  return { allowed: true };
}

export async function recordGuestInitiation(params: {
  employeeId: string;
  guestPhone: string;
  conversationId: string;
  dateKey?: string;
}): Promise<void> {
  const normalized = normalizeGuestPhone(params.guestPhone);
  if (!normalized) return;

  const dateKey = params.dateKey ?? todayDateKey();

  try {
    await WhatsAppConversationInitiationLog.create({
      employeeId: params.employeeId,
      guestPhone: normalized,
      dateKey,
      conversationId: params.conversationId,
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) return;
    throw err;
  }
}
