import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import ConversationArchiveState from "@/models/conversationArchiveState";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import mongoose from "mongoose";

connectDb();

/**
 * Archive a conversation globally (for all users)
 * Archive behavior:
 * - Archived chats disappear from main inbox for ALL users
 * - They remain searchable
 * - They do NOT trigger notifications
 * - Incoming messages do NOT auto-unarchive
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await req.json();

    if (!conversationId) {
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

    const userId = token.id || token._id;

    // Upsert global archive state (no userId - global for everyone)
    const archiveState = await ConversationArchiveState.findOneAndUpdate(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
      },
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: new mongoose.Types.ObjectId(userId), // Track who archived (audit)
        $unset: { unarchivedAt: 1, unarchivedBy: 1 },
      },
      {
        upsert: true,
        new: true,
      }
    );

    // ============================================================
    // CRITICAL: Archive API Real-Time Sync
    // ============================================================
    // Emit socket event for real-time UI updates
    // Event is GLOBAL - affects all users' views
    emitWhatsAppEvent(WHATSAPP_EVENTS.CONVERSATION_UPDATE, {
      conversationId: conversationId.toString(),
      // No userId - broadcast to all users
      isArchived: true,
      archivedAt: archiveState.archivedAt,
      archivedBy: userId.toString(), // Track who archived
      businessPhoneId: conversation.businessPhoneId,
    });

    return NextResponse.json({
      success: true,
      archived: true,
      archiveState: {
        conversationId: archiveState.conversationId,
        isArchived: archiveState.isArchived,
        archivedAt: archiveState.archivedAt,
        archivedBy: archiveState.archivedBy?.toString(),
      },
    });
  } catch (error: any) {
    console.error("Archive conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Unarchive a conversation globally (for all users)
 */
export async function DELETE(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const userId = token.id || token._id;

    // Verify conversation exists
    const conversation = await WhatsAppConversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update global archive state to unarchived (no userId - global for everyone)
    const archiveState = await ConversationArchiveState.findOneAndUpdate(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
      },
      {
        isArchived: false,
        unarchivedAt: new Date(),
        unarchivedBy: new mongoose.Types.ObjectId(userId), // Track who unarchived (audit)
        $unset: { archivedAt: 1, archivedBy: 1 },
      },
      {
        new: true,
      }
    );

    // ============================================================
    // CRITICAL: Archive API Real-Time Sync
    // ============================================================
    // Emit socket event for real-time UI updates
    // Event is GLOBAL - affects all users' views
    emitWhatsAppEvent(WHATSAPP_EVENTS.CONVERSATION_UPDATE, {
      conversationId: conversationId.toString(),
      // No userId - broadcast to all users
      isArchived: false,
      unarchivedAt: archiveState?.unarchivedAt || new Date(),
      unarchivedBy: userId.toString(), // Track who unarchived
      businessPhoneId: conversation.businessPhoneId,
    });

    return NextResponse.json({
      success: true,
      archived: false,
      archiveState: archiveState
        ? {
            conversationId: archiveState.conversationId,
            isArchived: archiveState.isArchived,
            unarchivedAt: archiveState.unarchivedAt,
            unarchivedBy: archiveState.unarchivedBy?.toString(),
          }
        : null,
    });
  } catch (error: any) {
    console.error("Unarchive conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get all globally archived conversations
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all globally archived conversation IDs (no userId filter - global)
    const archivedStates = await ConversationArchiveState.find({
      isArchived: true,
    })
      .select("conversationId archivedAt archivedBy")
      .lean();

    const archivedConversationIds = archivedStates.map(
      (state: any) => state.conversationId
    );

    // Get the actual conversations
    const conversations = await WhatsAppConversation.find({
      _id: { $in: archivedConversationIds },
    })
      .sort({ lastMessageTime: -1 })
      .lean();

    // Create a map of archive info
    const archiveInfoMap = new Map<string, { archivedAt: Date; archivedBy?: string }>();
    archivedStates.forEach((state: any) => {
      archiveInfoMap.set(String(state.conversationId), {
        archivedAt: state.archivedAt,
        archivedBy: state.archivedBy?.toString(),
      });
    });

    // Add archive info to each conversation
    const conversationsWithArchiveInfo = conversations.map((conv: any) => {
      const archiveInfo = archiveInfoMap.get(String(conv._id));
      return {
        ...conv,
        archivedAt: archiveInfo?.archivedAt,
        archivedBy: archiveInfo?.archivedBy,
      };
    });

    return NextResponse.json({
      success: true,
      conversations: conversationsWithArchiveInfo,
      count: conversations.length,
    });
  } catch (error: any) {
    console.error("Get archived conversations error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
