import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import ConversationReadState from "@/models/conversationReadState";
import Employee from "@/models/employee";

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

    // Get all read states for this conversation
    const readStates = (await ConversationReadState.find({
      conversationId,
    })
      // Explicitly pass the Employee model to ensure it's registered
      .populate({ path: "userId", model: Employee, select: "name profilePic" })
      .sort({ lastReadAt: -1 })
      .lean()) as any[];

    // Transform to include user info
    const readers = readStates
      .filter((rs) => rs.userId) // Filter out any null users
      .map((rs) => {
        const user = rs.userId;
        return {
          userId: user?._id?.toString() || user?.toString(),
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
  } catch (error: any) {
    console.error("Error fetching conversation readers:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
