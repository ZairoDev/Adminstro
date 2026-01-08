import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";

connectDb();

// Helper to extract display text from content object
function getDisplayText(content: any, type: string): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  
  // Handle content object format
  if (content.text) return content.text;
  if (content.caption) return content.caption;
  if (content.location) {
    const loc = content.location;
    return `📍 ${loc.name || loc.address || `${loc.latitude}, ${loc.longitude}`}`;
  }
  
  // Fallback based on type
  const typeLabels: Record<string, string> = {
    image: "📷 Image",
    video: "🎬 Video",
    audio: "🎵 Audio",
    document: "📄 Document",
    sticker: "🎨 Sticker",
    interactive: "Interactive message",
    template: "Template message",
  };
  
  return typeLabels[type] || `${type} message`;
}

// Get messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { conversationId } = params;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const beforeMessageId = searchParams.get("beforeMessageId"); // For cursor-based pagination
    const beforeTimestamp = searchParams.get("beforeTimestamp"); // Alternative: timestamp-based

    // Build query
    const query: any = { conversationId };
    
    // For initial load, get latest messages
    // For loading older messages, use cursor
    if (beforeMessageId) {
      // Find the message with this ID to get its timestamp
      const beforeMessage = await WhatsAppMessage.findOne({ 
        _id: beforeMessageId,
        conversationId 
      }).select("timestamp").lean() as { timestamp: Date } | null;
      
      if (beforeMessage && beforeMessage.timestamp) {
        query.timestamp = { $lt: new Date(beforeMessage.timestamp) };
      }
    } else if (beforeTimestamp) {
      query.timestamp = { $lt: new Date(beforeTimestamp) };
    }

    // Fetch messages (sorted by timestamp descending for latest first)
    const rawMessages = await WhatsAppMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(limit + 1) // Fetch one extra to determine if there are more
      .lean();

    // Check if there are more messages
    const hasMore = rawMessages.length > limit;
    const messagesToReturn = hasMore ? rawMessages.slice(0, limit) : rawMessages;

    // Transform messages to include displayText for frontend compatibility
    const messages = messagesToReturn.map((msg: any) => ({
      ...msg,
      // Add displayText for frontend to use
      displayText: getDisplayText(msg.content, msg.type),
    }));

    // Reverse to chronological order (oldest first)
    const messagesChronological = messages.reverse();

    // Get cursor for next page (first message's ID and timestamp)
    const nextCursor = messagesChronological.length > 0
      ? {
          messageId: messagesChronological[0]._id.toString(),
          timestamp: messagesChronological[0].timestamp.toISOString(),
        }
      : null;

    // Mark conversation as read (reset unread count)
    await WhatsAppConversation.findByIdAndUpdate(conversationId, {
      unreadCount: 0,
    });

    return NextResponse.json({
      success: true,
      messages: messagesChronological, // Return in chronological order (oldest first)
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error: any) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
