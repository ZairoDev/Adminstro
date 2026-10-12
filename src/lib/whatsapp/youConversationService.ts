import mongoose from "mongoose";
import WhatsAppMessage from "@/models/whatsappMessage";
import ConversationArchiveState from "@/models/conversationArchiveState";
import WhatsAppConversation from "@/models/whatsappConversation";
import Employee from "@/models/employee";
import { INTERNAL_YOU_PHONE_ID } from "@/lib/whatsapp/config";
import type { InboxConversationLean } from "@/lib/whatsapp/conversationsListEnrichment";

export type YouConversationInboxOptions = {
  /** When true, skip returning the row (unread tab). */
  unreadInboxFilter?: boolean;
  /** When true, skip returning the row (archived-only inbox). */
  archivedOnly?: boolean;
};

/**
 * Find or create the internal "You" conversation row for the inbox sidebar.
 * Returns null when the user has no phone, the row is archived, or filters exclude it.
 */
export async function resolveYouConversationForInbox(
  userId: string,
  options: YouConversationInboxOptions = {},
): Promise<InboxConversationLean | null> {
  const { unreadInboxFilter = false, archivedOnly = false } = options;

  if (unreadInboxFilter || archivedOnly) {
    return null;
  }

  const employee = (await Employee.findById(userId)
    .select("phone name")
    .lean()) as { phone?: string; name?: string } | null;

  if (!employee?.phone) {
    return null;
  }

  const userPhone = employee.phone.replace(/\D/g, "");

  let youConversation = (await WhatsAppConversation.findOne({
    participantPhone: userPhone,
    source: "internal",
    businessPhoneId: INTERNAL_YOU_PHONE_ID,
  }).lean()) as InboxConversationLean | null;

  if (!youConversation) {
    const newYouConv = await WhatsAppConversation.create({
      participantPhone: userPhone,
      participantName: employee.name || "You",
      businessPhoneId: INTERNAL_YOU_PHONE_ID,
      source: "internal",
      status: "active",
      unreadCount: 0,
      lastMessageTime: new Date(),
    });
    youConversation = newYouConv.toObject() as InboxConversationLean;
  }

  const youArchiveState = await ConversationArchiveState.findOne({
    conversationId: youConversation._id,
    isArchived: true,
  }).lean();

  if (youArchiveState) {
    return null;
  }

  const lastMessage = (await WhatsAppMessage.findOne({
    conversationId: youConversation._id,
  })
    .sort({ timestamp: -1 })
    .select("timestamp content type")
    .lean()) as {
    timestamp?: Date;
    content?: { text?: string; caption?: string } | string;
    type?: string;
  } | null;

  youConversation.unreadCount = 0;
  youConversation.isArchivedByUser = false;
  youConversation.isInternal = true;
  youConversation.participantName = "You";
  youConversation.source = "internal";
  youConversation.businessPhoneId = INTERNAL_YOU_PHONE_ID;

  if (lastMessage) {
    youConversation.lastMessageTime = lastMessage.timestamp;
    const messageContent = lastMessage.content;
    youConversation.lastMessageContent =
      typeof messageContent === "string"
        ? messageContent
        : messageContent?.text ||
          messageContent?.caption ||
          `${lastMessage.type ?? "text"} message`;
    youConversation.lastMessageDirection = "outgoing";
    youConversation.lastMessageStatus = undefined;
  }

  return youConversation;
}

/** Strip duplicate internal / "You" rows before prepending the canonical row. */
export function stripInternalRowsFromInboxPage(
  conversations: InboxConversationLean[],
  youConversationId?: string,
): InboxConversationLean[] {
  return conversations.filter((row) => {
    if (row.source === "internal") return false;
    if (row.businessPhoneId === INTERNAL_YOU_PHONE_ID) return false;
    if (
      youConversationId &&
      String(row._id) === String(youConversationId)
    ) {
      return false;
    }
    return true;
  });
}

export function prependYouConversationToInboxPage(
  conversations: InboxConversationLean[],
  youConversation: InboxConversationLean,
): InboxConversationLean[] {
  const youId = String(youConversation._id);
  const withoutDupes = stripInternalRowsFromInboxPage(conversations, youId);
  return [youConversation, ...withoutDupes];
}
