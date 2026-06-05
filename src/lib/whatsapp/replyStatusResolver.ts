import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";

export type WhatsAppReplyClassification = {
  /** Agent sent a message after the customer's latest incoming message */
  replied: boolean;
  /** Customer's latest message has no agent reply after it */
  notReplied: boolean;
  /** At least one outgoing message has status failed (from status webhook) */
  notDelivered: boolean;
};

type MessageLike = {
  direction: string;
  status: string;
  timestamp: Date | string;
};

function isSuccessfulOutgoing(msg: MessageLike): boolean {
  return (
    msg.direction === "outgoing" &&
    msg.status !== "failed" &&
    msg.status !== "sending"
  );
}

function isFailedOutgoing(msg: MessageLike): boolean {
  return msg.direction === "outgoing" && msg.status === "failed";
}

/**
 * Classify reply state from WhatsApp message history.
 *
 * - Replied: any successful agent message after the customer's latest incoming
 * - Not Replied: customer has messaged and their latest message has no agent reply yet
 * - Not Delivered: any outgoing message with status failed (statusEvents-driven)
 */
export function classifyMessagesReplyState(
  messages: MessageLike[],
): WhatsAppReplyClassification {
  if (messages.length === 0) {
    return { replied: false, notReplied: false, notDelivered: false };
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const notDelivered = sorted.some(isFailedOutgoing);

  const incomingMessages = sorted.filter((m) => m.direction === "incoming");
  if (incomingMessages.length === 0) {
    return { replied: false, notReplied: false, notDelivered };
  }

  const lastIncoming = incomingMessages[incomingMessages.length - 1];
  const lastIncomingTime = new Date(lastIncoming.timestamp).getTime();

  const agentReplyAfterLastIncoming = sorted.some(
    (m) =>
      isSuccessfulOutgoing(m) &&
      new Date(m.timestamp).getTime() > lastIncomingTime,
  );

  if (agentReplyAfterLastIncoming) {
    return { replied: true, notReplied: false, notDelivered };
  }

  return { replied: false, notReplied: true, notDelivered };
}

function normalizePhone(phoneNo: string | number | undefined | null): string {
  return (phoneNo ?? "").toString().replace(/\D/g, "");
}

async function findConversationsForPhone(normalizedPhone: string) {
  if (!normalizedPhone || normalizedPhone.length < 7) {
    return [];
  }

  let conversations = await WhatsAppConversation.find({
    participantPhone: normalizedPhone,
    source: { $ne: "internal" },
  }).lean();

  if (conversations.length > 0) {
    return conversations;
  }

  const tryLengths = [9, 8, 7];
  for (const len of tryLengths) {
    if (normalizedPhone.length < len) continue;
    const lastDigits = normalizedPhone.slice(-len);
    const escapedDigits = lastDigits.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapedDigits}$`);

    const partialMatches = await WhatsAppConversation.find({
      participantPhone: { $regex: regex },
      source: { $ne: "internal" },
    }).lean();

    const verifiedMatches = partialMatches.filter((conv) => {
      const convPhone = (conv.participantPhone || "")
        .toString()
        .replace(/\D/g, "");
      return convPhone.endsWith(lastDigits);
    });

    if (verifiedMatches.length > 0) {
      return verifiedMatches;
    }
  }

  return [];
}

async function loadMessagesForPhone(
  normalizedPhone: string,
): Promise<MessageLike[]> {
  const conversations = await findConversationsForPhone(normalizedPhone);
  if (conversations.length === 0) {
    return [];
  }

  const conversationIds = conversations.map((conv) => conv._id);
  return WhatsAppMessage.find({
    conversationId: { $in: conversationIds },
    source: { $ne: "internal" },
  })
    .select("direction status timestamp")
    .sort({ timestamp: 1 })
    .lean<MessageLike[]>();
}

/**
 * Computes WhatsApp reply status dynamically from message history.
 *
 * Status rules:
 * - NR1/NR2/NR3: Count successful outgoing messages before any customer reply
 * - NTR: Customer's latest message — agent hasn't responded yet
 * - WFR: Agent replied after customer's latest message
 */
export async function computeWhatsAppReplyStatus(
  phoneNo: string,
): Promise<string | null> {
  try {
    const normalizedPhone = normalizePhone(phoneNo);
    if (!normalizedPhone || normalizedPhone.length < 7) {
      return null;
    }

    const messages = await loadMessagesForPhone(normalizedPhone);
    if (messages.length === 0) {
      return null;
    }

    const firstIncomingMessage = messages.find(
      (msg) => msg.direction === "incoming",
    );

    if (!firstIncomingMessage) {
      const successfulOutgoing = messages.filter(isSuccessfulOutgoing);
      const count = successfulOutgoing.length;
      if (count === 0) return null;
      if (count === 1) return "NR1";
      if (count === 2) return "NR2";
      return "NR3";
    }

    const classification = classifyMessagesReplyState(messages);
    if (classification.replied) return "WFR";
    if (classification.notReplied) return "NTR";
    return null;
  } catch (error) {
    console.error("Error computing WhatsApp reply status:", error);
    return null;
  }
}

export async function classifyWhatsAppReplyForPhone(
  phoneNo: string | number | undefined | null,
): Promise<WhatsAppReplyClassification> {
  const normalizedPhone = normalizePhone(phoneNo);
  if (!normalizedPhone || normalizedPhone.length < 7) {
    return { replied: false, notReplied: false, notDelivered: false };
  }

  try {
    const messages = await loadMessagesForPhone(normalizedPhone);
    return classifyMessagesReplyState(messages);
  } catch (error) {
    console.error("Error classifying WhatsApp reply for phone:", error);
    return { replied: false, notReplied: false, notDelivered: false };
  }
}

/**
 * Batch classify phones (deduped). Returns map keyed by normalized phone digits.
 */
export async function batchClassifyWhatsAppReplyForPhones(
  phoneNumbers: Array<string | number | undefined | null>,
): Promise<Map<string, WhatsAppReplyClassification>> {
  const uniquePhones = [
    ...new Set(
      phoneNumbers
        .map(normalizePhone)
        .filter((phone) => phone.length >= 7),
    ),
  ];

  const results = new Map<string, WhatsAppReplyClassification>();
  const chunkSize = 25;

  for (let i = 0; i < uniquePhones.length; i += chunkSize) {
    const chunk = uniquePhones.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (phone) => {
        const messages = await loadMessagesForPhone(phone);
        return {
          phone,
          classification: classifyMessagesReplyState(messages),
        };
      }),
    );

    chunkResults.forEach(({ phone, classification }) => {
      results.set(phone, classification);
    });
  }

  return results;
}

/** @deprecated Use batchClassifyWhatsAppReplyForPhones for dashboard stats */
export async function batchComputeWhatsAppReplyStatus(
  phoneNumbers: string[],
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const promises = phoneNumbers.map(async (phoneNo) => {
    const status = await computeWhatsAppReplyStatus(phoneNo);
    return { phoneNo, status };
  });

  const resolved = await Promise.all(promises);
  resolved.forEach(({ phoneNo, status }) => {
    results.set(phoneNo, status);
  });

  return results;
}

