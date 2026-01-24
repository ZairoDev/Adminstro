import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";

/**
 * Computes WhatsApp reply status dynamically from message history
 * 
 * Status rules:
 * - NR1/NR2/NR3: Count successful outgoing messages before first customer reply
 * - NTR: Customer replied but agent hasn't responded yet
 * - WFR: Agent replied after customer message
 * 
 * @param phoneNo - Lead phone number (normalized, digits only)
 * @returns Promise<string> - Status: "NR1" | "NR2" | "NR3" | "NTR" | "WFR" | null
 */
export async function computeWhatsAppReplyStatus(
  phoneNo: string
): Promise<string | null> {
  try {
    // Normalize phone number (digits only)
    const normalizedPhone = (phoneNo || "").toString().replace(/\D/g, "");
    if (!normalizedPhone || normalizedPhone.length < 7) {
      return null;
    }

    // Find ALL conversations for this phone number (across all businessPhoneIds/locations)
    // Strategy: Try exact match first, then try partial matches (last N digits)
    // This handles cases where phone numbers might be stored with/without country codes
    let conversations: any[] = [];
    
    // First, try exact match on normalized phone
    conversations = await WhatsAppConversation.find({
      participantPhone: normalizedPhone,
      source: { $ne: "internal" },
    }).lean();
    
    // If no exact match, try partial matches (last 9, 8, 7 digits)
    // This handles cases where phone numbers have different formats
    if (conversations.length === 0) {
      const tryLengths = [9, 8, 7];
      
      for (const len of tryLengths) {
        if (normalizedPhone.length < len) continue;
        const lastDigits = normalizedPhone.slice(-len);
        // Use regex to match phone numbers ending with these digits
        const escapedDigits = lastDigits.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapedDigits}$`);
        
        const partialMatches = await WhatsAppConversation.find({
          participantPhone: { $regex: regex },
          source: { $ne: "internal" },
        }).lean();
        
        // Verify matches by normalizing participantPhone and comparing
        const verifiedMatches = partialMatches.filter((conv) => {
          const convPhone = (conv.participantPhone || "").toString().replace(/\D/g, "");
          return convPhone.endsWith(lastDigits);
        });
        
        if (verifiedMatches.length > 0) {
          conversations = verifiedMatches;
          break;
        }
      }
    }

    if (conversations.length === 0) {
      // No conversations found - no WhatsApp messages yet
      return null;
    }

    // Get all messages from ALL conversations for this phone number, sorted by timestamp
    const conversationIds = conversations.map((conv) => conv._id);
    const messages = await WhatsAppMessage.find({
      conversationId: { $in: conversationIds },
      source: { $ne: "internal" }, // Exclude internal messages
    })
      .sort({ timestamp: 1 }) // Oldest first
      .lean();

    if (messages.length === 0) {
      return null;
    }

    // Find first customer (incoming) message across all conversations
    const firstIncomingMessage = messages.find(
      (msg) => msg.direction === "incoming"
    );

    // If no incoming messages at all, count successful outgoing messages
    if (!firstIncomingMessage) {
      // Count only successful outgoing messages (not failed, not sending)
      const successfulOutgoing = messages.filter(
        (msg) =>
          msg.direction === "outgoing" &&
          msg.status !== "failed" &&
          msg.status !== "sending"
      );

      const count = successfulOutgoing.length;
      if (count === 0) return null;
      if (count === 1) return "NR1";
      if (count === 2) return "NR2";
      return "NR3"; // 3 or more
    }

    // Customer has replied - get timestamp of first reply
    const firstIncomingTime = new Date(firstIncomingMessage.timestamp);

    // Count successful outgoing messages sent BEFORE first customer reply
    // (for NR status if customer hasn't replied yet to those messages)
    const outgoingBeforeReply = messages.filter(
      (msg) =>
        msg.direction === "outgoing" &&
        msg.status !== "failed" &&
        msg.status !== "sending" &&
        new Date(msg.timestamp) < firstIncomingTime
    );

    // Find first agent (outgoing) message AFTER first customer reply
    const firstOutgoingAfterReply = messages.find(
      (msg) =>
        msg.direction === "outgoing" &&
        msg.status !== "failed" &&
        msg.status !== "sending" &&
        new Date(msg.timestamp) > firstIncomingTime
    );

    if (!firstOutgoingAfterReply) {
      // Customer replied but agent hasn't responded yet
      return "NTR";
    }

    // Agent has replied after customer message
    return "WFR";
  } catch (error) {
    console.error("Error computing WhatsApp reply status:", error);
    return null;
  }
}

/**
 * Batch compute WhatsApp reply status for multiple leads
 * 
 * @param phoneNumbers - Array of lead phone numbers
 * @returns Promise<Map<string, string | null>> - Map of phone -> status
 */
export async function batchComputeWhatsAppReplyStatus(
  phoneNumbers: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Process in parallel with Promise.all
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
