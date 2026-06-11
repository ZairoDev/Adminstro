import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { getRetargetPhoneId, FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { buildConversationVisibilityFilterAsync } from "@/lib/whatsapp/locationAccess";
import { normalizeWhatsAppToken, resolveAllowedPhoneIdsAsync } from "@/lib/whatsapp/apiContext";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";

export const dynamic = "force-dynamic";

connectDb();

/**
 * Get all media (images, videos, documents) from conversations
 * Filtered by phoneId if provided
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as Record<string, unknown>;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const phoneId = searchParams.get("phoneId");
    const conversationId = searchParams.get("conversationId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const mediaType = searchParams.get("type");

    const normalizedToken = normalizeWhatsAppToken(token);
    const userRole = normalizedToken.role || "";
    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);

    let allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken);
    if (allowedPhoneIds.length === 0 && userRole === "Advert") {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) allowedPhoneIds = [retargetPhoneId];
    }

    if (allowedPhoneIds.length === 0 && !isFullAccess) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    if (conversationId) {
      const conv = await WhatsAppConversation.findById(conversationId).lean();
      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      if (!(await canAccessConversationAsync(normalizedToken, conv as Record<string, unknown>))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const visibilityFilter = isFullAccess
      ? {}
      : await buildConversationVisibilityFilterAsync(normalizedToken);

    const conversationQuery: Record<string, unknown> = {
      ...visibilityFilter,
      status: { $ne: "archived" },
    };

    if (phoneId) {
      if (!isFullAccess && !allowedPhoneIds.includes(phoneId)) {
        return NextResponse.json(
          { error: "You don't have access to this phone number" },
          { status: 403 }
        );
      }
      conversationQuery.businessPhoneId = phoneId;
    }

    if (conversationId) {
      conversationQuery._id = conversationId;
    }

    const conversations = await WhatsAppConversation.find(conversationQuery)
      .select("_id participantName participantPhone")
      .lean();

    const conversationIds = conversations.map((c) => c._id);

    if (conversationIds.length === 0) {
      return NextResponse.json({
        success: true,
        media: [],
        count: 0,
      });
    }

    const mediaTypes = mediaType
      ? [mediaType]
      : ["image", "video", "document", "audio"];

    const mediaMessages = await WhatsAppMessage.find({
      conversationId: { $in: conversationIds },
      type: { $in: mediaTypes },
      mediaUrl: { $exists: true, $ne: "" },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const conversationMap = new Map(
      conversations.map((c) => [String(c._id), c])
    );

    const media = mediaMessages.map((msg) => {
      const conv = conversationMap.get(String(msg.conversationId));
      return {
        _id: msg._id,
        messageId: msg.messageId,
        type: msg.type,
        mediaUrl: msg.mediaUrl,
        filename: msg.filename,
        mimeType: msg.mimeType,
        caption:
          typeof msg.content === "object" && msg.content
            ? (msg.content as { caption?: string }).caption
            : undefined,
        timestamp: msg.timestamp,
        direction: msg.direction,
        conversationId: msg.conversationId,
        participantName: conv?.participantName,
        participantPhone: conv?.participantPhone,
      };
    });

    return NextResponse.json({
      success: true,
      media,
      count: media.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Get media error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
