import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import WhatsAppCallLog from "@/models/whatsappCallLog";
import WhatsAppConversation from "@/models/whatsappConversation";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, resolveAllowedPhoneIdsAsync } from "@/lib/whatsapp/apiContext";

export const dynamic = "force-dynamic";

connectDb();

export async function GET(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as {
      role?: string;
      allotedArea?: string | string[];
    };
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalizedToken = normalizeWhatsAppToken(token);
    const userRole = normalizedToken.role || "";
    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);
    const allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken);
    if (!isFullAccess && allowedPhoneIds.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId") || "";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 40));

    const baseFilter: Record<string, unknown> = isFullAccess
      ? {}
      : { businessPhoneId: { $in: allowedPhoneIds } };

    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return NextResponse.json({ error: "Invalid conversationId" }, { status: 400 });
      }
      const conv = await WhatsAppConversation.findById(conversationId).lean();
      if (!conv || Array.isArray(conv)) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      const allowed = await canAccessConversationAsync(token, conv as Record<string, unknown>);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      baseFilter.conversationId = new mongoose.Types.ObjectId(conversationId);
    }

    const rows = await WhatsAppCallLog.find(baseFilter)
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      calls: rows.map((r) => ({
        id: String(r._id),
        callId: r.callId,
        conversationId: r.conversationId?.toString(),
        businessPhoneId: r.businessPhoneId,
        participantPhone: r.participantPhone,
        participantName: r.participantName,
        direction: r.direction,
        lifecycleStatus: r.lifecycleStatus,
        metaCallStatus: r.metaCallStatus,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        durationSeconds: r.durationSeconds,
        disconnectReason: r.disconnectReason,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[whatsapp/calls/history]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
