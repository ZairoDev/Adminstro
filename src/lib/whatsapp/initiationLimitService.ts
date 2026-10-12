import mongoose from "mongoose";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import Employee from "@/models/employee";
import { FULL_ACCESS_ROLES, isSalesWhatsAppRole } from "./config";
import {
  dateKeyForInstant,
  dayBoundsForDateKey,
  todayDateKey,
} from "./guestInitiationDay";

export { todayDateKey } from "./guestInitiationDay";

export const DAILY_GUEST_INITIATION_LIMIT = 15;

export function normalizeGuestPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function guestInitiationExclusionFilter(): Record<string, unknown> {
  return {
    source: { $ne: "internal" },
    conversationType: { $ne: "owner" },
    isRetarget: { $ne: true },
  };
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

function guestConversationFilter(normalizedPhone: string): Record<string, unknown> {
  return {
    participantPhone: normalizedPhone,
    source: { $ne: "internal" },
    $or: [
      { conversationType: "guest" },
      { conversationType: { $exists: false } },
      { conversationType: null },
      { conversationType: "" },
    ],
  };
}

/**
 * True when any non-internal guest conversation row exists for this phone.
 * @deprecated Prefer guestWasPreviouslyEngaged for quota decisions.
 */
export async function guestConversationExists(guestPhone: string): Promise<boolean> {
  const normalized = normalizeGuestPhone(guestPhone);
  if (!normalized) return false;

  const exists = await WhatsAppConversation.exists(guestConversationFilter(normalized));
  return Boolean(exists);
}

/**
 * A guest counts as "already contacted" when they ever replied or a prior
 * initiation was confirmed (two-way contact). Empty conversation rows from
 * opening a lead do NOT exempt the daily limit.
 */
export async function guestWasPreviouslyEngaged(guestPhone: string): Promise<boolean> {
  const normalized = normalizeGuestPhone(guestPhone);
  if (!normalized) return false;

  const everConfirmed = await WhatsAppConversation.exists({
    ...guestConversationFilter(normalized),
    guestInitiationConfirmedAt: { $exists: true, $ne: null },
  });
  if (everConfirmed) return true;

  const guestConvs = await WhatsAppConversation.find(guestConversationFilter(normalized))
    .select("_id")
    .lean<{ _id: unknown }[]>();

  if (guestConvs.length === 0) return false;

  const hasInbound = await WhatsAppMessage.exists({
    conversationId: { $in: guestConvs.map((c) => c._id) },
    direction: "incoming",
  });
  return Boolean(hasInbound);
}

export async function getDailyConfirmedInitiationCount(
  employeeId: string,
  dateKey = todayDateKey(),
): Promise<number> {
  const { start, end } = dayBoundsForDateKey(dateKey);
  return WhatsAppConversation.countDocuments({
    guestInitiationAgentId: new mongoose.Types.ObjectId(employeeId),
    guestInitiationConfirmedAt: { $gte: start, $lt: end },
    ...guestInitiationExclusionFilter(),
  });
}

export async function getDailyPendingInitiationCount(
  employeeId: string,
  dateKey = todayDateKey(),
): Promise<number> {
  const { start, end } = dayBoundsForDateKey(dateKey);
  return WhatsAppConversation.countDocuments({
    guestInitiationAgentId: new mongoose.Types.ObjectId(employeeId),
    guestInitiationPendingAt: { $gte: start, $lt: end },
    $or: [
      { guestInitiationConfirmedAt: { $exists: false } },
      { guestInitiationConfirmedAt: null },
    ],
    ...guestInitiationExclusionFilter(),
  });
}

/** Outbound accepted by Meta today, awaiting delivery acknowledgement */
export async function getDailyReservedInitiationCount(
  employeeId: string,
  dateKey = todayDateKey(),
): Promise<number> {
  const { start, end } = dayBoundsForDateKey(dateKey);
  return WhatsAppConversation.countDocuments({
    guestInitiationAgentId: new mongoose.Types.ObjectId(employeeId),
    guestInitiationReservedAt: { $gte: start, $lt: end },
    $or: [
      { guestInitiationPendingAt: { $exists: false } },
      { guestInitiationPendingAt: null },
    ],
    ...guestInitiationExclusionFilter(),
  });
}

/** @deprecated Use getDailyConfirmedInitiationCount */
export async function getDailyInitiationCount(
  employeeId: string,
  dateKey = todayDateKey(),
): Promise<number> {
  return getDailyConfirmedInitiationCount(employeeId, dateKey);
}

export async function getInitiationLimitStatus(
  employeeId: string,
  userRole: string,
  conversationType?: "owner" | "guest" | null,
): Promise<{
  limited: boolean;
  limit: number;
  used: number;
  pending: number;
  inFlight: number;
  remaining: number;
  atLimit: boolean;
}> {
  const limited = isSubjectToGuestInitiationLimit(userRole, conversationType);
  if (!limited) {
    return {
      limited: false,
      limit: DAILY_GUEST_INITIATION_LIMIT,
      used: 0,
      pending: 0,
      inFlight: 0,
      remaining: DAILY_GUEST_INITIATION_LIMIT,
      atLimit: false,
    };
  }

  const used = await getDailyConfirmedInitiationCount(employeeId);
  const pending = await getDailyPendingInitiationCount(employeeId);
  const inFlight = await getDailyReservedInitiationCount(employeeId);
  const slotsUsed = used + pending + inFlight;
  const remaining = Math.max(0, DAILY_GUEST_INITIATION_LIMIT - slotsUsed);
  return {
    limited: true,
    limit: DAILY_GUEST_INITIATION_LIMIT,
    used,
    pending,
    inFlight,
    remaining,
    atLimit: slotsUsed >= DAILY_GUEST_INITIATION_LIMIT,
  };
}

export type InitiationCheckResult =
  | { allowed: true }
  | { allowed: false; code: "DAILY_LIMIT_REACHED"; message: string };

/**
 * Gate before first outbound to a guest who was never engaged before.
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

  if (await guestWasPreviouslyEngaged(guestPhone)) {
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

/**
 * @deprecated Use maybeRecordPendingGuestInitiation
 */
export async function recordGuestInitiationPending(params: {
  employeeId: string;
  userRole: string;
  guestPhone: string;
  conversationId: string;
  conversationType?: "owner" | "guest" | null;
}): Promise<void> {
  await maybeRecordPendingGuestInitiation(params);
}

function noGuestInitiationTimestampFilter(field: string): Record<string, unknown> {
  return {
    $or: [
      { [field]: { $exists: false } },
      { [field]: null },
    ],
  };
}

/**
 * Reserve a daily slot when Meta accepts an outbound (released on delivery failure).
 */
export async function maybeReserveGuestInitiation(params: {
  employeeId: string;
  userRole: string;
  guestPhone: string;
  conversationId: string;
  conversationType?: "owner" | "guest" | null;
  reservedAt?: Date;
}): Promise<void> {
  if (!isSubjectToGuestInitiationLimit(params.userRole, params.conversationType)) {
    return;
  }
  if (await guestWasPreviouslyEngaged(params.guestPhone)) {
    return;
  }

  const normalized = normalizeGuestPhone(params.guestPhone);
  const reservedAt = params.reservedAt ?? new Date();
  const dateKey = dateKeyForInstant(reservedAt);
  const { start, end } = dayBoundsForDateKey(dateKey);
  const employeeOid = new mongoose.Types.ObjectId(params.employeeId);

  const duplicateToday = await WhatsAppConversation.exists({
    participantPhone: normalized,
    guestInitiationAgentId: employeeOid,
    $or: [
      { guestInitiationPendingAt: { $gte: start, $lt: end } },
      { guestInitiationReservedAt: { $gte: start, $lt: end } },
    ],
    ...guestInitiationExclusionFilter(),
  });
  if (duplicateToday) return;

  await WhatsAppConversation.findOneAndUpdate(
    {
      _id: params.conversationId,
      $and: [
        noGuestInitiationTimestampFilter("guestInitiationPendingAt"),
        noGuestInitiationTimestampFilter("guestInitiationReservedAt"),
      ],
    },
    {
      $set: {
        guestInitiationAgentId: employeeOid,
        guestInitiationReservedAt: reservedAt,
      },
    },
  );
}

/** @deprecated Use maybeRecordPendingGuestInitiation */
export async function recordGuestInitiation(params: {
  employeeId: string;
  userRole?: string;
  guestPhone: string;
  conversationId: string;
  dateKey?: string;
  conversationType?: "owner" | "guest" | null;
}): Promise<void> {
  await maybeRecordPendingGuestInitiation({
    employeeId: params.employeeId,
    userRole: params.userRole || "Sales",
    guestPhone: params.guestPhone,
    conversationId: params.conversationId,
    conversationType: params.conversationType,
  });
}

/**
 * Call after Meta reports an outbound as delivered/read to a guest not previously engaged.
 * Stores pending state on the conversation document (no separate log collection).
 */
export async function maybeRecordPendingGuestInitiation(params: {
  employeeId: string;
  userRole: string;
  guestPhone: string;
  conversationId: string;
  conversationType?: "owner" | "guest" | null;
  pendingAt?: Date;
}): Promise<void> {
  if (!isSubjectToGuestInitiationLimit(params.userRole, params.conversationType)) {
    return;
  }
  if (await guestWasPreviouslyEngaged(params.guestPhone)) {
    return;
  }

  const normalized = normalizeGuestPhone(params.guestPhone);
  const pendingAt = params.pendingAt ?? new Date();
  const dateKey = dateKeyForInstant(pendingAt);
  const { start, end } = dayBoundsForDateKey(dateKey);
  const employeeOid = new mongoose.Types.ObjectId(params.employeeId);

  const duplicateToday = await WhatsAppConversation.exists({
    participantPhone: normalized,
    guestInitiationAgentId: employeeOid,
    $or: [
      { guestInitiationPendingAt: { $gte: start, $lt: end } },
      { guestInitiationReservedAt: { $gte: start, $lt: end } },
    ],
    ...guestInitiationExclusionFilter(),
  });
  if (duplicateToday) return;

  await WhatsAppConversation.findOneAndUpdate(
    {
      _id: params.conversationId,
      $and: [noGuestInitiationTimestampFilter("guestInitiationPendingAt")],
    },
    {
      $set: {
        guestInitiationAgentId: employeeOid,
        guestInitiationPendingAt: pendingAt,
      },
      $unset: { guestInitiationReservedAt: "" },
    },
  );
}

/**
 * Record a pending initiation when Meta acknowledges delivery (webhook status update).
 */
export async function recordGuestInitiationOnOutboundDelivered(
  messageId: string,
  deliveredAt: Date,
): Promise<void> {
  const message = await WhatsAppMessage.findOne({ messageId })
    .select("_id conversationId direction sentBy")
    .lean<{
      _id: mongoose.Types.ObjectId;
      conversationId?: mongoose.Types.ObjectId;
      direction: string;
      sentBy?: mongoose.Types.ObjectId;
    }>();
  if (!message || message.direction !== "outgoing") return;
  if (!message.sentBy || !message.conversationId) return;

  const conv = await WhatsAppConversation.findById(message.conversationId)
    .select(
      "participantPhone conversationType isRetarget source guestInitiationPendingAt guestInitiationReservedAt",
    )
    .lean<{
      participantPhone: string;
      conversationType?: "owner" | "guest" | null;
      isRetarget?: boolean;
      source?: string;
      guestInitiationPendingAt?: Date | null;
      guestInitiationReservedAt?: Date | null;
    }>();
  if (!conv || conv.isRetarget || conv.conversationType === "owner") return;
  if (conv.source === "internal") return;
  if (conv.guestInitiationPendingAt) return;
  if (conv.guestInitiationReservedAt) {
    // Slot already reserved at send time — promote to pending on delivery.
    const employee = await Employee.findById(message.sentBy).select("role").lean<{
      role?: string;
    }>();
    if (!employee?.role) return;
    if (
      !isSubjectToGuestInitiationLimit(
        employee.role,
        conv.conversationType ?? "guest",
      )
    ) {
      return;
    }
    await WhatsAppConversation.findOneAndUpdate(
      { _id: message.conversationId },
      {
        $set: { guestInitiationPendingAt: deliveredAt },
        $unset: { guestInitiationReservedAt: "" },
      },
    );
    return;
  }

  const employee = await Employee.findById(message.sentBy).select("role").lean<{
    role?: string;
  }>();
  if (!employee?.role) return;

  const phone = normalizeGuestPhone(conv.participantPhone);
  if (!phone) return;

  await maybeRecordPendingGuestInitiation({
    employeeId: String(message.sentBy),
    userRole: employee.role,
    guestPhone: phone,
    conversationId: String(message.conversationId),
    conversationType: conv.conversationType ?? "guest",
    pendingAt: deliveredAt,
  });
}

/**
 * Release a reserved slot when Meta reports delivery failure (no pending yet).
 */
export async function releaseGuestInitiationReservationOnOutboundFailed(
  messageId: string,
): Promise<void> {
  const message = await WhatsAppMessage.findOne({ messageId })
    .select("conversationId direction sentBy")
    .lean<{
      conversationId?: mongoose.Types.ObjectId;
      direction: string;
      sentBy?: mongoose.Types.ObjectId;
    }>();
  if (!message || message.direction !== "outgoing") return;
  if (!message.conversationId || !message.sentBy) return;

  await WhatsAppConversation.findOneAndUpdate(
    {
      _id: message.conversationId,
      guestInitiationAgentId: message.sentBy,
      guestInitiationReservedAt: { $exists: true, $ne: null },
      $and: [noGuestInitiationTimestampFilter("guestInitiationPendingAt")],
    },
    { $unset: { guestInitiationReservedAt: "" } },
  );
}

/**
 * When the guest replies, confirm the pending initiation (counts toward daily used).
 */
export async function confirmGuestInitiationOnInboundReply(
  conversationId: string,
): Promise<boolean> {
  const updated = await WhatsAppConversation.findOneAndUpdate(
    {
      _id: conversationId,
      guestInitiationPendingAt: { $exists: true, $ne: null },
      $or: [
        { guestInitiationConfirmedAt: { $exists: false } },
        { guestInitiationConfirmedAt: null },
      ],
    },
    { $set: { guestInitiationConfirmedAt: new Date() } },
    { new: true },
  );
  return Boolean(updated);
}
