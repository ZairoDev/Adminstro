import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import WhatsAppConversation from "@/models/whatsappConversation";
import { getAllowedPhoneIds, getAllowedPhoneConfigs } from "@/lib/whatsapp/config";

connectDb();

// Force dynamic rendering (uses request.cookies)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (token as any).role || "";
    const allowedRoles = ["SuperAdmin", "Sales-TeamLead", "Sales"];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = (token as any).id || (token as any)._id;
    const userAreas = (token as any).allotedArea || [];
    
    // Get location-scoped phone IDs based on role
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        summary: {
          expiringCount: 0,
          unreadCount: 0,
          topItems: [],
        },
      });
    }

    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Build conversation query with location and ownership filtering
    let conversationQuery: any = {
      status: "active",
      businessPhoneId: { $in: allowedPhoneIds },
      lastCustomerMessageAt: {
        $gte: twentyFourHoursAgo,
        $lte: now,
      },
    };

    // Sales users: only see conversations assigned to them OR unassigned
    if (userRole === "Sales" && userId) {
      conversationQuery.$or = [
        { assignedAgent: userId },
        { assignedAgent: { $exists: false } },
        { assignedAgent: null },
      ];
    }
    // Sales-TeamLead and SuperAdmin see all conversations for their phone numbers

    // Fetch expiring conversations
    const expiringConversations = await WhatsAppConversation.find(conversationQuery)
      .select("_id participantPhone participantName lastCustomerMessageAt lastMessageContent businessPhoneId assignedAgent")
      .lean();

    // Process expiring conversations with severity sorting
    const expiringWithTime = expiringConversations
      .map((conv: any) => {
        if (!conv.lastCustomerMessageAt) return null;

        const lastMessage = new Date(conv.lastCustomerMessageAt);
        const msRemaining = lastMessage.getTime() + 24 * 60 * 60 * 1000 - now.getTime();
        const hoursRemaining = msRemaining / (1000 * 60 * 60);

        if (hoursRemaining > 0 && hoursRemaining <= 3) {
          const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
          const totalMinutes = hoursRemaining * 60 + minutesRemaining;
          
          return {
            _id: conv._id.toString(),
            participantPhone: conv.participantPhone,
            participantName: conv.participantName || conv.participantPhone,
            lastMessageContent: conv.lastMessageContent || "No message",
            hoursRemaining: Math.floor(hoursRemaining),
            minutesRemaining,
            totalMinutes, // For sorting
            severity: totalMinutes <= 60 ? "critical" : totalMinutes <= 120 ? "urgent" : "warning",
            lastCustomerMessageAt: conv.lastCustomerMessageAt,
            businessPhoneId: conv.businessPhoneId,
            assignedAgent: conv.assignedAgent?.toString(),
          };
        }
        return null;
      })
      .filter((conv): conv is NonNullable<typeof conv> => conv !== null)
      .sort((a, b) => a.totalMinutes - b.totalMinutes); // Most urgent first

    // Fetch unread conversations (location and ownership filtered)
    const unreadQuery: any = {
      status: "active",
      businessPhoneId: { $in: allowedPhoneIds },
      unreadCount: { $gt: 0 },
      // Only incoming messages create unread count
      lastMessageDirection: "incoming",
    };

    if (userRole === "Sales" && userId) {
      unreadQuery.$or = [
        { assignedAgent: userId },
        { assignedAgent: { $exists: false } },
        { assignedAgent: null },
      ];
    }

    const unreadConversations = await WhatsAppConversation.find(unreadQuery)
      .select("_id participantPhone participantName lastMessageContent unreadCount lastMessageTime businessPhoneId assignedAgent")
      .sort({ lastMessageTime: -1 })
      .limit(5)
      .lean();

    const unreadItems = unreadConversations.map((conv: any) => ({
      _id: conv._id.toString(),
      participantPhone: conv.participantPhone,
      participantName: conv.participantName || conv.participantPhone,
      lastMessageContent: conv.lastMessageContent || "No message",
      unreadCount: conv.unreadCount,
      lastMessageTime: conv.lastMessageTime,
      businessPhoneId: conv.businessPhoneId,
      assignedAgent: conv.assignedAgent?.toString(),
    }));

    // Combine and sort by severity (critical expiring first, then urgent, then unread)
    const topItems = [
      ...expiringWithTime.slice(0, 5).map((item) => ({ ...item, type: "expiring" as const })),
      ...unreadItems.slice(0, 5).map((item) => ({ ...item, type: "unread" as const })),
    ].slice(0, 7); // Max 7 items total

    return NextResponse.json({
      success: true,
      summary: {
        expiringCount: expiringWithTime.length,
        unreadCount: unreadConversations.length,
        topItems,
      },
    });
  } catch (error: any) {
    console.error("Error fetching notification summary:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


