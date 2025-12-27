import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher"; // ADD THIS IMPORT
import {
  canAccessPhoneId,
  getAllowedPhoneIds,
  getDefaultPhoneId,
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
} from "@/lib/whatsapp/config";

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
      const conv = (await WhatsAppConversation.findById(
        conversationId
      ).lean()) as any;
      if (conv) {
        phoneNumberId = conv.businessPhoneId;
      }
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

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await WhatsAppConversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await WhatsAppConversation.findOne({
        participantPhone: formattedPhone,
        businessPhoneId: phoneNumberId,
      });
    }

    if (!conversation) {
      conversation = await WhatsAppConversation.create({
        participantPhone: formattedPhone,
        participantName: formattedPhone,
        businessPhoneId: phoneNumberId,
        status: "active",
        unreadCount: 0,
      });
    }

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
