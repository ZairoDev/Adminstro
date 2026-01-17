import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import ConversationArchiveState from "@/models/conversationArchiveState";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import mongoose from "mongoose";

connectDb();

/**
 * Archive a conversation for the current user
 * WhatsApp-style behavior:
 * - Archived chats disappear from main inbox
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

    // Upsert archive state for this user
    const archiveState = await ConversationArchiveState.findOneAndUpdate(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        isArchived: true,
        archivedAt: new Date(),
        $unset: { unarchivedAt: 1 },
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
    // Event is user-scoped (not global) - only affects this user's view
    emitWhatsAppEvent(WHATSAPP_EVENTS.CONVERSATION_UPDATE, {
      conversationId: conversationId.toString(),
      userId: userId.toString(), // Target user
      isArchived: true,
      archivedAt: archiveState.archivedAt,
      businessPhoneId: conversation.businessPhoneId,
    });

    return NextResponse.json({
      success: true,
      archived: true,
      archiveState: {
        conversationId: archiveState.conversationId,
        isArchived: archiveState.isArchived,
        archivedAt: archiveState.archivedAt,
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
 * Unarchive a conversation for the current user
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

    // Update archive state to unarchived
    const archiveState = await ConversationArchiveState.findOneAndUpdate(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        isArchived: false,
        unarchivedAt: new Date(),
      },
      {
        new: true,
      }
    );

    // ============================================================
    // CRITICAL: Archive API Real-Time Sync
    // ============================================================
    // Emit socket event for real-time UI updates
    // Event is user-scoped (not global) - only affects this user's view
    emitWhatsAppEvent(WHATSAPP_EVENTS.CONVERSATION_UPDATE, {
      conversationId: conversationId.toString(),
      userId: userId.toString(), // Target user
      isArchived: false,
      unarchivedAt: archiveState?.unarchivedAt || new Date(),
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
 * Get archived conversations for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = token.id || token._id;

    // Get all archived conversation IDs for this user
    const archivedStates = await ConversationArchiveState.find({
      userId: new mongoose.Types.ObjectId(userId),
      isArchived: true,
    })
      .select("conversationId archivedAt")
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

    // Create a map of archive times
    const archiveTimeMap = new Map<string, Date>();
    archivedStates.forEach((state: any) => {
      archiveTimeMap.set(String(state.conversationId), state.archivedAt);
    });

    // Add archivedAt to each conversation
    const conversationsWithArchiveInfo = conversations.map((conv: any) => ({
      ...conv,
      archivedAt: archiveTimeMap.get(String(conv._id)),
    }));

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
