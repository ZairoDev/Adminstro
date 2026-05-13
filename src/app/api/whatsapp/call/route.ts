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
import { z } from "zod";
import { collectMetaGraphErrorText } from "@/lib/whatsapp/metaGraphError";
import { recordCallStarted, updateCallFromMetaStatus } from "@/services/whatsapp-calling/callHistoryService";

connectDb();

/**
 * WhatsApp Calling API
 * 
 * Implements the official Cloud API Calling "User call permissions" feature:
 * - Send a free-form interactive `call_permission_request`
 * - Query current call permission state via `/{PHONE_NUMBER_ID}/call_permissions?user_wa_id=...`
 */

const postSchema = z.object({
  to: z.coerce.string().optional(),
  conversationId: z.coerce.string().optional(),
  phoneNumberId: z.coerce.string().optional(),
  action: z
    .enum([
      "permission_request",
      "start_call",
      "terminate_call",
      "notify",
      "answer_incoming_call",
      "reject_incoming_call",
    ])
    .default("permission_request"),
  bodyText: z.string().max(1024).optional(),
  session: z
    .object({
      sdpType: z.enum(["offer", "answer"]).default("offer"),
      sdp: z.string().min(1),
    })
    .optional(),
  callId: z.coerce.string().optional(),
  bizOpaqueCallbackData: z.coerce.string().max(512).optional(),
});

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

    const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      console.error("[whatsapp/call] Invalid payload", parsed.error.flatten());
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const { action, bodyText } = parsed.data;

    const userRole = token.role || "";
    const userAreas = Array.isArray(token.allotedArea) ? token.allotedArea : token.allotedArea ? [token.allotedArea] : [];
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    /** Customer-initiated call: reject or answer (pre_accept + accept) on Graph `POST /calls`. */
    if (action === "answer_incoming_call" || action === "reject_incoming_call") {
      const callId = parsed.data.callId?.trim();
      const phoneNumberId = parsed.data.phoneNumberId?.trim();
      if (!callId) {
        return NextResponse.json({ error: "callId is required" }, { status: 400 });
      }
      if (!phoneNumberId || !canAccessPhoneId(phoneNumberId, userRole, userAreas)) {
        return NextResponse.json(
          { error: "Invalid or missing phoneNumberId for this account" },
          { status: 403 },
        );
      }

      const convIdOpt = parsed.data.conversationId;
      if (convIdOpt) {
        const conversation = (await WhatsAppConversation.findById(convIdOpt).lean()) as {
          businessPhoneId?: string;
        } | null;
        if (!conversation) {
          return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }
        if (String(conversation.businessPhoneId) !== String(phoneNumberId)) {
          return NextResponse.json(
            { error: "conversationId does not match phoneNumberId" },
            { status: 400 },
          );
        }
      }

      const whatsappTokenIncoming = getWhatsAppToken();
      if (!whatsappTokenIncoming) {
        return NextResponse.json({ error: "WhatsApp configuration missing" }, { status: 500 });
      }

      const graphHeadersIncoming = {
        Authorization: `Bearer ${whatsappTokenIncoming}`,
        "Content-Type": "application/json",
      } as const;

      if (action === "reject_incoming_call") {
        const response = await fetch(`${WHATSAPP_API_BASE_URL}/${phoneNumberId}/calls`, {
          method: "POST",
          headers: graphHeadersIncoming,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            call_id: callId,
            action: "reject",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const combined =
            collectMetaGraphErrorText(data) ||
            (typeof (data as { error?: { message?: string } }).error?.message === "string"
              ? (data as { error: { message: string } }).error.message
              : "") ||
            "Failed to reject call";
          return NextResponse.json({ error: combined, data }, { status: response.status });
        }
        try {
          await updateCallFromMetaStatus({ callId, metaStatus: "rejected" });
        } catch (e) {
          console.warn("[whatsapp/call] reject call history:", e);
        }
        return NextResponse.json({ success: true, type: "incoming_call_rejected" });
      }

      const sessionSdp = parsed.data.session;
      if (!sessionSdp?.sdp?.trim() || sessionSdp.sdpType !== "answer") {
        return NextResponse.json(
          { error: "session with sdpType answer and sdp is required to answer an incoming call" },
          { status: 400 },
        );
      }

      const sdpBody = sessionSdp.sdp.includes("\r\n")
        ? sessionSdp.sdp
        : sessionSdp.sdp.replace(/\n/g, "\r\n");

      const sessionPayload = {
        sdp_type: sessionSdp.sdpType,
        sdp: sdpBody,
      };

      /**
       * Meta documents pre_accept + accept with the same SDP; some WABA builds reject
       * pre_accept while accept succeeds. We try pre_accept first, then always send accept.
       */
      const preResponse = await fetch(`${WHATSAPP_API_BASE_URL}/${phoneNumberId}/calls`, {
        method: "POST",
        headers: graphHeadersIncoming,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          call_id: callId,
          action: "pre_accept",
          session: sessionPayload,
        }),
      });
      const preData = await preResponse.json().catch(() => ({}));
      if (!preResponse.ok) {
        console.warn("[whatsapp/call] answer_incoming pre_accept non-OK (continuing to accept)", {
          httpStatus: preResponse.status,
          graph: preData,
        });
      }

      const accResponse = await fetch(`${WHATSAPP_API_BASE_URL}/${phoneNumberId}/calls`, {
        method: "POST",
        headers: graphHeadersIncoming,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          call_id: callId,
          action: "accept",
          session: sessionPayload,
        }),
      });
      const accData = await accResponse.json().catch(() => ({}));
      if (!accResponse.ok) {
        const combined =
          collectMetaGraphErrorText(accData) ||
          (typeof (accData as { error?: { message?: string } }).error?.message === "string"
            ? (accData as { error: { message: string } }).error.message
            : "") ||
          "accept failed";
        console.error("[whatsapp/call] answer_incoming accept failed", {
          httpStatus: accResponse.status,
          graph: accData,
          sdpLen: sdpBody.length,
        });
        return NextResponse.json({ error: combined, data: accData }, { status: accResponse.status });
      }

      try {
        await updateCallFromMetaStatus({ callId, metaStatus: "accepted" });
      } catch (e) {
        console.warn("[whatsapp/call] accept call history:", e);
      }

      return NextResponse.json({
        success: true,
        type: "incoming_call_answered",
        data: accData,
      });
    }

    const { to, conversationId, phoneNumberId: requestedPhoneId } = parsed.data;

    if (!to && !conversationId) {
      return NextResponse.json({ error: "Recipient phone number or conversation ID is required" }, { status: 400 });
    }

    // Determine phone ID and recipient
    let phoneNumberId = requestedPhoneId;
    let recipientPhone = to;
    let resolvedConversation: {
      participantPhone?: string;
      businessPhoneId?: string;
      participantName?: string;
    } | null = null;

    if (conversationId) {
      const conversation = await WhatsAppConversation.findById(conversationId).lean() as {
        participantPhone?: string;
        businessPhoneId?: string;
        participantName?: string;
      } | null;
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      resolvedConversation = conversation;
      phoneNumberId = phoneNumberId || conversation.businessPhoneId;
      recipientPhone = recipientPhone || conversation.participantPhone;
    }

    if (!recipientPhone) {
      return NextResponse.json({ error: "Recipient phone is required" }, { status: 400 });
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
    const formattedPhone = recipientPhone.replace(/\D/g, "");
    if (!/^[1-9][0-9]{6,14}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: "Phone number must be in E.164 digits (7-15 digits, no leading zero)." },
        { status: 400 },
      );
    }

    // Send a call permission request interactive message (official)
    if (action === "permission_request") {
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
              type: "call_permission_request",
              action: { name: "call_permission_request" },
              ...(bodyText
                ? {
                    body: {
                      text: bodyText,
                    },
                  }
                : {}),
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("WhatsApp Call Request Error:", data);
        const combined =
          collectMetaGraphErrorText(data) ||
          (typeof data?.error?.message === "string" ? data.error.message : "") ||
          "Failed to send call request";
        return NextResponse.json({ error: combined, data }, { status: response.status });
      }

      return NextResponse.json({
        success: true,
        type: "call_permission_request_sent",
        messageId: data.messages?.[0]?.id,
        to: formattedPhone,
        phoneNumberId,
        message: `Call permission request sent to ${formattedPhone}.`,
      });
    }

    // Start a business-initiated call via Calls API (official)
    // POST /{PHONE_NUMBER_ID}/calls
    if (action === "start_call") {
      if (!parsed.data.session?.sdp) {
        return NextResponse.json({ error: "session.sdp is required to start a call" }, { status: 400 });
      }

      // Log the first 1 200 chars of the SDP so we can debug validation errors.
      console.log("[whatsapp/call] start_call SDP preview:", parsed.data.session.sdp.slice(0, 1200));

      const response = await fetch(`${WHATSAPP_API_BASE_URL}/${phoneNumberId}/calls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          action: "connect",
          session: {
            sdp_type: parsed.data.session.sdpType,
            sdp: parsed.data.session.sdp,
          },
          ...(parsed.data.bizOpaqueCallbackData
            ? { biz_opaque_callback_data: parsed.data.bizOpaqueCallbackData }
            : conversationId
              ? { biz_opaque_callback_data: String(conversationId) }
              : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const graphMsg =
          typeof (data as { error?: { message?: string } })?.error?.message === "string"
            ? (data as { error: { message: string } }).error.message
            : "";
        const combined = collectMetaGraphErrorText(data) || graphMsg;
        const fbHeaders = {
          xFbRev: response.headers.get("x-fb-rev") ?? undefined,
          xFbTraceId: response.headers.get("x-fb-trace-id") ?? undefined,
          xFbDebug: response.headers.get("x-fb-debug") ?? undefined,
        };
        console.error("[whatsapp/call] Meta POST /calls failed", {
          httpStatus: response.status,
          phoneNumberId,
          toLen: formattedPhone.length,
          clientMessage: combined || undefined,
          graph: data,
          fbHeaders,
        });
        return NextResponse.json(
          { error: combined || "Failed to start call", data },
          { status: response.status },
        );
      }

      const startedCallId = (data as { calls?: { id?: string }[] })?.calls?.[0]?.id;
      if (startedCallId) {
        try {
          await recordCallStarted({
            callId: startedCallId,
            ...(conversationId ? { conversationId: String(conversationId) } : {}),
            businessPhoneId: String(phoneNumberId),
            participantPhone: formattedPhone,
            participantName: resolvedConversation?.participantName,
          });
        } catch (logErr) {
          console.warn("[whatsapp/call] call history recordCallStarted:", logErr);
        }
      }

      return NextResponse.json({
        success: true,
        type: "call_started",
        callId: startedCallId,
        data,
      });
    }

    // Terminate a call via Calls API (official)
    if (action === "terminate_call") {
      const callId = parsed.data.callId;
      if (!callId) return NextResponse.json({ error: "callId is required" }, { status: 400 });
      const response = await fetch(`${WHATSAPP_API_BASE_URL}/${phoneNumberId}/calls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          call_id: callId,
          action: "terminate",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const combined =
          collectMetaGraphErrorText(data) ||
          (typeof (data as { error?: { message?: string } }).error?.message === "string"
            ? (data as { error: { message: string } }).error.message
            : "") ||
          "Failed to terminate call";
        return NextResponse.json({ error: combined, data }, { status: response.status });
      }
      try {
        await updateCallFromMetaStatus({ callId, metaStatus: "terminated" });
      } catch (e) {
        console.warn("[whatsapp/call] call history terminate:", e);
      }
      return NextResponse.json({ success: true, type: "call_terminated" });
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
              body: `📞 You missed a call from our team. Would you like us to call you back? Reply with "Yes" and we'll reach out!`,
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
        to: formattedPhone,
        phoneNumberId,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use 'permission_request', 'start_call', 'terminate_call', 'notify', 'answer_incoming_call', or 'reject_incoming_call'",
      },
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
    let token: any;
    try {
      token = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
    }

    const { searchParams } = new URL(req.url);
    const phoneNumberId = searchParams.get("phoneNumberId") || "";
    const userWaId = searchParams.get("userWaId") || "";

    const userRole = token.role || "";
    const userAreas = Array.isArray(token.allotedArea) ? token.allotedArea : token.allotedArea ? [token.allotedArea] : [];
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

    // Optional: query Meta for a specific conversation/user permission state
    if (phoneNumberId && userWaId) {
      if (!canAccessPhoneId(phoneNumberId, userRole, userAreas)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const whatsappToken = getWhatsAppToken();
      if (!whatsappToken) return NextResponse.json({ error: "WhatsApp configuration missing" }, { status: 500 });

      const url = new URL(`${WHATSAPP_API_BASE_URL}/${phoneNumberId}/call_permissions`);
      url.searchParams.set("user_wa_id", userWaId.replace(/\D/g, ""));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const combined =
          collectMetaGraphErrorText(data) ||
          (typeof (data as { error?: { message?: string } }).error?.message === "string"
            ? (data as { error: { message: string } }).error.message
            : "") ||
          "Failed to fetch call permissions";
        return NextResponse.json({ error: combined, data }, { status: res.status });
      }

      return NextResponse.json({ success: true, canMakeCalls, data });
    }

    return NextResponse.json({
      success: true,
      canMakeCalls,
      canMakeVideoCalls: canMakeCalls, // Same permission for now
      allowedPhoneIds,
      userRole,
      userAreas,
      note: "Calling permissions supported via official Cloud API call_permission_request + call_permissions endpoints. Actual voice call setup requires Calling API flow (SIP/WebRTC) not implemented here.",
    });
  } catch (error: any) {
    console.error("Check call permissions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
