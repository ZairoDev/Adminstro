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
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
} from "@/lib/whatsapp/config";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";

connectDb();

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
      to, 
      type, 
      header, 
      body, 
      footer, 
      action,
      conversationId,
      phoneNumberId: requestedPhoneId,
    } = await req.json();

    if (!to || !type || !body || !action) {
      return NextResponse.json(
        { error: "Phone number, type, body, and action are required" },
        { status: 400 }
      );
    }

    const validTypes = ["button", "list", "product", "product_list"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid interactive type. Must be one of: button, list, product, product_list" },
        { status: 400 }
      );
    }

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

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

    // Format phone number
    const formattedPhone = to.replace(/[\s\-\+]/g, "");

    // Build interactive payload
    const interactive: any = {
      type,
      body: { text: body },
      action,
    };

    if (header) {
      interactive.header = header;
    }

    if (footer) {
      interactive.footer = { text: footer };
    }

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
          to: formattedPhone,
          type: "interactive",
          interactive,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Interactive API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send interactive message" },
        { status: response.status }
      );
    }

    const whatsappMessageId = data.messages?.[0]?.id;
    const timestamp = new Date();

    // Get or create conversation using snapshot-safe helper
    let conversation;
    if (conversationId) {
      conversation = await WhatsAppConversation.findById(conversationId);
    }

    if (!conversation) {
      // Use helper to find or create with proper snapshot semantics
      // User-initiated interactive message sending is "trusted" - can backfill empty snapshot fields
      conversation = await findOrCreateConversationWithSnapshot({
        participantPhone: formattedPhone,
        businessPhoneId: phoneNumberId,
        participantName: formattedPhone, // Default name for new conversations
        snapshotSource: "trusted",
      });
    }

    // Build content object with interactivePayload
    const contentObj = {
      text: body,
      interactivePayload: interactive,
    };

    // Save message to database
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: whatsappMessageId,
      businessPhoneId: phoneNumberId,
      from: phoneNumberId,
      to: formattedPhone,
      type: "interactive",
      content: contentObj,
      status: "sent",
      statusEvents: [{ status: "sent", timestamp }],
      direction: "outgoing",
      timestamp,
      sentBy: token.id || token._id,
      conversationSnapshot: {
        participantPhone: formattedPhone,
        assignedAgent: conversation.assignedAgent,
      },
    });

    // Update conversation last message
    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      lastMessageId: whatsappMessageId,
      lastMessageContent: body.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      lastOutgoingMessageTime: timestamp,
    });

    // Emit socket event for real-time updates
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
      conversationId: conversation._id.toString(),
      businessPhoneId: phoneNumberId,
      message: {
        id: savedMessage._id.toString(),
        messageId: whatsappMessageId,
        from: phoneNumberId,
        to: formattedPhone,
        type: "interactive",
        content: contentObj,
        status: "sent",
        direction: "outgoing",
        timestamp,
        senderName: token.name || "You",
      },
    });

    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId,
      savedMessageId: savedMessage._id,
      conversationId: conversation._id,
      timestamp: timestamp.toISOString(),
      data,
    });
  } catch (error: any) {
    console.error("Send interactive error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
