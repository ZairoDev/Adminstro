import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import {
  normalizeUserAreas,
  resolveAllowedPhoneConfigs,
} from "@/lib/whatsapp/resolveAllowedPhoneConfigs";

// Force dynamic rendering since we use request.cookies for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/phone-configs
 * 
 * Fetch phone configs independently of conversations.
 * DB channels + legacy env, filtered by user role/area.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = await getDataFromToken(req) as { role?: string; allotedArea?: unknown };
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = token.role || "";
    const userAreas = normalizeUserAreas(token.allotedArea);
    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);

    const allowedPhoneConfigs = await resolveAllowedPhoneConfigs(userRole, userAreas, {
      includeOrphanConversations: isFullAccess,
    });

    return NextResponse.json({
      success: true,
      phoneConfigs: allowedPhoneConfigs,
    });
  } catch (error: any) {
    console.error("Get phone configs error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
