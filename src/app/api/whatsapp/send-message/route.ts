import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import {
  WHATSAPP_API_BASE_URL,
  INTERNAL_YOU_PHONE_ID,
} from "@/lib/whatsapp/config";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import crypto from "crypto";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, resolveAllowedPhoneIdsAsync } from "@/lib/whatsapp/apiContext";
import { resolveOutboundBusinessPhoneId } from "@/lib/whatsapp/resolveOutboundPhone";
import {
  assertCanInitiateGuestConversation,
  guestConversationExists,
  recordGuestInitiation,
} from "@/lib/whatsapp/initiationLimitService";
import {
  explainOutboundSendCredentialsFailure,
  getChannelByPhoneNumberId,
  resolveOutboundSendCredentials,
  toOutboundTokenConversation,
} from "@/lib/whatsapp/channelService";
import { buildWhatsAppRoomPayload } from "@/lib/whatsapp/socketPayload";
import { isWithinMessagingWindow } from "@/lib/whatsapp/messagingWindow";
import { resolveMessagingWindowAnchor } from "@/lib/whatsapp/messagingWindowServer";

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
    let token: any;
    try {
      token = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
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

    console.log("📤 [send-message] incoming request", {
      hasTo: Boolean(to),
      toMasked: to ? String(to).replace(/\d(?=\d{4})/g, "x") : null,
      type,
      messagePreview: message ? String(message).substring(0, 40) : null,
      conversationId: conversationId || null,
      requestedPhoneId: requestedPhoneId || null,
      user: { id: token?.id || token?._id || null, role: token?.role || null },
    });

    if (!to && !conversationId) {
      return NextResponse.json(
        { error: "Recipient phone number or conversationId is required" },
        { status: 400 }
      );
    }

    const normalizedToken = normalizeWhatsAppToken(token);
    const userRole = normalizedToken.role || "";
    const allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken);

    if (allowedPhoneIds.length === 0 && userRole !== "Advert") {
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
      const allowed = await canAccessConversationAsync(normalizedToken, convLean);
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

    const phoneResolution = await resolveOutboundBusinessPhoneId({
      token: normalizedToken,
      conversation: conversation
        ? (conversation.toObject ? conversation.toObject() : conversation)
        : null,
      requestedPhoneId,
      requireConversation: Boolean(conversationId),
    });

    if ("error" in phoneResolution) {
      return NextResponse.json(
        { error: phoneResolution.error },
        { status: phoneResolution.status }
      );
    }

    const phoneNumberId = phoneResolution.phoneNumberId;

    // 24-hour window is per business line — check against the resolved outbound phone.
    const FREE_FORM_TYPES = [
      "text",
      "image",
      "document",
      "audio",
      "video",
      "sticker",
      "interactive",
    ];
    if (
      conversation &&
      FREE_FORM_TYPES.includes(type) &&
      !templateName
    ) {
      const convObj = conversation.toObject
        ? conversation.toObject()
        : conversation;
      const lastCustomerMsg = await resolveMessagingWindowAnchor({
        conversationId: String(conversation._id),
        businessPhoneId: phoneNumberId,
        conversation: convObj,
      });

      if (!lastCustomerMsg || !isWithinMessagingWindow(lastCustomerMsg)) {
        return NextResponse.json(
          {
            error:
              "The 24-hour messaging window has closed on this WhatsApp line. Send a template message to re-open the conversation.",
            code: "WINDOW_CLOSED",
            lastCustomerMessageAt: lastCustomerMsg?.toISOString() ?? null,
            businessPhoneId: phoneNumberId,
          },
          { status: 400 },
        );
      }
    }

    console.log("📤 [send-message] phone resolution", {
      source: phoneResolution.source,
      conversationBusinessPhoneId: conversation?.businessPhoneId || null,
      resolvedPhoneId: phoneNumberId,
      userRole,
    });

    const convForToken = conversation
      ? toOutboundTokenConversation(
          conversation.toObject ? conversation.toObject() : conversation,
        )
      : undefined;
    const credentials = await resolveOutboundSendCredentials({
      phoneNumberId,
      conversation: convForToken,
      allowWabaPhoneFallback: !conversationId,
    });
    if (!credentials) {
      const failure = await explainOutboundSendCredentialsFailure({
        phoneNumberId,
        conversation: convForToken,
      });
      console.error("📤 [send-message] credential resolution failed", failure);
      return NextResponse.json(
        {
          error: failure.hint,
          code: "INVALID_SEND_CREDENTIALS",
          channelId: failure.channel?.id ?? null,
          channelName: failure.channel?.name ?? null,
          phoneNumberId: failure.requestedPhone,
          hasAccessToken: failure.channel?.hasAccessToken ?? false,
        },
        { status: 400 },
      );
    }
    const sendPhoneNumberId = credentials.phoneNumberId;
    const whatsappToken = credentials.accessToken;

    const rawRecipient =
      conversation?.participantPhone && conversationId
        ? String(conversation.participantPhone)
        : String(to || "");

    // E.164 validation: only digits, 7-15 digits, no leading zero
    const formattedPhone = rawRecipient.replace(/\D/g, "");
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

    if (!conversation && !conversationId) {
      const isNewGuest = !(await guestConversationExists(formattedPhone));
      if (isNewGuest) {
        const initiationCheck = await assertCanInitiateGuestConversation({
          employeeId: normalizedToken.id,
          userRole,
          guestPhone: formattedPhone,
          conversationType: "guest",
        });
        if (!initiationCheck.allowed) {
          return NextResponse.json(
            { error: initiationCheck.message, code: initiationCheck.code },
            { status: 403 },
          );
        }
      }
    }

    // Send message via WhatsApp API
    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${sendPhoneNumberId}/messages`,
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

    console.log("📤 [send-message] Meta API response", {
      ok: response.ok,
      status: response.status,
      messageId: data?.messages?.[0]?.id || null,
      messageStatus: data?.messages?.[0]?.message_status || null,
      contacts: data?.contacts?.[0] ? { waId: data.contacts[0].wa_id } : null,
      error: data?.error
        ? { code: data.error.code, type: data.error.type, message: data.error.message }
        : null,
    });

    if (!response.ok) {
      console.error("📤 [send-message] Meta rejected message:", data);
      const metaCode = data.error?.code;
      if (metaCode === 131047) {
        return NextResponse.json(
          {
            error:
              "The 24-hour messaging window has closed on this WhatsApp line. Send a template message to re-open the conversation.",
            code: "WINDOW_CLOSED",
            metaErrorCode: metaCode,
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: data.error?.message || "Failed to send message" },
        { status: response.status },
      );
    }

    const whatsappMessageId = data.messages?.[0]?.id;

    // Get or create conversation if not already loaded
    if (!conversation) {
      if (conversationId) {
        conversation = await WhatsAppConversation.findById(conversationId);
      }

      if (!conversation) {
        const wasNewGuest = !(await guestConversationExists(formattedPhone));
        const phoneChannel = await getChannelByPhoneNumberId(phoneNumberId);
        conversation = await findOrCreateConversationWithSnapshot({
          participantPhone: formattedPhone,
          businessPhoneId: phoneNumberId,
          participantName: formattedPhone,
          rentalType: phoneChannel?.rentalType,
          channelType: phoneChannel?.channelType,
          snapshotSource: "trusted",
        });
        if (wasNewGuest && conversation._id) {
          await recordGuestInitiation({
            employeeId: normalizedToken.id,
            guestPhone: formattedPhone,
            conversationId: String(conversation._id),
          });
        }
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
      businessPhoneId: sendPhoneNumberId,
      from: sendPhoneNumberId,
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
    const convEmit = conversation.toObject ? conversation.toObject() : conversation;
    emitWhatsAppEvent(
      WHATSAPP_EVENTS.NEW_MESSAGE,
      buildWhatsAppRoomPayload(convEmit as Record<string, unknown>, {
        conversationId: conversation._id.toString(),
        businessPhoneId: sendPhoneNumberId,
        message: {
          id: savedMessage._id.toString(),
          messageId: whatsappMessageId,
          from: sendPhoneNumberId,
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
          ...(replyToMessageId && {
            replyToMessageId,
            replyContext,
          }),
        },
      }),
    );

    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId,
      savedMessageId: savedMessage._id,
      conversationId: conversation._id,
      phoneNumberId: sendPhoneNumberId,
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
