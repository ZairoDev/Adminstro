import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getPhoneConfigById } from "@/lib/whatsapp/config";
import { isWhatsAppRole } from "@/lib/whatsapp/apiContext";
import {
  inferChannelTypeFromConversation,
  resolveWhatsappChannel,
} from "@/lib/whatsapp/channelService";
import { resolveCreateConversationRentalType } from "@/lib/whatsapp/rentalTypeAccess";

export const dynamic = "force-dynamic";

connectDb();

/**
 * GET /api/whatsapp/resolve-phone-for-location?location=Athens
 * Returns the WhatsApp business phoneNumberId for a city (DB first, then config fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (token as { role?: string }).role || "";
    if (!isWhatsAppRole(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const location = req.nextUrl.searchParams.get("location")?.trim();
    if (!location) {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }

    const tokenPayload = token as { role?: string; rentalType?: unknown };
    const requestedRentalType = req.nextUrl.searchParams.get("rentalType");
    const channelTypeParam = req.nextUrl.searchParams.get("channelType") as
      | "guest"
      | "owner"
      | "support"
      | "backup"
      | null;
    const conversationTypeParam = req.nextUrl.searchParams.get("conversationType") as
      | "guest"
      | "owner"
      | null;
    const rentalType = resolveCreateConversationRentalType({
      userRole: tokenPayload.role,
      userRentalType: tokenPayload.rentalType,
      requestedRentalType,
    });

    const channelType = inferChannelTypeFromConversation({
      channelType: channelTypeParam,
      conversationType: conversationTypeParam,
    });

    const channel = await resolveWhatsappChannel({
      location,
      rentalType,
      channelType,
    });
    const phoneNumberId = channel?.phoneNumberId ?? null;

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: `No WhatsApp line configured for ${location} (${rentalType})`,
          hint:
            role === "SuperAdmin"
              ? "Create or enable a WhatsApp Channel for this location + rental type under Other Settings → WhatsApp Channels."
              : "Ask SuperAdmin to configure a channel for this location and rental type.",
        },
        { status: 404 }
      );
    }

    const config = getPhoneConfigById(phoneNumberId);

    return NextResponse.json({
      success: true,
      location,
      rentalType,
      channelType: channel?.channelType ?? null,
      phoneNumberId,
      channelId: channel?.channelId ?? null,
      displayName: channel?.name || config?.displayName || "",
      displayNumber: channel?.displayPhoneNumber || config?.displayNumber || "",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
