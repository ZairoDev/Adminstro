import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import SystemNotification from "@/models/systemNotification";
import { emitWhatsAppEvent } from "@/lib/pusher";

connectDb();

/**
 * PATCH /api/notifications/[notificationId]
 * Update notification (activate/deactivate) - SuperAdmin only
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (token as any).role || "";
    
    // Only SuperAdmin can update notifications
    if (userRole !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Only SuperAdmin can update notifications" },
        { status: 403 }
      );
    }

    const { notificationId } = params;
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    const updated = await SystemNotification.findByIdAndUpdate(
      notificationId,
      { isActive },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Broadcast update event
    emitWhatsAppEvent("system-notification-updated", {
      notificationId: notificationId,
      isActive,
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[notificationId]
 * Delete a notification - SuperAdmin only
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (token as any).role || "";
    
    // Only SuperAdmin can delete notifications
    if (userRole !== "SuperAdmin") {
      return NextResponse.json(
        { error: "Only SuperAdmin can delete notifications" },
        { status: 403 }
      );
    }

    const { notificationId } = params;

    const deleted = await SystemNotification.findByIdAndDelete(notificationId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Broadcast deletion event
    emitWhatsAppEvent("system-notification-deleted", {
      notificationId: notificationId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



