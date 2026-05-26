import {
  INTERNAL_YOU_PHONE_ID,
  isInternalPhoneId,
  canAccessPhoneId,
  getDefaultPhoneId,
  getRetargetPhoneId,
} from "./config";
import { canAccessConversation } from "./access";
import type { WhatsAppToken } from "./apiContext";
import { normalizeWhatsAppToken } from "./apiContext";

type ConversationLike = {
  businessPhoneId?: string;
  source?: string;
  isRetarget?: boolean;
  retargetStage?: string;
};

export type OutboundPhoneResult =
  | { phoneNumberId: string; source: "conversation" | "request" | "default" | "retarget" }
  | { error: string; status: number };

/**
 * Unified outbound line: always prefer the open conversation's businessPhoneId.
 * Client-selected "active phone tab" is not used in unified inbox mode.
 */
export async function resolveOutboundBusinessPhoneId(params: {
  token: WhatsAppToken;
  conversation?: ConversationLike | null;
  requestedPhoneId?: string | null;
  requireConversation?: boolean;
}): Promise<OutboundPhoneResult> {
  const token = normalizeWhatsAppToken(params.token);
  const userRole = token.role || "";
  const userAreas = token.allotedArea;

  if (params.conversation) {
    const allowed = canAccessConversation(token, params.conversation);
    if (!allowed) {
      return { error: "Forbidden", status: 403 };
    }

    const line = params.conversation.businessPhoneId;
    if (!line) {
      return { error: "Conversation has no business phone line", status: 400 };
    }
    if (isInternalPhoneId(line) || params.conversation.source === "internal") {
      return { phoneNumberId: INTERNAL_YOU_PHONE_ID, source: "conversation" };
    }
    return { phoneNumberId: line, source: "conversation" };
  }

  if (params.requireConversation) {
    return { error: "conversationId is required", status: 400 };
  }

  let phoneNumberId = params.requestedPhoneId?.trim() || "";
  if (!phoneNumberId) {
    phoneNumberId = getDefaultPhoneId(userRole, userAreas) || "";
  }

  if (!phoneNumberId && userRole === "Advert") {
    phoneNumberId = getRetargetPhoneId() || "";
  }

  if (!phoneNumberId) {
    return { error: "No WhatsApp line available for send", status: 403 };
  }

  if (
    !canAccessPhoneId(phoneNumberId, userRole, userAreas) &&
    !(userRole === "Advert" && phoneNumberId === getRetargetPhoneId())
  ) {
    return {
      error: "You don't have permission to send from this WhatsApp number",
      status: 403,
    };
  }

  const source = params.requestedPhoneId ? "request" : "default";
  return { phoneNumberId, source };
}
