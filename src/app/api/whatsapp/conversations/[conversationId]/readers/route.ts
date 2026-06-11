import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import ConversationReadState from "@/models/conversationReadState";
import WhatsAppConversation from "@/models/whatsappConversation";
import Employee from "@/models/employee";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";

connectDb();

/**
 * GET /api/whatsapp/conversations/[conversationId]/readers
 * Get list of users who have read this conversation with their avatars
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
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
        { status: 400 }
      );
    }

    const conversation = await WhatsAppConversation.findById(conversationId).lean();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (!(await canAccessConversationAsync(token as Record<string, unknown>, conversation as Record<string, unknown>))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const readStates = (await ConversationReadState.find({
      conversationId,
    })
      .populate({ path: "userId", model: Employee, select: "name profilePic" })
      .sort({ lastReadAt: -1 })
      .lean()) as Array<{
      userId?: { _id?: unknown; name?: string; profilePic?: string };
      lastReadAt?: Date;
      lastReadMessageId?: string;
    }>;

    const readers = readStates
      .filter((rs) => rs.userId)
      .map((rs) => {
        const user = rs.userId;
        return {
          userId: user?._id?.toString(),
          name: user?.name || "Unknown",
          avatar: user?.profilePic || null,
          lastReadAt: rs.lastReadAt,
          lastReadMessageId: rs.lastReadMessageId,
        };
      });

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
