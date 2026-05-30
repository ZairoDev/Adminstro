import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import WhatsAppConversation from "@/models/whatsappConversation";
import { canAccessConversation } from "@/lib/whatsapp/access";
import { recordClientTelemetry } from "@/services/whatsapp-calling/callHistoryService";

export const dynamic = "force-dynamic";

connectDb();

const bodySchema = z.object({
  callId: z.string().min(1),
  conversationId: z.string().min(1),
  event: z.enum(["client_ended", "client_connected", "client_failed"]),
  disconnectReason: z.string().max(512).optional(),
  stats: z.record(z.string(), z.unknown()).optional(),
  durationSeconds: z.number().nonnegative().optional(),
  recordChatSummary: z.boolean().optional(),
  chatSummaryVariant: z.enum(["outbound", "inbound"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    let token: unknown;
    try {
      token = await getDataFromToken(req);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const {
      callId,
      conversationId,
      event,
      disconnectReason,
      stats,
      durationSeconds,
      recordChatSummary,
      chatSummaryVariant,
    } = parsed.data;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: "Invalid conversationId" }, { status: 400 });
    }

    const conv = await WhatsAppConversation.findById(conversationId).lean();
    if (!conv || Array.isArray(conv)) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const allowed = canAccessConversation(
      token as { role?: string; allotedArea?: string | string[]; id?: string; _id?: string },
      conv as Record<string, unknown>,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await recordClientTelemetry({
      callId,
      conversationId,
      event,
      disconnectReason,
      stats,
      durationSeconds,
      recordChatSummary,
      chatSummaryVariant,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[whatsapp/calls/telemetry]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
