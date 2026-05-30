import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { locationKeyFromDisplay } from "@/lib/whatsapp/locationAccess";
import { assertParticipantLocationAssignable } from "@/lib/whatsapp/assignableLocations";
import { canAssignWhatsAppParticipantLocation } from "@/lib/whatsapp/participantLocationPrivileges";
import { WHATSAPP_EVENTS } from "@/lib/pusher";
import { emitWhatsAppEventToEligibleUsers } from "@/lib/whatsapp/emitToEligibleUsers";

export const dynamic = "force-dynamic";

connectDb();

function parseConversationType(value: unknown): "owner" | "guest" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "owner" || normalized === "guest") {
    return normalized;
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation id required" }, { status: 400 });
    }

    const conversation = await WhatsAppConversation.findById(conversationId).lean();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const allowed = await canAccessConversationAsync(
      token,
      conversation as Record<string, unknown>,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const update: Record<string, string> = {};
    if (typeof body.participantName === "string") {
      update.participantName = body.participantName;
    }
    if (typeof body.participantProfilePic === "string") {
      update.participantProfilePic = body.participantProfilePic;
    }

    // Primary field for owner/guest classification
    if (parseConversationType(body.conversationType)) {
      update.conversationType = parseConversationType(body.conversationType)!;
    }

    // participantLocation — owners/guests; city team + admins
    if (typeof body.participantLocation === "string" && body.participantLocation.trim()) {
      if (
        !canAssignWhatsAppParticipantLocation({
          role: token.role,
          email: token.email,
          allotedArea: token.allotedArea,
        })
      ) {
        return NextResponse.json(
          { error: "You do not have permission to assign participant location" },
          { status: 403 }
        );
      }

      const displayLocation = body.participantLocation.trim();

      try {
        await assertParticipantLocationAssignable(
          {
            role: token.role,
            email: token.email,
            allotedArea: token.allotedArea,
          },
          displayLocation
        );
      } catch (err: unknown) {
        const status =
          typeof err === "object" &&
          err !== null &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
            ? (err as { status: number }).status
            : 403;
        const message =
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Location not allowed";
        return NextResponse.json({ error: message }, { status });
      }

      update.participantLocation = displayLocation;
      update.participantLocationKey = locationKeyFromDisplay(displayLocation);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await WhatsAppConversation.findByIdAndUpdate(
      conversationId,
      update,
      { new: true }
    ).lean();

    // Emit socket refresh so the conversation moves out of Admin Queue
    // and appears in the correct city team's inbox immediately
    if (update.participantLocationKey && updated) {
      try {
        await emitWhatsAppEventToEligibleUsers(
          WHATSAPP_EVENTS.CONVERSATION_UPDATE,
          updated as Record<string, unknown>,
          {
            conversationId,
            businessPhoneId: (updated as { businessPhoneId?: string }).businessPhoneId,
            updates: {
              participantLocation: update.participantLocation,
              participantLocationKey: update.participantLocationKey,
            },
          }
        );
      } catch {
        // non-critical
      }
    }

    return NextResponse.json({ success: true, updated: update });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Conversation meta update error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
