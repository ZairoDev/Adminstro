import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import { INTERNAL_YOU_PHONE_ID } from "@/lib/whatsapp/config";
import crypto from "crypto";

connectDb();

/**
 * Send an internal message from the "You" virtual number
 * 
 * These messages:
 * - Are saved to DB for persistence
 * - Appear instantly in the chat UI
 * - NEVER reach Meta WhatsApp API
 * - NEVER trigger notifications
 * - Have no delivery status updates
 * - Are searchable and persistent
 */
export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      conversationId,
      message,
      type = "text",
      // Optional fields for media
      mediaUrl,
      caption,
      filename,
    } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    if (!message && type === "text") {
      return NextResponse.json(
        { error: "Message content is required for text messages" },
        { status: 400 }
      );
    }

    // Get the conversation
    const conversation = await WhatsAppConversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Generate a unique internal message ID (not a wamid, but our own UUID)
    const internalMessageId = `internal_${crypto.randomUUID()}`;
    const timestamp = new Date();

    // Determine content object
    let contentObj: { text?: string; caption?: string } = {};
    let displayText = "";

    switch (type) {
      case "text":
        contentObj.text = message || "";
        displayText = message || "";
        break;
      case "image":
      case "video":
      case "document":
        contentObj.caption = caption || "";
        displayText = caption || `${type.charAt(0).toUpperCase() + type.slice(1)}`;
        break;
      default:
        contentObj.text = message || caption || "";
        displayText = contentObj.text || "";
    }

    // Save the internal message to database
    // CRITICAL: source = "internal" ensures this is never processed as a real WhatsApp message
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: internalMessageId,
      businessPhoneId: INTERNAL_YOU_PHONE_ID, // Internal phone ID
      from: INTERNAL_YOU_PHONE_ID, // From "You"
      to: conversation.participantPhone,
      type,
      content: contentObj,
      mediaUrl: mediaUrl || "",
      filename: filename || "",
      // CRITICAL: Mark as internal source
      source: "internal",
      // Internal messages don't have delivery status
      status: "sent", // Always "sent" immediately (no delivery tracking)
      statusEvents: [], // No status events for internal messages
      direction: "outgoing",
      timestamp,
      sentBy: token.id || token._id,
      conversationSnapshot: {
        participantPhone: conversation.participantPhone,
        assignedAgent: conversation.assignedAgent,
      },
    });

    // Update conversation last message
    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      lastMessageId: internalMessageId,
      lastMessageContent: displayText.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      // Internal messages don't have a status indicator
      lastMessageStatus: undefined,
      lastOutgoingMessageTime: timestamp,
    });

    // Emit socket event for real-time UI updates
    // Note: This is a local UI event, not a notification
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
      conversationId: conversation._id.toString(),
      businessPhoneId: INTERNAL_YOU_PHONE_ID,
      isInternal: true, // Flag for UI to handle differently
      message: {
        id: savedMessage._id.toString(),
        messageId: internalMessageId,
        from: INTERNAL_YOU_PHONE_ID,
        to: conversation.participantPhone,
        type,
        content: contentObj,
        mediaUrl: mediaUrl || "",
        filename: filename || "",
        source: "internal",
        status: "sent", // Always sent for internal
        direction: "outgoing",
        timestamp,
        senderName: token.name || "You",
        isInternal: true,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: internalMessageId,
      savedMessageId: savedMessage._id,
      conversationId: conversation._id,
      source: "internal",
      timestamp: timestamp.toISOString(),
    });
  } catch (error: any) {
    console.error("Send internal message error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
