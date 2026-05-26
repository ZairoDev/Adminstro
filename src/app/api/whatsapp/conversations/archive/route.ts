import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import ConversationArchiveState from "@/models/conversationArchiveState";
import ConversationReadState from "@/models/conversationReadState";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { WHATSAPP_EVENTS } from "@/lib/pusher";
import { canAccessConversation } from "@/lib/whatsapp/access";
import { emitWhatsAppEventToEligibleUsers } from "@/lib/whatsapp/emitToEligibleUsers";
import {
  applyPhoneMaskToConversation,
  resolveMaskRulesForToken,
} from "@/lib/whatsapp/phoneMask";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

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

    const conversationDoc = await WhatsAppConversation.findById(conversationId).lean();
    if (!conversationDoc || Array.isArray(conversationDoc)) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    const conversation = conversationDoc as Record<string, unknown> & {
      businessPhoneId?: string;
    };

    if (!canAccessConversation(token, conversation)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    await emitWhatsAppEventToEligibleUsers(
      WHATSAPP_EVENTS.CONVERSATION_UPDATE,
      conversation,
      {
        conversationId: conversationId.toString(),
        isArchived: true,
        archivedAt: archiveState.archivedAt,
        archivedBy: userId.toString(),
        businessPhoneId: conversation.businessPhoneId,
      }
    );

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

    const conversationDoc = await WhatsAppConversation.findById(conversationId).lean();
    if (!conversationDoc || Array.isArray(conversationDoc)) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    const conversation = conversationDoc as Record<string, unknown> & {
      businessPhoneId?: string;
    };

    if (!canAccessConversation(token, conversation)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    await emitWhatsAppEventToEligibleUsers(
      WHATSAPP_EVENTS.CONVERSATION_UPDATE,
      conversation,
      {
        conversationId: conversationId.toString(),
        isArchived: false,
        unarchivedAt: archiveState?.unarchivedAt || new Date(),
        unarchivedBy: userId.toString(),
        businessPhoneId: conversation.businessPhoneId,
      }
    );

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
 * Get all globally archived conversations with unread counts
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = token.id || token._id;

    // Get all globally archived conversation IDs (no userId filter - global)
    const archivedStates = await ConversationArchiveState.find({
      isArchived: true,
    })
      .select("conversationId archivedAt archivedBy")

      .lean();

    const archivedConversationIds = archivedStates.map(
      (state: any) => state.conversationId
    );

    if (archivedConversationIds.length === 0) {
      return NextResponse.json({
        success: true,
        conversations: [],
        count: 0,
      });
    }

    // Get the actual conversations
    const conversations = await WhatsAppConversation.find({
      _id: { $in: archivedConversationIds },
    })
      .sort({ lastMessageTime: -1 })
      .lean();

    // Preload per-user read state for these conversations (per-employee unread tracking)
    const conversationIds = conversations.map((c: any) => c._id);
    const readStates = await ConversationReadState.find({
      conversationId: { $in: conversationIds },
      userId: userId,
    })
      .select("conversationId lastReadMessageId lastReadAt")
      .lean();

    const readStateMap = new Map<string, any>();
    for (const rs of readStates) {
      readStateMap.set(String(rs.conversationId), rs);
    }

    // Create a map of archive info
    const archiveInfoMap = new Map<string, { archivedAt: Date; archivedBy?: string }>();
    archivedStates.forEach((state: any) => {
      archiveInfoMap.set(String(state.conversationId), {
        archivedAt: state.archivedAt,
        archivedBy: state.archivedBy?.toString(),
      });
    });

    // Add archive info and calculate unread counts for each conversation
    const conversationsWithArchiveInfo = await Promise.all(
      conversations.map(async (conv: any) => {
        const archiveInfo = archiveInfoMap.get(String(conv._id));
        
        // Calculate per-employee unread count (same logic as main conversations endpoint)
        let unreadCount = 0;
        const readState = readStateMap.get(String(conv._id));

        // Only client (incoming) messages can make a conversation unread
        if (conv.lastMessageDirection === "incoming" && conv.lastMessageId) {
          const lastReadMessageId = readState?.lastReadMessageId;

          // If no read state exists, or the last message differs from lastReadMessageId,
          // this conversation is unread for this employee
          if (!lastReadMessageId || lastReadMessageId !== conv.lastMessageId) {
            const msgQuery: any = {
              conversationId: conv._id,
              direction: "incoming",
            };

            // If we have a lastReadAt timestamp, only count messages after that
            if (readState?.lastReadAt) {
              msgQuery.timestamp = { $gt: readState.lastReadAt };
            }

            unreadCount = await WhatsAppMessage.countDocuments(msgQuery);
          }
        }

        return {
          ...conv,
          unreadCount, // Add calculated unread count
          archivedAt: archiveInfo?.archivedAt,
          archivedBy: archiveInfo?.archivedBy,
          isArchivedByUser: true, // All conversations in this endpoint are archived
        };
      })
    );

    const userRole = String(token.role || "");
    const phoneMaskRules = await resolveMaskRulesForToken(token);
    const maskedConversations = conversationsWithArchiveInfo.map((conv: Record<string, unknown>) =>
      applyPhoneMaskToConversation(conv, phoneMaskRules, userRole),
    );

    return NextResponse.json({
      success: true,
      conversations: maskedConversations,
      phoneMaskRules,
      count: maskedConversations.length,
    });
  } catch (error: any) {
    console.error("Get archived conversations error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
