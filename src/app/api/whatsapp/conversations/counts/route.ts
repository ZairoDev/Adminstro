import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { getAllowedPhoneIds } from "@/lib/whatsapp/config";

connectDb();

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

    // Get user's allowed phone IDs based on role and area
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "active";

    // Build base query - filter by allowed phone IDs
    const baseQuery: any = {
      status,
      businessPhoneId: { $in: allowedPhoneIds },
    };

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

