import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import SystemNotification from "@/models/systemNotification";

connectDb();

/**
 * GET /api/notifications
 * Fetch unread notifications for the current user
 * Filtered by role + location server-side
 * 
 * Query params:
 * - since: ISO timestamp to fetch notifications after (for replay)
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (token as any).id;
    const userRole = (token as any).role || "";
    // Normalize allotedArea to always be an array
    const userLocations = Array.isArray((token as any).allotedArea)
      ? (token as any).allotedArea
      : (token as any).allotedArea
        ? [(token as any).allotedArea]
        : [];

    // Get since parameter for replay
    const searchParams = req.nextUrl.searchParams;
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : null;

    const now = new Date();

    // Build query for active, non-expired notifications
    const baseQuery: any = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: now } },
      ],
      // Not read by this user
      readBy: { $ne: userId },
    };

    // Add since filter for replay
    if (since) {
      baseQuery.createdAt = { $gt: since };
    }

    // SuperAdmin receives ALL notifications (no filtering)
    if (userRole !== "SuperAdmin") {
      // Filter by target criteria for non-SuperAdmin users
      const targetQuery: any[] = [];

      // Check if user matches "all users" notifications
      targetQuery.push({ "target.allUsers": true });

      // Check if user's role matches
      if (userRole) {
        targetQuery.push({ "target.roles": { $in: [userRole] } });
      }

      // Check if user's locations match
      if (userLocations.length > 0) {
        const normalizedLocations = userLocations.map((loc: string) =>
          loc.toLowerCase().trim()
        );
        targetQuery.push({
          "target.locations": { $in: normalizedLocations },
        });
      }

      // If user has "all" location, they match any location-targeted notification
      if (userLocations.some((loc: string) => loc.toLowerCase() === "all")) {
        targetQuery.push({ "target.locations": { $exists: true, $ne: [] } });
      }

      baseQuery.$or = [
        ...baseQuery.$or,
        { $and: [{ $or: targetQuery }] },
      ];
    }

    // Fetch notifications (sorted by latest first)
    const notifications = await SystemNotification.find(baseQuery)
      .select("title message type target createdBy createdAt expiresAt readBy")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 }) // Latest first
      .limit(50)
      .lean();

    // Format response
    const formattedNotifications = notifications.map((notif: any) => {
      const isRead = notif.readBy?.some(
        (id: any) => id.toString() === userId.toString()
      );
      return {
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
        isRead,
      };
    });

    // Count unread (notifications not in readBy array)
    const unreadCount = formattedNotifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

