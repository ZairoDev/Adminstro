import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
  getDefaultPhoneId,
  WHATSAPP_PHONE_CONFIGS,
} from "@/lib/whatsapp/config";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";

connectDb();

// Function to send WhatsApp template to lead (Thessaloniki only)
async function sendGuestGreetingTemplate( 
  phoneNo: string,
  leadName: string,
  location: string
) {
  try {
    // Only send for thessaloniki or milan location (same phone number)
    const normalizedLocation = location?.toLowerCase().trim();
    if (normalizedLocation !== "thessaloniki" && normalizedLocation !== "milan") {
      console.log(`⏭️ Skipping WhatsApp template - location is not thessaloniki or milan (got: ${location})`);
      return;
    }

    const whatsappToken = getWhatsAppToken();
    // Get phone ID for thessaloniki or milan (same number)
    const phoneConfig = WHATSAPP_PHONE_CONFIGS.find(config => {
      const configAreas = Array.isArray(config.area) ? config.area : [config.area];
      return configAreas.includes("thessaloniki") || configAreas.includes("milan");
    });
    const phoneNumberId = phoneConfig?.phoneNumberId || getDefaultPhoneId("SuperAdmin", [normalizedLocation]);

    if (!whatsappToken || !phoneNumberId) {
      console.error("❌ WhatsApp not configured - missing token or phone ID");
      return;
    }

    // Format phone number (remove spaces, dashes, and ensure no leading +)
    let formattedPhone = phoneNo.replace(/[\s\-]/g, "");
    if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }

    console.log(`📱 Sending guest_greeting template to ${formattedPhone} for lead: ${leadName} in ${location}`);

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
          type: "template",
          template: {
            name: "guest_greeting",
            language: {
              code: "en",
            },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: leadName }, // {{1}} = leadName
                  { type: "text", text: location }   // {{2}} = location
                ]
              }
            ]
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ WhatsApp Template API Error:", data);
      return;
    }

    const whatsappMessageId = data.messages?.[0]?.id;
    console.log(`✅ guest_greeting template sent successfully to ${formattedPhone}:`, whatsappMessageId);

    // Save message to database and emit socket event for frontend display
    if (whatsappMessageId) {
      const timestamp = new Date();
      const templateText = `Hello ${leadName},\nMy team informed me that you are looking for an apartment for rent in ${location}.\nPlease let me know if you'd like help with available options.`;

      // Get or create conversation using snapshot-safe helper
      // Lead auto-message is a "trusted" source - can set snapshot fields including location
      const isNewConversation = !(await WhatsAppConversation.findOne({
        participantPhone: formattedPhone,
        businessPhoneId: phoneNumberId,
      }));

      const conversation = await findOrCreateConversationWithSnapshot({
        participantPhone: formattedPhone,
        businessPhoneId: phoneNumberId,
        participantName: leadName || formattedPhone,
        participantLocation: location, // Capture location at conversation creation
        participantRole: "guest", // Lead auto-message creates guest conversations
        snapshotSource: "trusted",
      }) as any; // Cast to any to access Mongoose document properties like _id

      // Emit new conversation event if this was a new conversation
      if (isNewConversation) {
        emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_CONVERSATION, {
          conversation: {
            id: conversation._id,
            participantPhone: formattedPhone,
            participantName: leadName || formattedPhone,
            unreadCount: 0,
            lastMessageTime: timestamp,
            businessPhoneId: phoneNumberId,
          },
        });
      }

      const contentObj = { text: templateText };

      // Save message to database
      const savedMessage = await WhatsAppMessage.create({
        conversationId: conversation._id,
        messageId: whatsappMessageId,
        businessPhoneId: phoneNumberId,
        from: phoneNumberId,
        to: formattedPhone,
        type: "template",
        content: contentObj,
        templateName: "guest_greeting",
        templateLanguage: "en",
        source: "meta", // Explicitly set source for Meta API messages
        status: "sent",
        statusEvents: [{ status: "sent", timestamp }],
        direction: "outgoing",
        timestamp,
        conversationSnapshot: {
          participantPhone: formattedPhone,
          assignedAgent: conversation.assignedAgent,
        },
      });

      // Update conversation last message
      await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
        lastMessageId: whatsappMessageId,
        lastMessageContent: templateText.substring(0, 100),
        lastMessageTime: timestamp,
        lastMessageDirection: "outgoing",
        lastOutgoingMessageTime: timestamp,
      });

      // Emit socket event for real-time frontend updates
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
          senderName: "System (Auto)",
        },
      });

      console.log(`✅ Message saved to DB and emitted to frontend`);
    }
  } catch (error) {
    console.error("❌ Error sending WhatsApp template:", error);
  }
}

export async function POST(req: NextRequest) {
  const token = await getDataFromToken(req);
  try {
    const {
      date,
      name,
      email,
      phoneNo,
      duration,
      startDate,
      endDate,
      area,
      guest,
      minBudget,
      maxBudget,
      noOfBeds,
      location,
      bookingTerm,
      zone,
      metroZone,
      billStatus,
      typeOfProperty,
      propertyType,
      priority,
      BoostID,
      idName,
      leadQualityByCreator,
    } = await req.json();

    // ✅ Check for duplicates (within same area, less than 30 days old)
    const existingQuery = await Query.findOne({ phoneNo });
    if (existingQuery) {
      const today = new Date();
      const daysSinceCreation = Math.floor(
        (today.getTime() - existingQuery.createdAt.getTime()) /
          (24 * 60 * 60 * 1000)
      );

      if (daysSinceCreation < 30 && existingQuery.area === area) {
        return NextResponse.json(
          { error: "Phone number already exists in this area" },
          { status: 400 }
        );
      }
    }

    // ✅ Create new lead
    const newQuery = await Query.create({
      name,
      email,
      date,
      startDate: format(startDate, "MM/dd/yyyy"),
      endDate: format(endDate, "MM/dd/yyyy"),
      phoneNo,
      duration,
      area,
      guest,
      minBudget,
      maxBudget,
      noOfBeds,
      location: location.toLowerCase(),
      bookingTerm,
      zone,
      metroZone,
      billStatus,
      typeOfProperty,
      propertyType,
      priority,
      BoostID,
      leadQualityByCreator,
      idName,
      createdBy: token.email,
      leadStatus: "fresh",
    });

    // ✅ SOCKET.IO REAL-TIME EMIT
    const io = (global as any).io;
    if (io) {
      const areaSlug =
        newQuery.location?.trim().toLowerCase().replace(/\s+/g, "-") || "all";
      const disposition =
        newQuery.leadStatus?.trim().toLowerCase().replace(/\s+/g, "-") ||
        "fresh";

      const areaRoom = `area-${areaSlug}|disposition-${disposition}`;
      const globalRoom = `area-all|disposition-${disposition}`;
      const event = `lead-${disposition}`;

      // 🎯 Emit to both area-specific and global listeners
      io.to(areaRoom).emit(event, newQuery);
      io.to(globalRoom).emit(event, newQuery);

      console.log(`✅ Emitted ${event} → ${areaRoom} & ${globalRoom}`);
    } else {
      console.warn("⚠️ Socket.IO instance not found!");
    }

    // ✅ Send WhatsApp guest_greeting template to lead (Thessaloniki only)
    // Only send when lead is created by test_email: abhaytripathi6969@gmail.com
    // This runs asynchronously - don't await to avoid blocking the response
    if (token.email === "abhaytripathi6969@gmail.com") {
      sendGuestGreetingTemplate(phoneNo, name, location).catch((err) => {
        console.error("❌ Failed to send WhatsApp template:", err);
      });
    } else {
      console.log(`⏭️ Skipping WhatsApp template - lead created by ${token.email} (only sent for abhaytripathi6969@gmail.com)`);
    }

    // ✅ Return success
    return NextResponse.json(
      { success: true, data: newQuery },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Error creating lead:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
  