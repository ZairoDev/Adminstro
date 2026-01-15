import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import ConversationReadState from "@/models/conversationReadState";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { emitWhatsAppEvent } from "@/lib/pusher";

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
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (token as any).id || (token as any)._id;
    
    if (!userId) {
      console.error("❌ [MARK READ] No userId found in token");
      return NextResponse.json(
        { error: "User ID not found in token" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { conversationId } = body;

    if (!conversationId) {
      console.error("❌ [MARK READ] conversationId is required");
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }
    
    console.log(`👁️ [MARK READ] Request received: userId=${userId}, conversationId=${conversationId}`);

    // Verify conversation exists
    const conversation = await WhatsAppConversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get the latest message in this conversation to mark as read
    const latestMessage = await WhatsAppMessage.findOne({
      conversationId: conversation._id,
      direction: "incoming",
    })
      .sort({ timestamp: -1 })
      .lean() as any;

    const lastReadMessageId = latestMessage?.messageId || conversation.lastMessageId || "";
    const lastReadAt = new Date();

    console.log(`👁️ [MARK READ] Attempting to mark conversation ${conversationId} as read for user ${userId}`);
    console.log(`👁️ [MARK READ] Latest message ID: ${lastReadMessageId}, lastReadAt: ${lastReadAt}`);

    // Upsert read state for this user and conversation
    const readState = await ConversationReadState.findOneAndUpdate(
      {
        conversationId: conversation._id,
        userId: userId,
      },
      {
        conversationId: conversation._id,
        userId: userId,
        lastReadMessageId: lastReadMessageId,
        lastReadAt: lastReadAt,
      },
      {
        upsert: true,
        new: true,
      }
    );

    if (readState) {
      console.log(`✅ [MARK READ] Successfully updated ConversationReadState:`, {
        conversationId: readState.conversationId?.toString(),
        userId: readState.userId?.toString(),
        lastReadMessageId: readState.lastReadMessageId,
        lastReadAt: readState.lastReadAt,
      });
    } else {
      console.error(`❌ [MARK READ] Failed to create/update ConversationReadState`);
    }

    // Emit conversation-read event via Pusher (existing real-time pipeline)
    emitWhatsAppEvent("whatsapp-conversation-read", {
      conversationId: conversation._id.toString(),
      userId: userId,
      lastReadMessageId: lastReadMessageId,
      lastReadAt: lastReadAt,
    });

    // Also broadcast via Socket.IO (if available) so all viewers update instantly
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`conversation-${conversation._id.toString()}`).emit("whatsapp-conversation-read", {
          conversationId: conversation._id.toString(),
          userId,
          lastReadMessageId,
          lastReadAt,
        });
      }
    } catch (socketError) {
      console.error("⚠️ [MARK READ] Failed to emit Socket.IO conversation-read event:", socketError);
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation._id.toString(),
      lastReadMessageId: lastReadMessageId,
      lastReadAt: lastReadAt,
    });
  } catch (error: any) {
    console.error("❌ [ERROR] Error marking conversation as read:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
