import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import ConversationArchiveState from "@/models/conversationArchiveState";
import WhatsAppConversation from "@/models/whatsappConversation";
import { WHATSAPP_EVENTS } from "@/lib/pusher";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { buildConversationVisibilityFilterAsync } from "@/lib/whatsapp/locationAccess";
import { normalizeWhatsAppToken } from "@/lib/whatsapp/apiContext";
import {
  collectUnreadCountTargets,
  enrichArchivedConversationsWithUnread,
  loadReadStatesForUser,
  batchComputeUnreadCounts,
  sumArchivedUnreadMessages,
  type ArchivedUnreadMinimal,
  type InboxConversationLean,
} from "@/lib/whatsapp/conversationsListEnrichment";
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

    if (!(await canAccessConversationAsync(token, conversation))) {
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
        type: "archive",
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

    if (!(await canAccessConversationAsync(token, conversation))) {
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
        type: "archive",
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
 * Get globally archived conversations with unread counts
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = token.id || token._id;
    const { searchParams } = new URL(req.url);
    const idsOnly = searchParams.get("idsOnly") === "true";

    const archivedStates = await ConversationArchiveState.find({
      isArchived: true,
    })
      .select("conversationId archivedAt archivedBy")
      .lean();

    const archivedConversationIds = archivedStates.map(
      (state) =>
        (state as unknown as { conversationId: mongoose.Types.ObjectId })
          .conversationId,
    );

    const normalizedToken = normalizeWhatsAppToken(token);
    const visibilityFilter = await buildConversationVisibilityFilterAsync(normalizedToken);

    if (idsOnly) {
      if (archivedConversationIds.length === 0) {
        return NextResponse.json({
          success: true,
          archivedIds: [],
          archivedUnreadMessageCount: 0,
        });
      }

      const visibleMinimal = (await WhatsAppConversation.find({
        $and: [{ _id: { $in: archivedConversationIds } }, visibilityFilter],
      })
        .select("_id lastMessageId lastMessageDirection")
        .lean()) as ArchivedUnreadMinimal[];

      const archivedIds = visibleMinimal.map((conv) => conv._id.toString());
      const readStateMap = await loadReadStatesForUser(
        visibleMinimal.map((conv) => conv._id),
        userId,
      );
      const unreadTargets = collectUnreadCountTargets(
        visibleMinimal as InboxConversationLean[],
        readStateMap,
      );
      const unreadCountByConversationId =
        await batchComputeUnreadCounts(unreadTargets);
      const archivedUnreadMessageCount = sumArchivedUnreadMessages(
        visibleMinimal,
        unreadCountByConversationId,
      );

      return NextResponse.json({
        success: true,
        archivedIds,
        archivedUnreadMessageCount,
      });
    }

    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const cursor = searchParams.get("cursor");

    if (archivedConversationIds.length === 0) {
      return NextResponse.json({
        success: true,
        conversations: [],
        phoneMaskRules: await resolveMaskRulesForToken(token),
        count: 0,
        pagination: {
          limit,
          hasMore: false,
          nextCursor: null,
        },
      });
    }

    const archiveQuery: Record<string, unknown> = {
      $and: [{ _id: { $in: archivedConversationIds } }, visibilityFilter],
    };

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        archiveQuery.$and = [
          ...(archiveQuery.$and as Record<string, unknown>[]),
          { lastMessageTime: { $lt: cursorDate } },
        ];
      }
    }

    const [totalCount, conversationsRaw] = await Promise.all([
      WhatsAppConversation.countDocuments({
        $and: [{ _id: { $in: archivedConversationIds } }, visibilityFilter],
      }),
      WhatsAppConversation.find(archiveQuery)
        .sort({ lastMessageTime: -1 })
        .limit(limit + 1)
        .lean(),
    ]);

    const hasMore = conversationsRaw.length > limit;
    const pageConversations = (
      hasMore ? conversationsRaw.slice(0, limit) : conversationsRaw
    ) as InboxConversationLean[];

    const nextCursor =
      pageConversations.length > 0
        ? (
            pageConversations[pageConversations.length - 1] as {
              lastMessageTime?: Date;
            }
          ).lastMessageTime?.toISOString() ?? null
        : null;

    const archiveInfoMap = new Map<string, { archivedAt: Date; archivedBy?: string }>();
    archivedStates.forEach((state) => {
      const row = state as unknown as {
        conversationId: mongoose.Types.ObjectId;
        archivedAt?: Date;
        archivedBy?: mongoose.Types.ObjectId;
      };
      archiveInfoMap.set(String(row.conversationId), {
        archivedAt: row.archivedAt as Date,
        archivedBy: row.archivedBy?.toString(),
      });
    });

    const conversationsWithUnread = await enrichArchivedConversationsWithUnread(
      pageConversations,
      userId,
    );

    const conversationsWithArchiveInfo = conversationsWithUnread.map((conv) => {
      const archiveInfo = archiveInfoMap.get(String(conv._id));
      return {
        ...conv,
        archivedAt: archiveInfo?.archivedAt,
        archivedBy: archiveInfo?.archivedBy,
        isArchivedByUser: true,
      };
    });

    const userRole = String(token.role || "");
    const phoneMaskRules = await resolveMaskRulesForToken(token);
    const maskedConversations = conversationsWithArchiveInfo.map(
      (conv: Record<string, unknown>) =>
        applyPhoneMaskToConversation(conv, phoneMaskRules, userRole),
    );

    return NextResponse.json({
      success: true,
      conversations: maskedConversations,
      phoneMaskRules,
      count: totalCount,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error: any) {
    console.error("Get archived conversations error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
