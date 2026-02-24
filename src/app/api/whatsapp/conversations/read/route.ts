import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import ConversationReadState from "@/models/conversationReadState";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { emitWhatsAppEvent } from "@/lib/pusher";
import { canAccessConversation } from "@/lib/whatsapp/access";

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
    


    // Verify conversation exists
    const conversation = await WhatsAppConversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Enforce access rules
    const allowed = await canAccessConversation(token, conversation.toObject ? conversation.toObject() : conversation);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    } else {
      console.error(`❌ [MARK READ] Failed to create/update ConversationReadState`);
    }

    emitWhatsAppEvent("whatsapp-conversation-read", {
      conversationId: conversation._id.toString(),
      userId: userId,
      lastReadMessageId: lastReadMessageId,
      lastReadAt: lastReadAt,
    });

    try {
      const io = (global as any).io;
      if (io) {
        io.to(`conversation-${conversation._id.toString()}`).emit("whatsapp-conversation-read", {
          conversationId: conversation._id.toString(),
          userId,
          lastReadMessageId,
          lastReadAt,
        });
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
