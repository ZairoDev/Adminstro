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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before"); // For pagination by timestamp

    const skip = (page - 1) * limit;

    // Build query
    const query: any = { conversationId };
    
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const [rawMessages, total] = await Promise.all([
      WhatsAppMessage.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WhatsAppMessage.countDocuments({ conversationId }),
    ]);

    // Transform messages to include displayText for frontend compatibility
    const messages = rawMessages.map((msg: any) => ({
      ...msg,
      // Add displayText for frontend to use
      displayText: getDisplayText(msg.content, msg.type),
    }));

    // Mark conversation as read (reset unread count)
    await WhatsAppConversation.findByIdAndUpdate(conversationId, {
      unreadCount: 0,
    });

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + rawMessages.length < total,
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
