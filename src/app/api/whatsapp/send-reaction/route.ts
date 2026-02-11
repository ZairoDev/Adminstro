import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import {
  canAccessPhoneId,
  getAllowedPhoneIds,
  getDefaultPhoneId,
  getRetargetPhoneId,
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
} from "@/lib/whatsapp/config";
import { canAccessConversation } from "@/lib/whatsapp/access";

connectDb();

/**
 * Send a reaction to a WhatsApp message
 * 
 * @param messageId - The WhatsApp message ID (wamid) to react to
 * @param emoji - The emoji reaction (e.g., "👍", "❤️", "😂")
 * @param conversationId - The conversation ID
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { 
      messageId, // WhatsApp message ID (wamid) to react to
      emoji = "👍",
      conversationId,
      phoneNumberId: requestedPhoneId,
    } = await req.json();

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    // Validate emoji (should be a single emoji character)
    if (!emoji || emoji.length === 0) {
      return NextResponse.json(
        { error: "Emoji is required" },
        { status: 400 }
      );
    }

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    let allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    // Advert role: allow reacting in retarget conversations
    if (allowedPhoneIds.length === 0 && userRole === "Advert") {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        allowedPhoneIds = [retargetPhoneId];
      }
    }

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    // Determine which phone ID to use
    let phoneNumberId = requestedPhoneId;
    
    // If conversationId provided, get phone ID from conversation
    if (conversationId && !phoneNumberId) {
      const conv = await WhatsAppConversation.findById(conversationId).lean() as any;
      if (conv) {
        phoneNumberId = conv.businessPhoneId;
      }
    }

    // If conversationId provided, enforce conversation access rules
    if (conversationId) {
      const convDoc = await WhatsAppConversation.findById(conversationId).lean() as any;
      if (!convDoc) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      const allowed = await canAccessConversation(token, convDoc);
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      if ((token.role || "") === "Advert" && convDoc.isRetarget && convDoc.retargetStage === "handed_to_sales") {
        return NextResponse.json({ error: "Advert cannot react after handover" }, { status: 403 });
      }
      if ((token.role || "") === "Sales" && convDoc.isRetarget && convDoc.retargetStage !== "handed_to_sales") {
        return NextResponse.json({ error: "Sales cannot react to retarget conversation before handover" }, { status: 403 });
      }
    }

    // Fall back to default if not set
    if (!phoneNumberId) {
      phoneNumberId = getDefaultPhoneId(userRole, userAreas);
    }

    // Verify permission
    if (!phoneNumberId || !canAccessPhoneId(phoneNumberId, userRole, userAreas)) {
      return NextResponse.json(
        { error: "You don't have permission to send from this WhatsApp number" },
        { status: 403 }
      );
    }

    const whatsappToken = getWhatsAppToken();
    if (!whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp configuration missing" },
        { status: 500 }
      );
    }

    // Find the original message to get the recipient
    const originalMessage = await WhatsAppMessage.findOne({
      messageId: messageId,
      businessPhoneId: phoneNumberId,
    }).lean() as any;

    if (!originalMessage) {
      return NextResponse.json(
        { error: "Original message not found" },
        { status: 404 }
      );
    }

    // Determine recipient (opposite of original message direction)
    const recipient = originalMessage.direction === "incoming" 
      ? originalMessage.from 
      : originalMessage.to;

    // Send reaction via Meta WhatsApp API
    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "reaction",
          reaction: {
            message_id: messageId,
            emoji: emoji,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Reaction API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send reaction" },
        { status: response.status }
      );
    }

    const reactionMessageId = data.messages?.[0]?.id;
    const timestamp = new Date();

    // Get or find conversation
    let conversation;
    if (conversationId) {
      conversation = await WhatsAppConversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await WhatsAppConversation.findOne({
        participantPhone: recipient,
        businessPhoneId: phoneNumberId,
      });
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Save reaction message to database
    const savedReaction = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: reactionMessageId,
      businessPhoneId: phoneNumberId,
      from: phoneNumberId,
      to: recipient,
      type: "reaction",
      content: {
        text: `Reacted: ${emoji}`,
      },
      status: "sent",
      statusEvents: [{ status: "sent", timestamp }],
      direction: "outgoing",
      timestamp,
      sentBy: token.id || token._id,
      conversationSnapshot: {
        participantPhone: recipient,
        assignedAgent: conversation.assignedAgent,
      },
      // Store reference to the original message being reacted to
      reactedToMessageId: messageId, // This is the WhatsApp message ID (wamid) of the original message
      reactionEmoji: emoji,
    });

    // Emit socket event for real-time updates
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
      conversationId: conversation._id.toString(),
      businessPhoneId: phoneNumberId,
      message: {
        id: savedReaction._id.toString(),
        messageId: reactionMessageId,
        from: phoneNumberId,
        to: recipient,
        type: "reaction",
        content: { text: `Reacted: ${emoji}` },
        status: "sent",
        direction: "outgoing",
        timestamp,
        senderName: token.name || "You",
      },
    });

    return NextResponse.json({
      success: true,
      messageId: reactionMessageId,
      savedMessageId: savedReaction._id,
      conversationId: conversation._id,
      timestamp: timestamp.toISOString(),
    });
  } catch (error: any) {
    console.error("Send reaction error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
