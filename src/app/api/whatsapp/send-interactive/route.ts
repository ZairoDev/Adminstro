import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import { WHATSAPP_API_BASE_URL } from "@/lib/whatsapp/config";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { isSalesWhatsAppRole } from "@/lib/whatsapp/config";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import { getChannelByPhoneNumberId, getOutboundTokenForPhoneId } from "@/lib/whatsapp/channelService";
import { normalizeWhatsAppToken, resolveAllowedPhoneIdsAsync } from "@/lib/whatsapp/apiContext";
import { resolveOutboundBusinessPhoneId } from "@/lib/whatsapp/resolveOutboundPhone";
import { buildWhatsAppRoomPayload } from "@/lib/whatsapp/socketPayload";
import { leadGenCreateHandoffFields } from "@/lib/whatsapp/leadGenHandoff";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as Record<string, unknown>;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const normalizedToken = normalizeWhatsAppToken(token);
    const userRole = normalizedToken.role || "";
    const allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken);

    if (allowedPhoneIds.length === 0 && userRole !== "Advert") {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    let conversation = conversationId
      ? await WhatsAppConversation.findById(conversationId)
      : null;

    if (conversationId) {
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const convLean = conversation.toObject ? conversation.toObject() : conversation;
      const allowed = await canAccessConversationAsync(normalizedToken, convLean);
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      if ((token.role || "") === "Advert" && convLean.isRetarget && convLean.retargetStage === "handed_to_sales") {
        return NextResponse.json({ error: "Advert cannot send interactive after handover" }, { status: 403 });
      }
      if (isSalesWhatsAppRole(String(token.role || "")) && convLean.isRetarget && convLean.retargetStage !== "handed_to_sales") {
        return NextResponse.json({ error: "Sales cannot send interactive to retarget conversation before handover" }, { status: 403 });
      }
    }

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
    const convForToken = conversation
      ? (conversation.toObject ? conversation.toObject() : conversation)
      : null;

    const whatsappToken = await getOutboundTokenForPhoneId(
      phoneNumberId,
      convForToken
        ? {
            whatsappChannelId: convForToken.whatsappChannelId,
            businessPhoneId: phoneNumberId,
          }
        : null,
    );

    if (!whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp configuration missing" },
        { status: 500 }
      );
    }

    const formattedPhone = normalizePhone(String(to ?? ""));

    const interactive: Record<string, unknown> = {
      type,
      body: { text: body },
      action,
    };
    if (header) interactive.header = header;
    if (footer) interactive.footer = { text: footer };

    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
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
        { error: (data as { error?: { message?: string } })?.error?.message || "Failed to send interactive message" },
        { status: response.status }
      );
    }

    const whatsappMessageId = (data as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id;
    const timestamp = new Date();

    if (!conversation) {
      const phoneChannel = await getChannelByPhoneNumberId(phoneNumberId);
      if (!phoneChannel) {
        return NextResponse.json(
          { error: "No WhatsApp channel configured for this phone line" },
          { status: 400 },
        );
      }
      conversation = await findOrCreateConversationWithSnapshot({
        participantPhone: formattedPhone,
        whatsappChannelId: phoneChannel.channelId,
        businessPhoneId: phoneNumberId,
        participantName: formattedPhone,
        participantLocation: convForToken?.participantLocation,
        conversationType: convForToken?.conversationType,
        rentalType: phoneChannel.rentalType,
        channelType: phoneChannel.channelType,
        snapshotSource: "trusted",
        ...leadGenCreateHandoffFields(userRole),
      });
    }

    const contentObj = {
      text: body,
      interactivePayload: interactive,
    };

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

    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      lastMessageId: whatsappMessageId,
      lastMessageContent: String(body).substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      lastOutgoingMessageTime: timestamp,
    });

    const convRecord = conversation.toObject ? conversation.toObject() : conversation;
    emitWhatsAppEvent(
      WHATSAPP_EVENTS.NEW_MESSAGE,
      buildWhatsAppRoomPayload(convRecord as Record<string, unknown>, {
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
      }),
    );

    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId,
      savedMessageId: savedMessage._id,
      conversationId: conversation._id,
      timestamp: timestamp.toISOString(),
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Send interactive error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
