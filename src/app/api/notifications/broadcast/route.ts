import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import SystemNotification from "@/models/systemNotification";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import mongoose from "mongoose";

connectDb();

// One-time cleanup: Drop the problematic parallel arrays index if it exists
async function cleanupParallelArraysIndex() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    
    const collection = db.collection("systemnotifications");
    const indexes = await collection.indexes();
    const problematicIndex = indexes.find(
      (idx: any) => idx.key?.["target.roles"] && idx.key?.["target.locations"]
    );
    if (problematicIndex && problematicIndex.name) {
      await collection.dropIndex(problematicIndex.name);
      console.log("✅ Dropped problematic parallel arrays index:", problematicIndex.name);
    }
  } catch (error: any) {
    // Index doesn't exist or already dropped, ignore error
    if (error.code !== 27 && error.codeName !== "IndexNotFound") {
      console.log("Index cleanup:", error.message);
    }
  }
}

// Run cleanup on module load (only once)
if (mongoose.connection.readyState === 1) {
  cleanupParallelArraysIndex();
} else {
  mongoose.connection.once("connected", cleanupParallelArraysIndex);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (token as any).role || "";
    
    // Only SuperAdmin and HR can broadcast notifications
    if (!["SuperAdmin", "HR"].includes(userRole)) {
      return NextResponse.json(
        { error: "Only SuperAdmin and HR can broadcast notifications" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      message,
      type = "info",
      targetRoles = [],
      targetLocations = [],
      allUsers = false,
      expiresAt,
    } = body;

    // Validation
    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    if (!["info", "warning", "critical"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    // Validate expiresAt if provided
    let expiresAtDate: Date | undefined;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiration date" },
          { status: 400 }
        );
      }
      // Expiration must be in the future
      if (expiresAtDate <= new Date()) {
        return NextResponse.json(
          { error: "Expiration date must be in the future" },
          { status: 400 }
        );
      }
    }

    // Create notification
    const notification = await SystemNotification.create({
      title: title.trim(),
      message: message.trim(),
      type,
      target: {
        roles: allUsers ? [] : targetRoles,
        locations: allUsers ? [] : targetLocations,
        allUsers,
      },
      createdBy: (token as any).id || (token as any)._id,
      expiresAt: expiresAtDate,
      readBy: [],
      isActive: true,
    });

    // Broadcast via Socket.IO to eligible users
    // The filtering will happen on the client side based on the target criteria
    emitWhatsAppEvent("system-notification", {
      notification: {
        _id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        target: notification.target,
        createdBy: notification.createdBy.toString(),
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        target: notification.target,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("Error broadcasting notification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

