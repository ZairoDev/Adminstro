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
  INTERNAL_YOU_PHONE_ID,
} from "@/lib/whatsapp/config";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import crypto from "crypto";
import { canAccessConversation } from "@/lib/whatsapp/access";

connectDb();

type MediaType = "image" | "document" | "audio" | "video" | "sticker";

interface MediaPayload {
  link?: string;
  id?: string;
  caption?: string;
  filename?: string;
}

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
      mediaType, 
      mediaUrl, 
      mediaId,
      caption, 
      filename,
      conversationId,
      phoneNumberId: requestedPhoneId,
    } = await req.json();

    if (!to || !mediaType || (!mediaUrl && !mediaId)) {
      return NextResponse.json(
        { error: "Phone number, media type, and media URL or ID are required" },
        { status: 400 }
      );
    }

    const validMediaTypes: MediaType[] = ["image", "document", "audio", "video", "sticker"];
    if (!validMediaTypes.includes(mediaType)) {
      return NextResponse.json(
        { error: "Invalid media type. Must be one of: image, document, audio, video, sticker" },
        { status: 400 }
      );
    }

    // =========================================================
    // CRITICAL: Check if this is a "You" conversation FIRST
    // "You" conversations should NEVER call WhatsApp API - only save to DB
    // =========================================================
    let conversation;
    if (conversationId) {
      conversation = await WhatsAppConversation.findById(conversationId);
    }

    // Enforce conversation-level access rules if conversation exists
    if (conversation) {
      const convLean = conversation.toObject ? conversation.toObject() : conversation;
      const allowed = await canAccessConversation(token, convLean);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Block Advert after handover
      if ((token.role || "") === "Advert" && convLean.isRetarget && convLean.retargetStage === "handed_to_sales") {
        return NextResponse.json({ error: "Advert cannot send after handover" }, { status: 403 });
      }

      // Block Sales before handover
      if ((token.role || "") === "Sales" && convLean.isRetarget && convLean.retargetStage !== "handed_to_sales") {
        return NextResponse.json({ error: "Sales cannot send to retarget conversation before handover" }, { status: 403 });
      }
    }

    // Check if this is a "You" conversation BEFORE any WhatsApp API setup
    const isYouConversation = conversation && (
      conversation.source === "internal" || 
      conversation.businessPhoneId === INTERNAL_YOU_PHONE_ID
    );

    if (isYouConversation) {
      // =========================================================
      // "You" conversation - Save to DB ONLY, NO WhatsApp API
      // =========================================================
      const internalMessageId = `internal_${crypto.randomUUID()}`;
      const timestamp = new Date();

      // Build content object
      const contentObj: { text?: string; caption?: string } = {};
      if (caption) {
        contentObj.caption = caption;
      } else {
        contentObj.text = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
      }

      const displayText = caption || `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;

      // Save message to database ONLY (no WhatsApp API call)
      const savedMessage = await WhatsAppMessage.create({
        conversationId: conversation._id,
        messageId: internalMessageId,
        businessPhoneId: INTERNAL_YOU_PHONE_ID,
        from: INTERNAL_YOU_PHONE_ID,
        to: conversation.participantPhone,
        type: mediaType,
        content: contentObj,
        mediaUrl: mediaUrl || "",
        mediaId: mediaId || "",
        filename: filename || "",
        source: "internal",
        status: "sent",
        statusEvents: [],
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
        lastOutgoingMessageTime: timestamp,
      });

      // Emit socket event for real-time UI updates
      emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
        conversationId: conversation._id.toString(),
        businessPhoneId: INTERNAL_YOU_PHONE_ID,
        isInternal: true,
        message: {
          id: savedMessage._id.toString(),
          messageId: internalMessageId,
          from: INTERNAL_YOU_PHONE_ID,
          to: conversation.participantPhone,
          type: mediaType,
          content: contentObj,
          mediaUrl: mediaUrl || "",
          mediaId: mediaId || "",
          filename: filename || "",
          source: "internal",
          status: "sent",
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
    }

    // =========================================================
    // Regular WhatsApp conversation - Continue with Meta API
    // =========================================================

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    let allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    // Advert role: allow sending media on retarget conversations
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
    if (conversationId && !phoneNumberId && conversation) {
      phoneNumberId = conversation.businessPhoneId;
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

    // Build media payload
    const mediaPayload: MediaPayload = {};
    
    if (mediaId) {
      mediaPayload.id = mediaId;
    } else {
      mediaPayload.link = mediaUrl;
    }

    if (caption && (mediaType === "image" || mediaType === "video" || mediaType === "document")) {
      mediaPayload.caption = caption;
    }

    if (filename && mediaType === "document") {
      mediaPayload.filename = filename;
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
          type: mediaType,
          [mediaType]: mediaPayload,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Media API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send media message" },
        { status: response.status }
      );
    }

    const whatsappMessageId = data.messages?.[0]?.id;
    const timestamp = new Date();

    // Get or create conversation if not already loaded
    if (!conversation) {
      if (conversationId) {
        conversation = await WhatsAppConversation.findById(conversationId);
      }

      if (!conversation) {
        // Use helper to find or create with proper snapshot semantics
        // User-initiated media sending is "trusted" - can backfill empty snapshot fields
        conversation = await findOrCreateConversationWithSnapshot({
          participantPhone: formattedPhone,
          businessPhoneId: phoneNumberId,
          participantName: formattedPhone, // Default name for new conversations
          snapshotSource: "trusted",
        });
      }
    }

    // Build content object
    const contentObj: { text?: string; caption?: string } = {};
    if (caption) {
      contentObj.caption = caption;
    } else {
      contentObj.text = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
    }

    const displayText = caption || `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;

    // Save message to database
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: whatsappMessageId,
      businessPhoneId: phoneNumberId,
      from: phoneNumberId,
      to: formattedPhone,
      type: mediaType,
      content: contentObj,
      mediaUrl: mediaUrl || "",
      mediaId: mediaId || "",
      filename: filename || "",
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
      lastMessageContent: displayText.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      lastMessageStatus: "sending",
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
        type: mediaType,
        content: contentObj,
        mediaUrl: mediaUrl || "",
        mediaId: mediaId || "",
        filename: filename || "",
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
    console.error("Send media error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
