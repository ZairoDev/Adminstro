import mongoose from "mongoose";
import SystemNotification from "@/models/systemNotification";
import { emitWhatsAppEvent } from "@/lib/pusher";

export interface AdvertPendingOwnerPayload {
  ownerSheetId: string;
  name: string;
  location: string;
  phoneNumber: string;
  createdAt?: Date;
}

export async function notifyAdvertPendingOwner(
  payload: AdvertPendingOwnerPayload,
  createdByEmployeeId: string,
): Promise<void> {
  const title = "New short-term owner pending listing";
  const message = `${payload.name || "Owner"} in ${payload.location || "unknown location"} was added to the short-term sheet. Open Manage User → Listing queue to create a draft listing.`;

  let createdBy: mongoose.Types.ObjectId;
  try {
    createdBy = new mongoose.Types.ObjectId(createdByEmployeeId);
  } catch {
    createdBy = new mongoose.Types.ObjectId();
  }

  const notification = await SystemNotification.create({
    title,
    message,
    type: "info",
    target: {
      roles: ["Advert", "SuperAdmin"],
      locations: [],
      allUsers: false,
    },
    createdBy,
    readBy: [],
    isActive: true,
  });

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
      deepLink: "/dashboard/user?tab=listing-queue",
    },
  });

  emitWhatsAppEvent("advert-pending-owner", {
    ...payload,
    deepLink: "/dashboard/user?tab=listing-queue",
  });
}
