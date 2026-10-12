import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import WhatsAppConversation from "@/models/whatsappConversation";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import { loadConversationReaders } from "@/lib/whatsapp/conversationReaders";

connectDb();

/**
 * GET /api/whatsapp/conversations/[conversationId]/readers
 * Get list of users who have read this conversation with their avatars
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const conversation = await WhatsAppConversation.findById(conversationId).lean();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (
      !(await canAccessConversationAsync(
        normalizeWhatsAppToken(token as WhatsAppToken),
        conversation as Record<string, unknown>,
      ))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const readers = await loadConversationReaders(conversationId);

    return NextResponse.json({
      success: true,
      readers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error fetching conversation readers:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
