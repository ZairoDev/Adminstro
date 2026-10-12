import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import ConversationReadState from "@/models/conversationReadState";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { emitWhatsAppEvent } from "@/lib/pusher";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import { loadConversationReaders } from "@/lib/whatsapp/conversationReaders";

connectDb();

/**
 * POST /api/whatsapp/conversations/read
 * Mark a conversation as read for the current user
 *
 * Body:
 * - conversationId: string (required)
 */
export async function POST(req: NextRequest) {
  try {
    let token: WhatsAppToken | null;
    try {
      token = (await getDataFromToken(req)) as WhatsAppToken;
    } catch (err: unknown) {
      const authErr = err as { status?: number; code?: string };
      const status = authErr?.status ?? 401;
      const code = authErr?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
    }

    const userId = token.id || token._id;

    if (!userId) {
      console.error("❌ [MARK READ] No userId found in token");
      return NextResponse.json(
        { error: "User ID not found in token" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { conversationId } = body as { conversationId?: string };

    if (!conversationId) {
      console.error("❌ [MARK READ] conversationId is required");
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const conversation = await WhatsAppConversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const allowed = await canAccessConversationAsync(
      normalizeWhatsAppToken(token),
      conversation.toObject ? conversation.toObject() : conversation,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const latestMessage = (await WhatsAppMessage.findOne({
      conversationId: conversation._id,
      direction: "incoming",
    })
      .sort({ timestamp: -1 })
      .lean()) as { messageId?: string } | null;

    const lastReadMessageId =
      latestMessage?.messageId || conversation.lastMessageId || "";
    const lastReadAt = new Date();

    const existingReadState = (await ConversationReadState.findOne({
      conversationId: conversation._id,
      userId,
    })
      .select("lastReadMessageId lastReadAt")
      .lean()) as { lastReadMessageId?: string; lastReadAt?: Date } | null;

    const readers = await loadConversationReaders(conversation._id);

    if (
      existingReadState?.lastReadMessageId &&
      existingReadState.lastReadMessageId === lastReadMessageId
    ) {
      return NextResponse.json({
        success: true,
        skipped: true,
        conversationId: conversation._id.toString(),
        lastReadMessageId: existingReadState.lastReadMessageId,
        lastReadAt: existingReadState.lastReadAt,
        readers,
      });
    }

    const readState = await ConversationReadState.findOneAndUpdate(
      {
        conversationId: conversation._id,
        userId,
      },
      {
        conversationId: conversation._id,
        userId,
        lastReadMessageId,
        lastReadAt,
      },
      {
        upsert: true,
        new: true,
      },
    );

    if (!readState) {
      console.error(`❌ [MARK READ] Failed to create/update ConversationReadState`);
    }

    const readersAfterWrite = await loadConversationReaders(conversation._id);

    emitWhatsAppEvent("whatsapp-conversation-read", {
      conversationId: conversation._id.toString(),
      userId,
      lastReadMessageId,
      lastReadAt,
    });

    try {
      const io = (global as { io?: { to: (room: string) => { emit: (event: string, data: unknown) => void } } }).io;
      if (io) {
        io.to(`conversation-${conversation._id.toString()}`).emit(
          "whatsapp-conversation-read",
          {
            conversationId: conversation._id.toString(),
            userId,
            lastReadMessageId,
            lastReadAt,
          },
        );
        io.to(`user-${userId}`).emit("whatsapp-messages-read", {
          conversationId: conversation._id.toString(),
        });
      }
    } catch (socketError) {
      console.error("⚠️ [MARK READ] Failed to emit Socket.IO events:", socketError);
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation._id.toString(),
      lastReadMessageId,
      lastReadAt,
      readers: readersAfterWrite,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("❌ [ERROR] Error marking conversation as read:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
