import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { getUserAreasFromToken } from "@/lib/whatsapp/locationAccess";
import {
  canUserAccessPhoneId,
  resolveUserAllowedPhoneIds,
} from "@/lib/whatsapp/phoneAreaConfigService";

export const dynamic = "force-dynamic";
connectDb();

/**
 * Open a conversation by phone number.
 *
 * Bug 1 fix: if the client passes `phoneNumberId` (the currently-active
 * WhatsApp account in their inbox), we scope the lookup to that account.
 * This guarantees that opening a number from the Thessaloniki inbox never
 * returns (or creates) an Athens conversation, and vice versa.
 *
 * If no phoneNumberId is provided we fall back to searching only within the
 * user's allowed accounts, picking the most recently active one. We NEVER
 * return a conversation that belongs to an account the user cannot access.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const { phone, phoneNumberId } = body || {};
    if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

    const normalizedPhone = String(phone).replace(/\D/g, "");
    if (!normalizedPhone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const userRole = token.role || "";
    const userAreas = getUserAreasFromToken(token);

    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);
    const allowedPhoneIds = await resolveUserAllowedPhoneIds(userRole, userAreas);

    // Build an account-scoped query.
    const query: Record<string, unknown> = { participantPhone: normalizedPhone };

    if (phoneNumberId) {
      if (
        !isFullAccess &&
        !(await canUserAccessPhoneId(phoneNumberId, userRole, userAreas))
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      query.businessPhoneId = phoneNumberId;
    } else if (!isFullAccess) {
      if (allowedPhoneIds.length === 0) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      query.businessPhoneId = { $in: allowedPhoneIds };
    }

    // Prefer the most recently active conversation for this phone within
    // the allowed scope. This avoids returning a stale thread from the
    // wrong account when multiple accounts share the same number.
    const conv = await WhatsAppConversation.findOne(query)
      .sort({ lastMessageTime: -1, updatedAt: -1 })
      .lean();
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const allowed = await canAccessConversationAsync(token, conv as Record<string, unknown>);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ success: true, conversation: conv });
  } catch (error: any) {
    console.error("Open conversation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

