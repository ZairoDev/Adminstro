import WhatsAppMessage from "@/modules/whatsapp/models/message.model";
import {
  getLastCustomerMessageAtForPhone,
  type MessagingWindowConversation,
} from "@/modules/whatsapp/services/messaging-window";

export async function getLastIncomingOnBusinessLine(
  conversationId: string,
  businessPhoneId: string,
): Promise<Date | null> {
  const phone = businessPhoneId.trim();
  if (!phone) return null;

  const row = (await WhatsAppMessage.findOne({
    conversationId,
    businessPhoneId: phone,
    direction: "incoming",
  })
    .sort({ timestamp: -1 })
    .select("timestamp")
    .lean()) as { timestamp?: Date | string } | null;

  if (!row?.timestamp) return null;
  return new Date(row.timestamp);
}

/** Authoritative window anchor for outbound sends (server only). */
export async function resolveMessagingWindowAnchor(params: {
  conversationId: string;
  businessPhoneId: string;
  conversation?: MessagingWindowConversation | null;
}): Promise<Date | null> {
  const fromDb = await getLastIncomingOnBusinessLine(
    params.conversationId,
    params.businessPhoneId,
  );
  if (fromDb) return fromDb;

  return getLastCustomerMessageAtForPhone(
    params.conversation ?? null,
    params.businessPhoneId,
  );
}
