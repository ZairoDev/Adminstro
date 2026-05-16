import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { canAccessConversation } from "@/lib/whatsapp/access";

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

    const allowed = await canAccessConversation(token, conversation as any);
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
    const typeFromBody =
      parseConversationType(body.conversationType) ??
      parseConversationType(body.participantRole); // deprecated alias
    if (typeFromBody) {
      update.conversationType = typeFromBody;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await WhatsAppConversation.findByIdAndUpdate(conversationId, update);

    return NextResponse.json({ success: true, updated: update });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Conversation meta update error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
