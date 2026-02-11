import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { getAllowedPhoneIds, getRetargetPhoneId } from "@/lib/whatsapp/config";

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

    // Get user's allowed phone IDs based on role and area
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    let allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    // Advert role: grant access to retarget phone for counts
    if (allowedPhoneIds.length === 0 && userRole === "Advert") {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        allowedPhoneIds = [retargetPhoneId];
      }
    }

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "active";
    const retargetOnly = searchParams.get("retargetOnly") === "1" || searchParams.get("retargetOnly") === "true";

    // Build base query - filter by allowed phone IDs
    const baseQuery: any = {
      status,
      businessPhoneId: { $in: allowedPhoneIds },
    };

    // Retarget-only mode: filter to retarget conversations only
    if (retargetOnly) {
      baseQuery.isRetarget = true;
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

