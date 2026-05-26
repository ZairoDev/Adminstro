import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { getAllowedPhoneIds, getRetargetPhoneId, FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { buildConversationVisibilityFilter } from "@/lib/whatsapp/locationAccess";

export const dynamic = "force-dynamic";

connectDb();

/**
 * Get all media (images, videos, documents) from conversations
 * Filtered by phoneId if provided
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const phoneId = searchParams.get("phoneId");
    const conversationId = searchParams.get("conversationId"); // Optional: filter by specific conversation
    const limit = parseInt(searchParams.get("limit") || "100");
    const mediaType = searchParams.get("type"); // Optional: "image" | "video" | "document" | "audio"

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    let allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    // Advert role: allow access to retarget phone media
    if (allowedPhoneIds.length === 0 && userRole === "Advert") {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        allowedPhoneIds = [retargetPhoneId];
      }
    }

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    // Build query for conversations — canonical dual visibility: phone AND location key
    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(token.role || "");
    const visibilityFilter = isFullAccess
      ? { businessPhoneId: { $in: allowedPhoneIds } }
      : buildConversationVisibilityFilter(token as any);

    const conversationQuery: any = {
      ...visibilityFilter,
      status: { $ne: "archived" },
    };

    // Override phone if explicitly requested (caller is already gated by visibility filter)
    if (phoneId) {
      if (!isFullAccess && !allowedPhoneIds.includes(phoneId)) {
        return NextResponse.json(
          { error: "You don't have access to this phone number" },
          { status: 403 }
        );
      }
      conversationQuery.businessPhoneId = phoneId;
    }

    // Filter by specific conversation if provided
    if (conversationId) {
      conversationQuery._id = conversationId;
    }

    // Get conversation IDs
    const conversations = await WhatsAppConversation.find(conversationQuery)
      .select("_id participantName participantPhone")
      .lean();

    const conversationIds = conversations.map((c: any) => c._id);

    if (conversationIds.length === 0) {
      return NextResponse.json({
        success: true,
        media: [],
        count: 0,
      });
    }

    // Build query for media messages
    const messageQuery: any = {
      conversationId: { $in: conversationIds },
      mediaUrl: { $exists: true, $ne: null },
    };

    // Filter by media type if specified
    if (mediaType === "media") {
      // "media" tab should show images and videos
      messageQuery.type = { $in: ["image", "video"] };
    } else if (mediaType) {
      messageQuery.type = mediaType;
    } else {
      // Default: all media types
      messageQuery.type = { $in: ["image", "video", "document", "audio"] };
    }

    // Fetch media messages
    const mediaMessages = await WhatsAppMessage.find(messageQuery)
      .select("_id conversationId type mediaUrl mimeType filename timestamp content")
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Create a map of conversation IDs to conversation info
    const conversationMap = new Map<string, { name: string; phone: string }>();
    conversations.forEach((conv: any) => {
      conversationMap.set(conv._id.toString(), {
        name: conv.participantName || conv.participantPhone,
        phone: conv.participantPhone,
      });
    });

    // Transform media messages with conversation info
    const media = mediaMessages.map((msg: any) => {
      const convInfo = conversationMap.get(msg.conversationId.toString());
      return {
        id: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
        type: msg.type,
        mediaUrl: msg.mediaUrl,
        mimeType: msg.mimeType,
        filename: msg.filename,
        timestamp: msg.timestamp,
        sender: convInfo?.name || convInfo?.phone || "Unknown",
        caption: msg.content?.caption || msg.content?.text || "",
      };
    });

    return NextResponse.json({
      success: true,
      media,
      count: media.length,
    });
  } catch (error: any) {
    console.error("Get media error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
