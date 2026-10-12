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
import { resolveChannelFieldsForConversationLocation } from "@/lib/whatsapp/channelService";
import {
  DEFAULT_CONVERSATION_RENTAL_TYPE,
  resolveConversationRentalType,
} from "@/lib/whatsapp/rentalTypeAccess";

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

function mergeChannelFieldsIntoUpdate(
  update: Record<string, string>,
  channelFields: Awaited<ReturnType<typeof resolveChannelFieldsForConversationLocation>>,
): void {
  if (!channelFields) return;
  update.whatsappChannelId = channelFields.whatsappChannelId;
  update.businessPhoneId = channelFields.businessPhoneId;
  if (channelFields.channelType) {
    update.channelType = channelFields.channelType;
  }
  if (channelFields.rentalType) {
    update.rentalType = channelFields.rentalType;
  }
  if (channelFields.businessPortfolioId) {
    update.businessPortfolioId = channelFields.businessPortfolioId;
  }
  if (channelFields.wabaId) {
    update.wabaId = channelFields.wabaId;
  }
}

async function restampOutboundChannelForConversation(params: {
  update: Record<string, string>;
  conversation: {
    rentalType?: string;
    participantLocation?: string;
    participantLocationKey?: string;
    conversationType?: string;
  };
  conversationType: "owner" | "guest";
  displayLocation: string;
  locationKey: string;
}): Promise<void> {
  const convRental = resolveConversationRentalType(params.conversation.rentalType);
  if (!params.conversation.rentalType?.trim()) {
    params.update.rentalType = DEFAULT_CONVERSATION_RENTAL_TYPE;
  }

  const channelFields = await resolveChannelFieldsForConversationLocation({
    participantLocation: params.displayLocation,
    participantLocationKey: params.locationKey,
    rentalType: convRental,
    conversationType: params.conversationType,
  });
  mergeChannelFieldsIntoUpdate(params.update, channelFields);
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
    const parsedConversationType = parseConversationType(body.conversationType);
    const storedType = (conversation as { conversationType?: string }).conversationType;
    const nextConversationType: "owner" | "guest" =
      parsedConversationType ??
      (storedType === "owner" || storedType === "guest" ? storedType : "guest");

    if (typeof body.participantName === "string") {
      update.participantName = body.participantName;
    }
    if (typeof body.participantProfilePic === "string") {
      update.participantProfilePic = body.participantProfilePic;
    }
    if (typeof body.notes === "string") {
      update.notes = body.notes.trim();
    }

    // Primary field for owner/guest classification
    if (parsedConversationType) {
      update.conversationType = parsedConversationType;
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

      await restampOutboundChannelForConversation({
        update,
        conversation: conversation as {
          rentalType?: string;
          participantLocation?: string;
          participantLocationKey?: string;
          conversationType?: string;
        },
        conversationType: nextConversationType,
        displayLocation,
        locationKey: update.participantLocationKey,
      });
    } else if (parsedConversationType) {
      const existingLocation =
        (conversation as { participantLocation?: string }).participantLocation?.trim() ||
        "";
      const existingLocationKey =
        (conversation as { participantLocationKey?: string }).participantLocationKey?.trim() ||
        (existingLocation ? locationKeyFromDisplay(existingLocation) : "");

      if (existingLocation) {
        await restampOutboundChannelForConversation({
          update,
          conversation: conversation as {
            rentalType?: string;
            participantLocation?: string;
            participantLocationKey?: string;
            conversationType?: string;
          },
          conversationType: parsedConversationType,
          displayLocation: existingLocation,
          locationKey: existingLocationKey,
        });
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await WhatsAppConversation.findByIdAndUpdate(
      conversationId,
      update,
      { new: true }
    ).lean();

    const shouldEmitConversationUpdate =
      Boolean(update.participantLocationKey) ||
      Boolean(update.conversationType) ||
      Boolean(update.businessPhoneId) ||
      Boolean(update.participantName) ||
      Boolean(update.participantProfilePic);

    if (shouldEmitConversationUpdate && updated) {
      try {
        await emitWhatsAppEventToEligibleUsers(
          WHATSAPP_EVENTS.CONVERSATION_UPDATE,
          updated as Record<string, unknown>,
          {
            type: "meta",
            conversationId,
            businessPhoneId: (updated as { businessPhoneId?: string }).businessPhoneId,
            updates: {
              ...(update.participantName
                ? { participantName: update.participantName }
                : {}),
              ...(update.participantProfilePic
                ? { participantProfilePic: update.participantProfilePic }
                : {}),
              ...(update.participantLocation
                ? { participantLocation: update.participantLocation }
                : {}),
              ...(update.participantLocationKey
                ? { participantLocationKey: update.participantLocationKey }
                : {}),
              ...(update.conversationType
                ? { conversationType: update.conversationType }
                : {}),
              ...(update.businessPhoneId
                ? { businessPhoneId: update.businessPhoneId }
                : {}),
              ...(update.whatsappChannelId
                ? { whatsappChannelId: update.whatsappChannelId }
                : {}),
              ...(update.channelType ? { channelType: update.channelType } : {}),
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
