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
  isInternalPhoneId,
} from "@/lib/whatsapp/config";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import crypto from "crypto";
import { canAccessConversation } from "@/lib/whatsapp/access";

connectDb();

/**
 * Send WhatsApp message API
 * Supports: text, image, document, audio, video, sticker, template, interactive
 *
 * For media messages, either provide:
 * - mediaId: Pre-uploaded media ID from /api/whatsapp/upload-media
 * - mediaUrl: Public URL to the media (WhatsApp will fetch it)
 */
export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      to,
      message,
      conversationId,
      phoneNumberId: requestedPhoneId,
      type = "text",
      // Media fields
      mediaId,
      mediaUrl,
      caption,
      filename,
      // Template fields
      templateName,
      templateLanguage,
      templateComponents,
      // Interactive fields
      interactiveType,
      interactiveBody,
      interactiveButtons,
      interactiveAction,
      headerText,
      footerText,
      // Reply fields (optional - for replying to a specific message)
      replyToMessageId, // WhatsApp message ID (wamid) to reply to
    } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Recipient phone number is required" },
        { status: 400 }
      );
    }

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    let allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    // Advert role: allow sending to retarget conversations via retarget phone
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

      // Advert must be blocked from sending after handover
      if ((token.role || "") === "Advert" && convLean.isRetarget && convLean.retargetStage === "handed_to_sales") {
        return NextResponse.json({ error: "Advert cannot send after handover" }, { status: 403 });
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
      
      // Basic validation
      if (type === "text" && !message) {
        return NextResponse.json(
          { error: "Message content is required for text messages" },
          { status: 400 }
        );
      }

      if (["image", "video", "document", "audio", "sticker"].includes(type) && !mediaId && !mediaUrl) {
        return NextResponse.json(
          { error: `Media ID or URL is required for ${type} messages` },
          { status: 400 }
        );
      }

      // Generate internal message ID
      const internalMessageId = `internal_${crypto.randomUUID()}`;
      const timestamp = new Date();

      // Determine content object
      let contentObj: { text?: string; caption?: string; location?: any; interactivePayload?: any } = {};
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
        case "audio":
        case "sticker":
          contentObj.text = `${type.charAt(0).toUpperCase() + type.slice(1)}`;
          displayText = contentObj.text || "";
          break;
        case "interactive":
          contentObj.text = interactiveBody || "";
          contentObj.interactivePayload = {
            type: interactiveType,
            body: interactiveBody,
            buttons: interactiveButtons,
            action: interactiveAction,
            headerText,
            footerText,
          };
          displayText = interactiveBody || "Interactive message";
          break;
        default:
          contentObj.text = message || caption || "";
          displayText = contentObj.text || "";
      }

      // Build reply context if this is a reply
      let replyContext = null;
      if (replyToMessageId) {
        const originalMessage = await WhatsAppMessage.findOne({
          messageId: replyToMessageId,
        }).lean() as any;

        if (originalMessage) {
          replyContext = {
            messageId: originalMessage.messageId,
            from: originalMessage.from,
            type: originalMessage.type,
            content: {
              text: originalMessage.content?.text,
              caption: originalMessage.content?.caption,
            },
            mediaUrl: originalMessage.mediaUrl,
          };
        }
      }

      // Save the internal message to database ONLY
      const savedMessage = await WhatsAppMessage.create({
        conversationId: conversation._id,
        messageId: internalMessageId,
        businessPhoneId: INTERNAL_YOU_PHONE_ID,
        from: INTERNAL_YOU_PHONE_ID,
        to: conversation.participantPhone,
        type,
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
        ...(replyToMessageId && {
          replyToMessageId,
          replyContext,
        }),
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
          type,
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
          ...(replyToMessageId && {
            replyToMessageId,
            replyContext,
          }),
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
    if (
      !phoneNumberId ||
      !canAccessPhoneId(phoneNumberId, userRole, userAreas)
    ) {
      return NextResponse.json(
        {
          error: "You don't have permission to send from this WhatsApp number",
        },
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

    // E.164 validation: only digits, 7-15 digits, no leading zero
    const formattedPhone = to.replace(/\D/g, "");
    if (!/^[1-9][0-9]{6,14}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: "Phone number must be in E.164 format (country code + number, 7-15 digits, no leading zero)." },
        { status: 400 }
      );
    }

    // Build message payload based on type
    let messagePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type,
    };

    // Add reply context if replying to a message
    // WhatsApp API: context.message_id specifies the message being replied to
    if (replyToMessageId) {
      messagePayload.context = {
        message_id: replyToMessageId,
      };
    }

    switch (type) {
      case "text":
        if (!message) {
          return NextResponse.json(
            { error: "Message content is required for text messages" },
            { status: 400 }
          );
        }
        messagePayload.text = {
          preview_url: true,
          body: message,
        };
        break;

      case "image":
        if (!mediaId && !mediaUrl) {
          return NextResponse.json(
            { error: "Media ID or URL is required for image messages" },
            { status: 400 }
          );
        }
        messagePayload.image = {
          ...(mediaId ? { id: mediaId } : { link: mediaUrl }),
          ...(caption && { caption }),
        };
        break;

      case "document":
        if (!mediaId && !mediaUrl) {
          return NextResponse.json(
            { error: "Media ID or URL is required for document messages" },
            { status: 400 }
          );
        }
        messagePayload.document = {
          ...(mediaId ? { id: mediaId } : { link: mediaUrl }),
          ...(caption && { caption }),
          ...(filename && { filename }),
        };
        break;

      case "audio":
        if (!mediaId && !mediaUrl) {
          return NextResponse.json(
            { error: "Media ID or URL is required for audio messages" },
            { status: 400 }
          );
        }
        messagePayload.audio = mediaId ? { id: mediaId } : { link: mediaUrl };
        break;

      case "video":
        if (!mediaId && !mediaUrl) {
          return NextResponse.json(
            { error: "Media ID or URL is required for video messages" },
            { status: 400 }
          );
        }
        messagePayload.video = {
          ...(mediaId ? { id: mediaId } : { link: mediaUrl }),
          ...(caption && { caption }),
        };
        break;

      case "sticker":
        if (!mediaId && !mediaUrl) {
          return NextResponse.json(
            { error: "Media ID or URL is required for sticker messages" },
            { status: 400 }
          );
        }
        messagePayload.sticker = mediaId ? { id: mediaId } : { link: mediaUrl };
        break;

      case "template":
        if (!templateName) {
          return NextResponse.json(
            { error: "Template name is required for template messages" },
            { status: 400 }
          );
        }
        messagePayload.template = {
          name: templateName,
          language: { code: templateLanguage || "en" },
          ...(templateComponents && { components: templateComponents }),
        };
        break;

      case "interactive":
        if (!interactiveType || !interactiveBody) {
          return NextResponse.json(
            { error: "Interactive type and body are required" },
            { status: 400 }
          );
        }
        messagePayload.interactive = {
          type: interactiveType, // "button" | "list" | "product" | "product_list"
          body: { text: interactiveBody },
          ...(headerText && { header: { type: "text", text: headerText } }),
          ...(footerText && { footer: { text: footerText } }),
          ...(interactiveType === "button" &&
            interactiveButtons && {
              action: { buttons: interactiveButtons },
            }),
          ...(interactiveType === "list" &&
            interactiveAction && {
              action: interactiveAction,
            }),
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported message type: ${type}` },
          { status: 400 }
        );
    }

    // Send message via WhatsApp API
    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send message" },
        { status: response.status }
      );
    }

    const whatsappMessageId = data.messages?.[0]?.id;

    // Get or create conversation if not already loaded
    if (!conversation) {
      if (conversationId) {
        conversation = await WhatsAppConversation.findById(conversationId);
      }

      if (!conversation) {
        // Use helper to find or create with proper snapshot semantics
        // User-initiated message sending is "trusted" - can backfill empty snapshot fields
        conversation = await findOrCreateConversationWithSnapshot({
          participantPhone: formattedPhone,
          businessPhoneId: phoneNumberId,
          participantName: formattedPhone, // Default name for new conversations
          snapshotSource: "trusted",
        });
      }
    }

    // Continue with normal Meta API sending for non-internal conversations

    // Determine content object to save based on type
    let contentObj: { text?: string; caption?: string; location?: any; interactivePayload?: any } = {};
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
      case "audio":
      case "sticker":
        contentObj.text = `${type.charAt(0).toUpperCase() + type.slice(1)}`;
        displayText = contentObj.text || "";
        break;
      case "template":
        contentObj.text = `Template: ${templateName}`;
        displayText = contentObj.text || "";
        break;
      case "interactive":
        contentObj.text = interactiveBody || "";
        contentObj.interactivePayload = {
          type: interactiveType,
          body: interactiveBody,
          buttons: interactiveButtons,
          action: interactiveAction,
          headerText,
          footerText,
        };
        displayText = interactiveBody || "Interactive message";
        break;
      default:
        contentObj.text = message || caption || "";
        displayText = contentObj.text || "";
    }

    const timestamp = new Date(); // Use same timestamp for consistency

    // Build reply context if this is a reply
    let replyContext = null;
    if (replyToMessageId) {
      // Look up the original message to store context
      const originalMessage = await WhatsAppMessage.findOne({
        messageId: replyToMessageId,
      }).lean() as any;

      if (originalMessage) {
        replyContext = {
          messageId: originalMessage.messageId,
          from: originalMessage.from,
          type: originalMessage.type,
          content: {
            text: originalMessage.content?.text,
            caption: originalMessage.content?.caption,
          },
          mediaUrl: originalMessage.mediaUrl,
        };
      }
    }

    // Save message to database
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: whatsappMessageId,
      businessPhoneId: phoneNumberId,
      from: phoneNumberId,
      to: formattedPhone,
      type,
      content: contentObj,
      mediaUrl: mediaUrl || "",
      mediaId: mediaId || "",
      mimeType: "",
      filename: filename || "",
      ...(type === "template" && {
        templateName,
        templateLanguage: templateLanguage || "en",
      }),
      // Reply context fields
      ...(replyToMessageId && {
        replyToMessageId,
        replyContext,
      }),
      status: "sent",
      statusEvents: [{ status: "sent", timestamp }],
      direction: "outgoing",
      timestamp: timestamp,
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

    // CRITICAL FIX: Emit socket event for real-time updates
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
      conversationId: conversation._id.toString(),
      businessPhoneId: phoneNumberId,
      message: {
        id: savedMessage._id.toString(),
        messageId: whatsappMessageId,
        from: phoneNumberId,
        to: formattedPhone,
        type: type,
        content: contentObj,
        mediaUrl: mediaUrl || "",
        mediaId: mediaId || "",
        filename: filename || "",
        status: "sent",
        direction: "outgoing",
        timestamp: timestamp,
        senderName: token.name || "You",
        // Include reply context if this is a reply
        ...(replyToMessageId && {
          replyToMessageId,
          replyContext,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId,
      savedMessageId: savedMessage._id,
      conversationId: conversation._id,
      phoneNumberId,
      timestamp: timestamp.toISOString(), // Return timestamp for frontend
      data,
    });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
