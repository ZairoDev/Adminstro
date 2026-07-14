import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import {
  getDefaultPhoneId,
  getRetargetPhoneId,
  WHATSAPP_API_BASE_URL,
  isSalesWhatsAppRole,
} from "@/lib/whatsapp/config";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken } from "@/lib/whatsapp/apiContext";
import { leadGenCreateHandoffFields } from "@/lib/whatsapp/leadGenHandoff";
import { resolveOutboundBusinessPhoneId } from "@/lib/whatsapp/resolveOutboundPhone";
import {
  explainOutboundSendCredentialsFailure,
  getChannelByPhoneNumberId,
  getOutboundTokenForPhoneId,
  resolveOutboundSendCredentials,
  toOutboundTokenConversation,
} from "@/lib/whatsapp/channelService";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import RetargetContact from "@/models/retargetContact";
import { isTemplateAllowedForConversationRentalType } from "@/lib/whatsapp/templateClassification";
import {
  assertCanInitiateGuestConversation,
  guestWasPreviouslyEngaged,
  maybeReserveGuestInitiation,
} from "@/lib/whatsapp/initiationLimitService";

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

    console.log("📨 [send-template] incoming request");

    const { 
      to, 
      templateName, 
      languageCode = "en", 
      components = [],
      conversationId,
      phoneNumberId: requestedPhoneId,
      uploadedContactId, // optional: ID of RetargetContact when sending uploaded contacts
      templateText, // The filled-in template text for display
      isRetarget = false, // STEP 2: Flag to indicate this is a retarget message
    } = await req.json();

    console.log("📨 [send-template] payload", {
      hasTo: Boolean(to),
      toMasked: to ? String(to).replace(/\d(?=\d{4})/g, "x") : null,
      conversationId: conversationId || null,
      templateName: templateName || null,
      languageCode,
      componentsCount: Array.isArray(components) ? components.length : null,
      requestedPhoneId: requestedPhoneId || null,
      uploadedContactId: uploadedContactId || null,
      isRetarget: Boolean(isRetarget),
      user: { id: token?.id || token?._id || null, role: token?.role || null, email: token?.email || null },
    });


    if (!templateName) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // Resolve recipient: use `to` if provided, else get from conversation when conversationId is provided
    let recipientPhone = to;
    if (!recipientPhone && conversationId) {
      const convForTo = await WhatsAppConversation.findById(conversationId).select("participantPhone").lean() as { participantPhone?: string } | null;
      if (convForTo?.participantPhone) {
        recipientPhone = convForTo.participantPhone;
      }
    }
    if (!recipientPhone) {
      return NextResponse.json(
        { error: "Phone number (to) or conversationId with participant is required" },
        { status: 400 }
      );
    }
    console.log("📨 [send-template] resolved recipient", {
      fromConversation: !to && Boolean(conversationId),
      recipientMasked: String(recipientPhone).replace(/\d(?=\d{4})/g, "x"),
    });

    const normalizedToken = normalizeWhatsAppToken(token);
    const userRole = normalizedToken.role || "";
    const userAreas = normalizedToken.allotedArea;

    const formattedPhone = normalizePhone(recipientPhone);
    if (!/^[1-9][0-9]{6,14}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: "Phone number must be in E.164 format (country code + number, 7-15 digits, no leading zero)." },
        { status: 400 }
      );
    }

    // Load conversation and enforce access before calling Meta
    let conversation;
    if (conversationId) {
      conversation = await WhatsAppConversation.findById(conversationId);
    }

    if (conversation) {
      const convLean = conversation.toObject ? conversation.toObject() : conversation;
      const allowed = await canAccessConversationAsync(normalizedToken, convLean);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if ((token.role || "") === "Advert" && convLean.isRetarget && convLean.retargetStage === "handed_to_sales") {
        return NextResponse.json({ error: "Advert cannot send after handover" }, { status: 403 });
      }

      if (
        isSalesWhatsAppRole(token.role || "") &&
        convLean.isRetarget &&
        convLean.retargetStage !== "handed_to_sales"
      ) {
        return NextResponse.json(
          { error: "Sales cannot send to retarget conversation before handover" },
          { status: 403 },
        );
      }

      const channelScoped = Boolean(
        convLean.whatsappChannelId || convLean.wabaId,
      );
      if (
        !isRetarget &&
        !isTemplateAllowedForConversationRentalType(
          templateName,
          convLean.rentalType,
          { channelScoped },
        )
      ) {
        return NextResponse.json(
          {
            error:
              "This template is not allowed for this conversation's rental type",
          },
          { status: 400 },
        );
      }
    }

    let phoneNumberId: string;

    if (isRetarget) {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        phoneNumberId = retargetPhoneId;
      } else {
        console.warn("⚠️ Retarget phone ID not configured, falling back to default");
        phoneNumberId = getDefaultPhoneId(userRole, userAreas) || "";
      }
    } else {
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
          { status: phoneResolution.status },
        );
      }
      phoneNumberId = phoneResolution.phoneNumberId;
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "No phone number ID available" },
        { status: 400 }
      );
    }

    const convForToken = conversation
      ? toOutboundTokenConversation(
          conversation.toObject ? conversation.toObject() : conversation,
        )
      : undefined;

    let sendPhoneNumberId = phoneNumberId;
    let whatsappToken: string;
    let credentialSource = "retarget_or_default";

    if (isRetarget) {
      whatsappToken = await getOutboundTokenForPhoneId(phoneNumberId);
      if (!whatsappToken) {
        return NextResponse.json(
          { error: "WhatsApp configuration missing for retarget line" },
          { status: 500 },
        );
      }
    } else {
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
        console.error("📨 [send-template] credential resolution failed", failure);
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

      sendPhoneNumberId = credentials.phoneNumberId;
      whatsappToken = credentials.accessToken;
      credentialSource = credentials.source;
    }

    console.log("📨 [send-template] resolved credentials", {
      requestedPhoneNumberId: phoneNumberId,
      sendPhoneNumberId,
      credentialSource,
      isRetarget: Boolean(isRetarget),
    });

    const parsedRecipient = parsePhoneNumberFromString(`+${formattedPhone}`);
    const sendTemplateToMeta = async (fromPhoneId: string, token: string) =>
      fetch(`${WHATSAPP_API_BASE_URL}/${fromPhoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components: components,
          },
        }),
      });

    const templateNameLowerPrecheck = String(templateName || "").toLowerCase();
    const isOwnerTemplate =
      templateNameLowerPrecheck.includes("owners_template") ||
      templateNameLowerPrecheck.startsWith("owner");
    const existingConvType = conversation?.conversationType;

    let shouldReserveGuestInitiation = false;
    if (!isRetarget && !isOwnerTemplate && existingConvType !== "owner") {
      const needsInitiationGate = !(await guestWasPreviouslyEngaged(formattedPhone));
      if (needsInitiationGate) {
        shouldReserveGuestInitiation = true;
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

    console.log("📨 [send-template] sending to Meta", {
      toE164: formattedPhone.replace(/\d(?=\d{4})/g, "x"),
      countryCallingCode: parsedRecipient?.countryCallingCode ?? null,
      nationalNumberMasked: parsedRecipient?.nationalNumber
        ? String(parsedRecipient.nationalNumber).replace(/\d(?=\d{4})/g, "x")
        : null,
      templateName,
      languageCode,
      phoneNumberId: sendPhoneNumberId,
      credentialSource,
      components: Array.isArray(components) ? components : [],
    });

    const response = await sendTemplateToMeta(sendPhoneNumberId, whatsappToken);
    const data = await response.json();
    console.log("📨 [send-template] Meta response", {
      ok: response.ok,
      status: response.status,
      messageId: data?.messages?.[0]?.id || null,
      messageStatus: data?.messages?.[0]?.message_status || null,
      contacts: data?.contacts?.[0] ? { waId: data.contacts[0].wa_id, inputPhone: data.contacts[0].input } : null,
      error: data?.error ? { message: data.error.message, type: data.error.type, code: data.error.code, errorData: data.error.error_data || null } : null,
      rawResponse: response.ok ? undefined : data,
    });

    if (!response.ok) {
      console.error("WhatsApp Template API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send template message" },
        { status: response.status }
      );
    }

    const whatsappMessageId = data.messages?.[0]?.id;
    if (!whatsappMessageId) {
      console.error("❌ [send-template] No message ID returned from Meta", data);
    }
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
        channelType: phoneChannel.channelType,
        rentalType: phoneChannel.rentalType,
        snapshotSource: isRetarget ? "untrusted" : "trusted",
        ...leadGenCreateHandoffFields(userRole),
      });

      const convLean = conversation.toObject ? conversation.toObject() : conversation;
      const allowed = await canAccessConversationAsync(normalizedToken, convLean);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Use provided template text or fallback
    const displayText = templateText || `Template: ${templateName}`;
    const contentObj = { text: displayText };

    // Save message to database
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: whatsappMessageId,
      businessPhoneId: sendPhoneNumberId,
      from: sendPhoneNumberId,
      to: formattedPhone,
      type: "template",
      content: contentObj,
      templateName,
      templateLanguage: languageCode,
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

    // Determine conversation type based on template name
    const templateNameLower = templateName.toLowerCase();
    const conversationType = (templateNameLower.includes("owners_template") || templateNameLower.startsWith("owner"))
      ? "owner"
      : "guest";

    // Update conversation last message and conversation type
    const conversationUpdate: any = {
      lastMessageId: whatsappMessageId,
      lastMessageContent: displayText.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      lastMessageStatus: "sending",
      lastOutgoingMessageTime: timestamp,
      conversationType, // Set conversation type when template is sent
    };

    // Flag the conversation as retarget if this is a retarget message
    if (isRetarget) {
      conversationUpdate.isRetarget = true;
      conversationUpdate.retargetStage = "initiated";
      conversationUpdate.ownerRole = "Advert";
      conversationUpdate.ownerUserId = token.id || token._id;
      conversationUpdate.retargetAgentId = token.id || token._id;
      conversationUpdate.retargetTemplateName = templateName;
    }
  
  // If we have an uploadedContactId for retarget, try to save the contact's name into the conversation
  if (isRetarget && (uploadedContactId || uploadedContactId === 0)) {
    try {
      const contact = (await RetargetContact.findById(uploadedContactId).lean()) as any;
      if (contact && contact.name) {
        // Only set participantName if conversation currently has no meaningful name
        const currentName = (conversation && (conversation.participantName || "")) || "";
        const formattedPhoneForComparison = formattedPhone;
        if (!currentName || currentName === formattedPhoneForComparison) {
          conversationUpdate.participantName = contact.name;
        }
      }
    } catch (err) {
      console.error("Failed to read RetargetContact for name:", err);
    }
  }

    await WhatsAppConversation.findByIdAndUpdate(conversation._id, conversationUpdate);

    if (shouldReserveGuestInitiation && conversationType !== "owner") {
      await maybeReserveGuestInitiation({
        employeeId: normalizedToken.id,
        userRole,
        guestPhone: formattedPhone,
        conversationId: String(conversation._id),
        conversationType: "guest",
        reservedAt: timestamp,
      }).catch((err) => console.warn("[initiation] reserve:", err));
    }

    // Emit socket event for real-time updates (global)
    const emitPayload = {
      conversationId: conversation._id.toString(),
      businessPhoneId: sendPhoneNumberId,
      isRetarget: !!isRetarget,
      message: {
        id: savedMessage._id.toString(),
        messageId: whatsappMessageId,
        from: sendPhoneNumberId,
        to: formattedPhone,
        type: "template",
        content: contentObj,
        status: "sent",
        direction: "outgoing",
        timestamp,
        senderName: token.name || "You",
      },
    };
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, emitPayload);

    // Note: phone-specific room emission is handled centrally in lib/pusher.emitWhatsAppEvent

    // If this send was for an uploaded contact, update RetargetContact record
    try {
      if (isRetarget && (uploadedContactId || uploadedContactId === 0)) {
        await RetargetContact.findByIdAndUpdate(uploadedContactId, {
          $inc: { retargetCount: 1 },
          $set: { state: "retargeted", lastRetargetAt: new Date() },
        });
      }
    } catch (err) {
      // Log but don't fail the send
      console.error("Failed to update retarget contact state:", err);
    }

    // =========================================================
    // STEP 2 & 3: Lead/Owner Tracking & Retarget Count Logic
    // =========================================================
    // - Always update whatsappLastMessageAt for cooldown tracking
    // - If isRetarget: increment whatsappRetargetCount & set whatsappLastRetargetAt
    // - Count is incremented ONLY after API accepts (not on failures)
    // - Now handles both leads (Query) and owners (unregisteredOwner)
    try {
      const QueryModel = (await import("@/models/query")).default;
      const { unregisteredOwner: UnregisteredOwnerModel } = await import("@/models/unregisteredOwner");
      const normalizedPhone = formattedPhone.replace(/\D/g, "");
      
      // Try to find lead by phone (try last 9, 8, 7 digits)
      let target: any = null;
      let targetType: "lead" | "owner" | null = null;
      
      for (const len of [9, 8, 7]) {
        if (normalizedPhone.length < len) continue;
        const lastDigits = normalizedPhone.slice(-len);
        const regex = new RegExp(`${lastDigits}$`);
        
        // First try leads
        target = await QueryModel.findOne({ phoneNo: { $regex: regex } });
        if (target) {
          targetType = "lead";
          break;
        }
        
        // Then try unregistered owners
        target = await UnregisteredOwnerModel.findOne({ phoneNumber: { $regex: regex } });
        if (target) {
          targetType = "owner";
          break;
        }
      }

      if (target && targetType) {
        // Build update object
        const updateFields: any = {
          whatsappLastMessageAt: timestamp,
        };
        
        // STEP 2: If this is a retarget message, increment count and update date
        // WHY: Track how many times we've retargeted this lead/owner (max 3 allowed)
        if (isRetarget) {
          updateFields.whatsappLastRetargetAt = timestamp;
        }

        // Use $inc for retarget count to ensure atomicity
        const updateQuery: any = { $set: updateFields };
        if (isRetarget) {
          updateQuery.$inc = { whatsappRetargetCount: 1 };
        }

        if (targetType === "lead") {
          // For leads, update the single document
          await QueryModel.updateOne({ _id: target._id }, updateQuery);
        } else {
          // For owners, update ALL documents with the same phone number
          // This is important because same owner can have multiple property entries
          const lastDigits = normalizedPhone.slice(-9);
          const phoneRegex = new RegExp(`${lastDigits}$`);
          
          // Find all matching documents first for logging
          const matchingDocs = await UnregisteredOwnerModel.find({ phoneNumber: { $regex: phoneRegex } }).select('_id phoneNumber whatsappRetargetCount').lean();

          
          const updateResult = await UnregisteredOwnerModel.updateMany(
            { phoneNumber: { $regex: phoneRegex } },
            updateQuery
          );
          

          
          // Verify the update by fetching one document
          if (updateResult.modifiedCount > 0) {
            const verifyDoc = await UnregisteredOwnerModel.findOne({ phoneNumber: { $regex: phoneRegex } }).select('phoneNumber whatsappRetargetCount whatsappLastRetargetAt whatsappLastMessageAt').lean() as any;
            if (verifyDoc) {

            }
          }
        }
        
        if (isRetarget) {
          const newCount = (target.whatsappRetargetCount || 0) + 1;
          console.log(`🎯 [AUDIT] Retarget sent to ${targetType} ${target._id} (phone: ${normalizedPhone}, count: ${newCount})`);
        } else {
          console.log(`📤 [AUDIT] Template sent to ${targetType} ${target._id} (phone: ${normalizedPhone})`);
        }
        
        // If conversation has no meaningful name yet, and target has a name, set it
        try {
          const currentName = (conversation && (conversation.participantName || "")) || "";
          const targetName = (target as any)?.name;
          if (target && targetName && (!currentName || currentName === formattedPhone)) {
            await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
              participantName: targetName,
            });

          }
        } catch (err) {
          console.error("Failed to update conversation participantName from target:", err);
        }
      }
    } catch (err) {
      // Don't fail the send if lead/owner tracking fails
      console.error("Error updating lead/owner tracking:", err);
    }

    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId,
      savedMessageId: savedMessage._id,
      conversationId: conversation._id,
      timestamp: timestamp.toISOString(),
      data,
    });
  } catch (error: any) {
    console.error("Send template error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
