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
    const limit = parseInt(searchParams.get("limit") || "20"); // Default to last 20 messages
    const before = searchParams.get("before"); // Cursor: load messages before this timestamp

    // Build query
    const query: any = { conversationId };
    
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    // Fetch messages sorted by newest first, then use cursor-based pagination
    const rawMessages = await WhatsAppMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(limit + 1) // Fetch one extra to determine if there are more
      .lean();

    const hasMore = rawMessages.length > limit;
    const pageMessages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

    // Transform messages to include displayText for frontend compatibility
    const messages = pageMessages.map((msg: any) => ({
      ...msg,
      // Add displayText for frontend to use
      displayText: getDisplayText(msg.content, msg.type),
    }));

    // Determine cursor for loading older messages (earliest message in this batch)
    const nextBefore =
      pageMessages.length > 0
        ? new Date(pageMessages[pageMessages.length - 1].timestamp).toISOString()
        : null;

    // Mark conversation as read (reset unread count)
    await WhatsAppConversation.findByIdAndUpdate(conversationId, {
      unreadCount: 0,
    });

    return NextResponse.json({
      success: true,
      // Return in chronological order (oldest at top for rendering)
      messages: messages.reverse(),
      pagination: {
        limit,
        hasMore,
        nextBefore,
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
