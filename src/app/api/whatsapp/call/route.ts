import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import {
  canAccessPhoneId,
  getAllowedPhoneIds,
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
} from "@/lib/whatsapp/config";

connectDb();

/**
 * WhatsApp Calling API
 * 
 * NOTE: WhatsApp Cloud API currently has LIMITED support for voice/video calls.
 * As of API v19.0:
 * - Outbound calls are NOT supported via Cloud API
 * - Incoming calls can be received via webhook (phone_number_change field)
 * - Call notifications can be sent via templates
 * 
 * This endpoint provides:
 * 1. A way to send "click-to-call" interactive messages
 * 2. Future-ready structure for when WhatsApp enables outbound calls
 * 3. Permission checks for call access
 * 
 * For real 1-on-1 calling, you would need:
 * - WhatsApp Business API On-Premises (not Cloud API)
 * - Or integration with a third-party calling solution (Twilio, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      to,
      conversationId,
      phoneNumberId: requestedPhoneId,
      callType = "audio", // "audio" | "video"
      action = "request", // "request" | "notify"
    } = body;

    if (!to && !conversationId) {
      return NextResponse.json(
        { error: "Recipient phone number or conversation ID is required" },
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

    // Determine phone ID and recipient
    let phoneNumberId = requestedPhoneId;
    let recipientPhone = to;

    if (conversationId) {
      const conversation = await WhatsAppConversation.findById(conversationId).lean() as any;
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      phoneNumberId = phoneNumberId || conversation.businessPhoneId;
      recipientPhone = recipientPhone || conversation.participantPhone;
    }

    if (!phoneNumberId || !canAccessPhoneId(phoneNumberId, userRole, userAreas)) {
      return NextResponse.json(
        { error: "You don't have permission to call from this WhatsApp number" },
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
    const formattedPhone = recipientPhone.replace(/[\s\-\+]/g, "");

    // Since direct outbound calls aren't supported yet,
    // we send an interactive message with a call-to-action
    if (action === "request") {
      // Send an interactive message asking the user to call back
      const callTypeText = callType === "video" ? "video call" : "call";
      
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
            interactive: {
              type: "cta_url",
              body: {
                text: `Our team would like to have a ${callTypeText} with you. Please click the button below when you're ready to connect.`,
              },
              action: {
                name: "cta_url",
                parameters: {
                  display_text: `Start ${callType === "video" ? "Video " : ""}Call`,
                  // This URL should point to your video calling solution
                  // For example: Zoom, Google Meet, or your own WebRTC implementation
                  url: `${process.env.NEXT_PUBLIC_URL || "https://adminstro.in"}/call/${conversationId}?type=${callType}`,
                },
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("WhatsApp Call Request Error:", data);
        return NextResponse.json(
          { error: data.error?.message || "Failed to send call request" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        type: "call_request_sent",
        messageId: data.messages?.[0]?.id,
        callType,
        to: formattedPhone,
        phoneNumberId,
        message: `Call request sent to ${formattedPhone}. They will receive a link to join the ${callTypeText}.`,
      });
    }

    // Notify action - send a template message about missed call
    if (action === "notify") {
      // Send a notification about a call attempt
      // You would need to create this template in Meta Business Suite first
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
            to: formattedPhone,
            type: "text",
            text: {
              body: `📞 You missed a ${callType === "video" ? "video " : ""}call from our team. Would you like us to call you back? Reply with "Yes" and we'll reach out!`,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("WhatsApp Call Notify Error:", data);
        return NextResponse.json(
          { error: data.error?.message || "Failed to send call notification" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        type: "call_notification_sent",
        messageId: data.messages?.[0]?.id,
        callType,
        to: formattedPhone,
        phoneNumberId,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'request' or 'notify'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Call API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if user has call permissions
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    // Roles that can make calls
    const callEnabledRoles = [
      "SuperAdmin",
      "Admin",
      "Sales",
      "Sales-TeamLead",
      "LeadGen",
      "LeadGen-TeamLead",
      "Developer",
    ];

    const canMakeCalls = callEnabledRoles.includes(userRole) && allowedPhoneIds.length > 0;

    return NextResponse.json({
      success: true,
      canMakeCalls,
      canMakeVideoCalls: canMakeCalls, // Same permission for now
      allowedPhoneIds,
      userRole,
      userAreas,
      // Note about API limitations
      note: "WhatsApp Cloud API does not support direct outbound calls. Call requests are sent as interactive messages with call-to-action links.",
    });
  } catch (error: any) {
    console.error("Check call permissions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
