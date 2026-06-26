import mongoose from "mongoose";
import ConversationReadState from "@/models/conversationReadState";
import Employee from "@/models/employee";

export type ConversationReader = {
  userId: string;
  name: string;
  avatar: string | null;
  lastReadAt: Date;
  lastReadMessageId?: string;
};

type ReadStateLean = {
  userId?: { _id?: unknown; name?: string; profilePic?: string };
  lastReadAt?: Date;
  lastReadMessageId?: string;
};

/** Load users who have read a conversation (shared by GET readers + POST mark-read). */
export async function loadConversationReaders(
  conversationId: string | mongoose.Types.ObjectId,
): Promise<ConversationReader[]> {
  const readStates = (await ConversationReadState.find({
    conversationId,
  })
    .populate({ path: "userId", model: Employee, select: "name profilePic" })
    .sort({ lastReadAt: -1 })
    .lean()) as ReadStateLean[];

  return readStates
    .filter((rs) => rs.userId)
    .map((rs) => {
      const user = rs.userId;
      return {
        userId: user?._id != null ? String(user._id) : "",
        name: user?.name || "Unknown",
        avatar: user?.profilePic || null,
        lastReadAt: rs.lastReadAt ?? new Date(0),
        lastReadMessageId: rs.lastReadMessageId,
      };
    })
    .filter((r) => r.userId);
}
