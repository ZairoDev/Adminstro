import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent } from "@/lib/pusher";

connectDb();

/**
 * POST /api/whatsapp/notifications/clear
 * Clear WhatsApp notifications (UI-only, does NOT affect read state)
 * 
 * Body:
 * - conversationId (optional): Clear one conversation
 * - clearAll (optional): Clear all conversations for user
 * 
 * NOTE: This is UI-only. To mark as read, use /api/whatsapp/conversations/read
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (token as any).id;
    const userRole = (token as any).role;
    const body = await req.json();
    const { conversationId, clearAll } = body;

    if (!conversationId && !clearAll) {
      return NextResponse.json(
        { error: "Either conversationId or clearAll is required" },
        { status: 400 }
      );
    }

    if (clearAll) {
      // Clear all notifications for this user (UI-only)
      console.log(`🧹 [CLEAR ALL] Clearing all notifications for user ${userId} (UI-only)`);

      // Emit clear event for all conversations (UI-only, doesn't affect read state)
      emitWhatsAppEvent("whatsapp-notifications-cleared", {
        clearedAll: true,
        userId,
      });

      return NextResponse.json({
        success: true,
        clearedAll: true,
      });
    } else {
      // Clear one conversation (UI-only)
      const conversation = await WhatsAppConversation.findById(conversationId);
      
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      // Check access: Sales users can only clear their assigned conversations
      if (userRole === "Sales" && conversation.assignedAgent?.toString() !== userId) {
        return NextResponse.json(
          { error: "Unauthorized to clear this conversation" },
          { status: 403 }
        );
      }

      console.log(`🧹 [CLEAR] Clearing notification for conversation ${conversationId} (UI-only)`);

      // Emit clear event for this conversation (UI-only, doesn't affect read state)
      emitWhatsAppEvent("whatsapp-notifications-cleared", {
        conversationId: conversation._id.toString(),
        userId,
      });

      return NextResponse.json({
        success: true,
        conversationId: conversation._id.toString(),
      });
    }
  } catch (error: any) {
    console.error("❌ [ERROR] Error clearing notifications:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
