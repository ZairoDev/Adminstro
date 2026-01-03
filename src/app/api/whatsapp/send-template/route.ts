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
      templateName, 
      languageCode = "en", 
      components = [],
      conversationId,
      phoneNumberId: requestedPhoneId,
      templateText, // The filled-in template text for display
      isRetarget = false, // STEP 2: Flag to indicate this is a retarget message
    } = await req.json();

    if (!to || !templateName) {
      return NextResponse.json(
        { error: "Phone number and template name are required" },
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

      // E.164 validation: only digits, 7-15 digits, no leading zero
      const formattedPhone = to.replace(/\D/g, "");
      if (!/^[1-9][0-9]{6,14}$/.test(formattedPhone)) {
        return NextResponse.json(
          { error: "Phone number must be in E.164 format (country code + number, 7-15 digits, no leading zero)." },
          { status: 400 }
        );
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
          type: "template",
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components: components,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Template API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send template message" },
        { status: response.status }
      );
    }

    const whatsappMessageId = data.messages?.[0]?.id;
    const timestamp = new Date();

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

    // Use provided template text or fallback
    const displayText = templateText || `Template: ${templateName}`;
    const contentObj = { text: displayText };

    // Save message to database
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: whatsappMessageId,
      businessPhoneId: phoneNumberId,
      from: phoneNumberId,
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
    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      lastMessageId: whatsappMessageId,
      lastMessageContent: displayText.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      lastMessageStatus: "sending",
      lastOutgoingMessageTime: timestamp,
      conversationType, // Set conversation type when template is sent
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
        type: "template",
        content: contentObj,
        status: "sent",
        direction: "outgoing",
        timestamp,
        senderName: token.name || "You",
      },
    });

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
          console.log(`🔍 [AUDIT] Found ${matchingDocs.length} owner documents with phone ending in ${lastDigits}`);
          
          const updateResult = await UnregisteredOwnerModel.updateMany(
            { phoneNumber: { $regex: phoneRegex } },
            updateQuery
          );
          
          console.log(`📊 [AUDIT] Updated ${updateResult.modifiedCount} owner documents with same phone`);
          console.log(`📝 [AUDIT] Update query:`, JSON.stringify(updateQuery, null, 2));
          
          // Verify the update by fetching one document
          if (updateResult.modifiedCount > 0) {
            const verifyDoc = await UnregisteredOwnerModel.findOne({ phoneNumber: { $regex: phoneRegex } }).select('phoneNumber whatsappRetargetCount whatsappLastRetargetAt whatsappLastMessageAt').lean() as any;
            if (verifyDoc) {
              console.log(`✅ [AUDIT] Verified update - retargetCount: ${verifyDoc.whatsappRetargetCount}, lastRetargetAt: ${verifyDoc.whatsappLastRetargetAt}, lastMessageAt: ${verifyDoc.whatsappLastMessageAt}`);
            }
          }
        }
        
        if (isRetarget) {
          const newCount = (target.whatsappRetargetCount || 0) + 1;
          console.log(`🎯 [AUDIT] Retarget sent to ${targetType} ${target._id} (phone: ${normalizedPhone}, count: ${newCount})`);
        } else {
          console.log(`📤 [AUDIT] Template sent to ${targetType} ${target._id} (phone: ${normalizedPhone})`);
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
