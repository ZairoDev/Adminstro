import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { buildInboxListQuery, parseInboxListParams } from "@/lib/whatsapp/inboxQuery";
import { normalizeWhatsAppToken, resolveAllowedPhoneIdsAsync } from "@/lib/whatsapp/apiContext";

connectDb();

// Force dynamic rendering (uses request.cookies)
export const dynamic = 'force-dynamic';

// Get database-driven conversation counts
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const normalizedToken = normalizeWhatsAppToken(token);
    const allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken, {
      retargetOnly:
        req.nextUrl.searchParams.get("retargetOnly") === "1" ||
        req.nextUrl.searchParams.get("retargetOnly") === "true",
    });

    if (allowedPhoneIds.length === 0 && normalizedToken.role !== "Advert") {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    const inboxParams = parseInboxListParams(req.nextUrl.searchParams);
    const baseQuery = buildInboxListQuery(normalizedToken, inboxParams);
    if (baseQuery._id === null) {
      return NextResponse.json({
        success: true,
        totalCount: 0,
        ownerCount: 0,
        guestCount: 0,
      });
    }

    // Get total count
    const totalCount = await WhatsAppConversation.countDocuments(baseQuery);

    // Get owner count
    const ownerCount = await WhatsAppConversation.countDocuments({
      ...baseQuery,
      conversationType: "owner",
    });

    // Get guest count
    const guestCount = await WhatsAppConversation.countDocuments({
      ...baseQuery,
      conversationType: "guest",
    });

    return NextResponse.json({
      success: true,
      totalCount,
      ownerCount,
      guestCount,
    });
  } catch (error: any) {
    console.error("Get conversation counts error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

