/**
 * POST /api/whatsapp/channels/[id]/migrate
 *
 * Channel migration — use when routing identity fields need to change:
 *   phoneNumberId, wabaId, businessPortfolioId, channelType, rentalType
 *
 * Flow:
 *   1. Validate the new identity fields pass the triple-uniqueness check.
 *   2. Deactivate the current channel (sets active=false, endedAt=now, closes
 *      assignment rows). Existing conversations keep their frozen whatsappChannelId.
 *   3. Create a new WhatsappChannel with the updated fields and open assignment rows.
 *   4. Return both old (deactivated) and new (active) channel documents.
 *
 * The new channel gets a fresh _id. Conversations created after the migration
 * will be stamped with the new channelId. Old conversations retain their snapshot
 * references to the old channel — history is never re-linked.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsappChannel, { IWhatsappChannel } from "@/models/whatsappChannel";
import {
  assertChannelTripleUnique,
  normalizeChannelLocationKeys,
  deactivateChannel,
  createChannelWithAssignment,
} from "@/lib/whatsapp/channelService";

export const dynamic = "force-dynamic";

const CHANNEL_ADMIN_ROLES = ["SuperAdmin"];

type AuthToken = { id?: unknown; role?: unknown } | null;

function requireChannelAdmin(token: AuthToken): NextResponse | null {
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const role = String((token as { role?: unknown }).role ?? "");
  if (!CHANNEL_ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

const migrateSchema = z.object({
  name: z.string().trim().min(1),
  channelType: z.enum(["guest", "owner", "support", "backup"]),
  businessPortfolioId: z.string().trim().min(1),
  businessPortfolioName: z.string().trim().optional().default(""),
  wabaId: z.string().trim().min(1),
  wabaName: z.string().trim().optional().default(""),
  phoneNumberId: z.string().trim().min(1),
  displayPhoneNumber: z.string().trim().optional().default(""),
  /** Leave blank to inherit the access token from the channel being replaced. */
  accessToken: z.string().optional(),
  rentalType: z.enum(["Short Term", "Long Term", "General"]),
  locations: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
});

function serializeChannel(ch: IWhatsappChannel) {
  return {
    _id: String(ch._id),
    name: ch.name,
    channelType: ch.channelType || "guest",
    businessPortfolioId: ch.businessPortfolioId || "",
    businessPortfolioName: ch.businessPortfolioName || "",
    wabaId: ch.wabaId || "",
    wabaName: ch.wabaName || "",
    phoneNumberId: ch.phoneNumberId,
    displayPhoneNumber: ch.displayPhoneNumber || "",
    hasAccessToken: Boolean(ch.accessToken),
    rentalType: ch.rentalType,
    assignedLocations: ch.assignedLocations || [],
    active: ch.active,
    assignedAt: ch.assignedAt,
    endedAt: ch.endedAt ?? null,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = (await getDataFromToken(req)) as AuthToken;
    const guard = requireChannelAdmin(token);
    if (guard) return guard;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid channel id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = migrateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    await connectDb();

    const existing = await WhatsappChannel.findById(id).lean<IWhatsappChannel | null>();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    const nextLocationKeys = normalizeChannelLocationKeys(data.locations);

    // Pre-validate uniqueness for the new identity (exclude current channel since it will be deactivated).
    await assertChannelTripleUnique({
      rentalType: data.rentalType,
      channelType: data.channelType,
      assignedLocationKeys: nextLocationKeys,
      excludeChannelId: id,
    });

    const now = new Date();

    // Step 1: Deactivate the current channel. Conversations keep their frozen snapshot.
    const deactivated = await deactivateChannel(id);
    if (!deactivated) {
      return NextResponse.json({ success: false, error: "Failed to deactivate existing channel" }, { status: 500 });
    }

    // Inherit access token from old channel when not provided.
    const resolvedToken =
      typeof data.accessToken === "string" && data.accessToken.trim()
        ? data.accessToken.trim()
        : existing.accessToken || "";

    // Step 2: Create the replacement channel with a new _id and full assignment rows.
    const newChannel = await createChannelWithAssignment({
      name: data.name,
      channelType: data.channelType,
      businessPortfolioId: data.businessPortfolioId,
      businessPortfolioName: data.businessPortfolioName,
      wabaId: data.wabaId,
      wabaName: data.wabaName,
      phoneNumberId: data.phoneNumberId,
      displayPhoneNumber: data.displayPhoneNumber,
      accessToken: resolvedToken,
      rentalType: data.rentalType,
      assignedLocations: nextLocationKeys,
      active: true,
      metadata: data.metadata,
      assignedAt: now,
    });

    return NextResponse.json({
      success: true,
      deactivated: serializeChannel(deactivated),
      channel: serializeChannel(newChannel),
    });
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500;
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to migrate channel" },
      { status },
    );
  }
}
