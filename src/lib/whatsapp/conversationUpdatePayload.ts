export type WhatsAppConversationUpdateType =
  | "archive"
  | "meta"
  | "label"
  | "transfer"
  | "lead";

export type WhatsAppConversationUpdatePayload = {
  conversationId?: string;
  type?: WhatsAppConversationUpdateType;
  isArchived?: boolean;
  archivedAt?: string | Date;
  archivedBy?: string;
  unarchivedAt?: string | Date;
  unarchivedBy?: string;
  businessPhoneId?: string;
  updates?: Record<string, unknown>;
  labels?: string[];
  participantName?: string;
  participantProfilePic?: string;
  firstReply?: boolean;
  whatsappOptIn?: boolean;
  queryId?: string;
  merged?: boolean;
  sourceConversationId?: string;
};

/** Infer update type for legacy emits that omit `type`. */
export function inferWhatsAppConversationUpdateType(
  payload: WhatsAppConversationUpdatePayload,
): WhatsAppConversationUpdateType | undefined {
  if (payload.type) {
    return payload.type;
  }
  if (typeof payload.isArchived === "boolean") {
    return "archive";
  }
  if (payload.updates && typeof payload.updates === "object") {
    return "meta";
  }
  if (Array.isArray(payload.labels)) {
    return "label";
  }
  if (payload.merged !== undefined || payload.sourceConversationId) {
    return "transfer";
  }
  if (payload.firstReply === true) {
    return "lead";
  }
  return undefined;
}

/** Normalize meta patches from flat or nested `updates` payloads. */
export function extractMetaConversationPatch(
  payload: WhatsAppConversationUpdatePayload,
): Record<string, unknown> {
  if (payload.updates && typeof payload.updates === "object") {
    return { ...payload.updates };
  }

  const patch: Record<string, unknown> = {};
  if (typeof payload.participantName === "string") {
    patch.participantName = payload.participantName;
  }
  if (typeof payload.participantProfilePic === "string") {
    patch.participantProfilePic = payload.participantProfilePic;
  }
  return patch;
}
