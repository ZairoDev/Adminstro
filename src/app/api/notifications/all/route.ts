import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import SystemNotification from "@/models/systemNotification";

connectDb();

/**
 * GET /api/notifications/all
 * Fetch ALL notifications (past and present) - SuperAdmin only
 * Used for the notifications management page
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (token as any).role || "";
    
    // Only SuperAdmin can view all notifications
    if (userRole !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Only SuperAdmin can view all notifications" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build query
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    // Fetch all notifications (sorted by latest first)
    const [notifications, totalCount] = await Promise.all([
      SystemNotification.find(query)
        .select("title message type target createdBy createdAt expiresAt readBy isActive")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 }) // Latest first
        .skip(offset)
        .limit(limit)
        .lean(),
      SystemNotification.countDocuments(query),
    ]);

    // Format response
    const formattedNotifications = notifications.map((notif: any) => ({
      _id: notif._id.toString(),
      title: notif.title,
      message: notif.message,
      type: notif.type,
      target: notif.target,
      createdBy: {
        _id: notif.createdBy?._id?.toString(),
        name: notif.createdBy?.name || "System",
        email: notif.createdBy?.email,
      },
      createdAt: notif.createdAt,
      expiresAt: notif.expiresAt,
      isActive: notif.isActive,
      readCount: notif.readBy?.length || 0,
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      totalCount,
      hasMore: offset + limit < totalCount,
    });
  } catch (error: any) {
    console.error("Error fetching all notifications:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



