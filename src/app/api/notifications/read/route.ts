import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import SystemNotification from "@/models/systemNotification";

connectDb();

/**
 * POST /api/notifications/read
 * Mark a notification as read
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (token as any).id;
    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Add user to readBy array (avoid duplicates)
    await SystemNotification.findByIdAndUpdate(notificationId, {
      $addToSet: { readBy: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



