import {
  FULL_ACCESS_ROLES,
  isSalesWhatsAppRole,
  isWhatsAppAccessRole,
} from "./config";
import {
  canUserAccessPhoneId,
  getAccessibleChannelIds,
  getPhoneIdsForUserAreasSync,
} from "./phoneAreaConfigService";
import { normalizeWhatsAppToken, type WhatsAppToken } from "./apiContext";
import {
  canUserSeeConversation,
  getUserAreasFromToken,
} from "./locationAccess";

type AccessUser = {
  id?: string;
  _id?: string;
  role?: string;
  allotedArea?: string | string[];
  email?: string;
  rentalType?: unknown;
};

/** Mongoose .select() fields required by canAccessConversationAsync. */
export const CONVERSATION_ACCESS_SELECT = [
  "businessPhoneId",
  "whatsappChannelId",
  "participantLocationKey",
  "participantLocation",
  "source",
  "rentalType",
  "channelType",
  "isRetarget",
  "retargetStage",
  "assignedAgent",
].join(" ");

function parseUserAreas(user: AccessUser): string[] {
  return getUserAreasFromToken(user);
}

function evaluateRetargetAccess(
  user: AccessUser,
  conversation: Record<string, unknown>,
  hasPhoneAccess: boolean,
): boolean {
  const userRole = user.role || "";
  const userId = user._id || user.id;

  if (isSalesWhatsAppRole(userRole)) {
    if (conversation.retargetStage !== "handed_to_sales") {
      return false;
    }

    if (conversation.assignedAgent) {
      const assignedAgentId =
        typeof conversation.assignedAgent === "string"
          ? conversation.assignedAgent
          : String(conversation.assignedAgent);
      const userIdStr = userId ? String(userId) : "";
      if (assignedAgentId !== userIdStr) return false;
      return true;
    }

    return hasPhoneAccess;
  }

  if (userRole === "Advert") {
    const preHandoverStages = ["initiated", "awaiting_reply", "engaged"];
    return preHandoverStages.includes(String(conversation.retargetStage || ""));
  }

  return false;
}

function baseAccessChecks(user: AccessUser, conversation: Record<string, unknown>): boolean | null {
  if (!user || !conversation) return false;

  const userRole = user.role || "";

  if ((FULL_ACCESS_ROLES as readonly string[]).includes(userRole)) {
    return true;
  }

  if (
    conversation.source === "internal" ||
    conversation.businessPhoneId === "internal-you"
  ) {
    return true;
  }

  if (!isWhatsAppAccessRole(userRole) && userRole !== "Advert") {
    return false;
  }

  return null;
}

/**
 * Central access validator for WhatsApp conversations (sync).
 * Prefer {@link canAccessConversationAsync} in API routes when DB phone mapping matters.
 */
export function canAccessConversation(user: AccessUser, conversation: Record<string, unknown>): boolean {
  const early = baseAccessChecks(user, conversation);
  if (early !== null) return early;

  const userRole = user.role || "";
  const userAreas = parseUserAreas(user);
  const allowedPhoneIds = getPhoneIdsForUserAreasSync(userRole, userAreas);
  const hasPhoneAccess =
    !conversation.businessPhoneId ||
    (allowedPhoneIds.length > 0 &&
      allowedPhoneIds.includes(String(conversation.businessPhoneId)));

  if (conversation.isRetarget) {
    return evaluateRetargetAccess(user, conversation, hasPhoneAccess);
  }

  return canUserSeeConversation(user, conversation);
}

/** DB-aware access check — use for messages, send, and open flows. */
export async function canAccessConversationAsync(
  user: AccessUser,
  conversation: Record<string, unknown>,
): Promise<boolean> {
  const normalized = normalizeWhatsAppToken(user as WhatsAppToken);

  const early = baseAccessChecks(normalized, conversation);
  if (early !== null) return early;

  const userRole = normalized.role || "";
  const userAreas = normalized.allotedArea;

  let hasPhoneAccess = !conversation.businessPhoneId;
  let accessedViaChannelId = false;

  if (conversation.businessPhoneId) {
    hasPhoneAccess = await canUserAccessPhoneId(
      String(conversation.businessPhoneId),
      userRole,
      userAreas,
      { userRentalType: normalized.rentalType },
    );
  }

  // Mirror inbox visibility: conversations visible via frozen whatsappChannelId
  // (e.g. after number migration) must remain openable/sendable.
  if (!hasPhoneAccess && conversation.whatsappChannelId) {
    const accessibleChannelIds = await getAccessibleChannelIds(
      userRole,
      userAreas,
      normalized.rentalType,
    );
    if (accessibleChannelIds.includes(String(conversation.whatsappChannelId))) {
      hasPhoneAccess = true;
      accessedViaChannelId = true;
    }
  }

  if (conversation.isRetarget) {
    return evaluateRetargetAccess(normalized, conversation, hasPhoneAccess);
  }

  if (!hasPhoneAccess) return false;

  return canUserSeeConversation(normalized, conversation, {
    skipPhoneCheck: true,
    skipLocationCheck: accessedViaChannelId,
  });
}

/**
 * Determines if socket events should be emitted to a user for a conversation.
 */
export function shouldEmitToUser(user: AccessUser, conversation: Record<string, unknown>): boolean {
  return canAccessConversation(user, conversation);
}

export function assertAccessOrThrow(user: AccessUser, conversation: Record<string, unknown>): void {
  if (!canAccessConversation(user, conversation)) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export async function assertAccessOrThrowAsync(
  user: AccessUser,
  conversation: Record<string, unknown>,
): Promise<void> {
  if (!(await canAccessConversationAsync(user, conversation))) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}
