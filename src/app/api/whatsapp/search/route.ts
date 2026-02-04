import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    if (!query) {
      return NextResponse.json({ success: false, error: "Query required" }, { status: 400 });
    }

    const phoneDigits = query.replace(/\D/g, "");
    const textQuery = query.trim();
    const phoneId = searchParams.get("phoneId");

    await connectDb();

    const userRole = token.role;
    const userAreas = token.allotedArea;

    const permissionFilter: any = {};
    if (userRole === "Sales") {
      permissionFilter.assignedAgent = token.email;
    } else if (userRole === "Sales-TeamLead" && userAreas) {
      const areas = Array.isArray(userAreas) ? userAreas : [userAreas];
      permissionFilter.$or = [
        { assignedAgent: token.email },
        { participantLocation: { $in: areas } },
      ];
    }

    permissionFilter.status = { $in: ["active", "pending"] };

    if (phoneId) {
      permissionFilter.businessPhoneId = phoneId;
    }

    let conversations: any[] = [];
    const hasPhoneSearch = phoneDigits.length > 0;
    const hasTextSearch = textQuery.length > 0;

    if (hasPhoneSearch || hasTextSearch) {
      const searchConditions: any[] = [];
      if (hasPhoneSearch) {
        searchConditions.push({ participantPhone: { $regex: phoneDigits, $options: "i" } });
      }
      if (hasTextSearch) {
        searchConditions.push(
          { participantName: { $regex: textQuery, $options: "i" } },
          { notes: { $regex: textQuery, $options: "i" } }
        );
      }
      conversations = await WhatsAppConversation.find({
        ...permissionFilter,
        $or: searchConditions,
      })
        .select("_id participantPhone participantName participantProfilePic lastMessageTime lastMessageContent")
        .lean()
        .exec();
    }

    let conversationIds = conversations.map((c: any) => c._id);

    if (phoneId && !conversationIds.length && textQuery) {
      const convs = await WhatsAppConversation.find({
        ...permissionFilter,
        businessPhoneId: phoneId,
      })
        .select("_id")
        .lean()
        .exec();
      conversationIds = convs.map((c: any) => c._id);
    }

    let messages: any[] = [];
    if (textQuery && conversationIds.length) {
      const messageQuery: any = {
        conversationId: { $in: conversationIds },
        type: { $nin: ["reaction"] },
        $or: [
          { "content.text": { $regex: textQuery, $options: "i" } },
          { "content.caption": { $regex: textQuery, $options: "i" } },
        ],
      };

      messages = await WhatsAppMessage.find(messageQuery)
        .select("conversationId messageId content.text content.caption timestamp direction mediaUrl")
        .sort({ timestamp: -1 })
        .limit(200)
        .lean()
        .exec();
    }

    const messageMap = new Map<string, any[]>();
    messages.forEach((msg: any) => {
      const convId = msg.conversationId.toString();
      if (!messageMap.has(convId)) {
        messageMap.set(convId, []);
      }
      messageMap.get(convId)!.push({
        messageId: msg.messageId,
        snippet: (msg.content?.text || msg.content?.caption || "").substring(0, 100),
        timestamp: msg.timestamp,
        direction: msg.direction,
        mediaUrl: msg.mediaUrl,
      });
    });

    if (!conversations.length && messageMap.size) {
      const ids = Array.from(messageMap.keys());
      conversations = await WhatsAppConversation.find({
        ...permissionFilter,
        _id: { $in: ids },
      })
        .select("_id participantPhone participantName participantProfilePic lastMessageTime lastMessageContent")
        .lean()
        .exec();
    }

    const results = conversations
      .map((conv: any) => ({
        conversationId: conv._id.toString(),
        participantPhone: conv.participantPhone,
        participantName: conv.participantName || "",
        participantProfilePic: conv.participantProfilePic,
        lastMessageTime: conv.lastMessageTime,
        lastMessageContent: conv.lastMessageContent,
        matchedMessages: messageMap.get(conv._id.toString()) || [],
      }))
      .filter(
        (c: any) =>
          c.matchedMessages.length > 0 || hasPhoneSearch || hasTextSearch
      );

    return NextResponse.json({ success: true, conversations: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
