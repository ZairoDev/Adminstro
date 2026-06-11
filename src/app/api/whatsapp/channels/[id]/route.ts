import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsappChannel, { IWhatsappChannel } from "@/models/whatsappChannel";
import WhatsappChannelAssignment from "@/models/whatsappChannelAssignment";
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
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const role = String((token as { role?: unknown }).role ?? "");
  if (!CHANNEL_ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Fields that are safe to edit in-place (do not change routing identity).
 * Changing phoneNumberId, wabaId, businessPortfolioId, channelType, or rentalType
 * is a MIGRATE operation — it creates a new channel row and deactivates this one.
 */
const editChannelSchema = z.object({
  name: z.string().trim().min(1).optional(),
  displayPhoneNumber: z.string().trim().optional(),
  accessToken: z.string().optional(),
  locations: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  // businessPortfolioName and wabaName are labels, not identity — editable in place
  businessPortfolioName: z.string().trim().optional(),
  wabaName: z.string().trim().optional(),
});

/**
 * Fields that change routing identity — require a migrate operation.
 * These cannot be PATCHed in-place to preserve conversation history integrity.
 */
const migrateChannelSchema = z.object({
  name: z.string().trim().min(1),
  channelType: z.enum(["guest", "owner", "support", "backup"]),
  businessPortfolioId: z.string().trim().min(1),
  businessPortfolioName: z.string().trim().optional().default(""),
  wabaId: z.string().trim().min(1),
  wabaName: z.string().trim().optional().default(""),
  phoneNumberId: z.string().trim().min(1),
  displayPhoneNumber: z.string().trim().optional().default(""),
  accessToken: z.string().optional(),
  rentalType: z.enum(["Short Term", "Long Term", "General"]),
  locations: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
});

function serializeChannel(channel: IWhatsappChannel) {
  return {
    _id: String(channel._id),
    name: channel.name,
    channelType: channel.channelType || "guest",
    businessPortfolioId: channel.businessPortfolioId || "",
    businessPortfolioName: channel.businessPortfolioName || "",
    wabaId: channel.wabaId || "",
    wabaName: channel.wabaName || "",
    phoneNumberId: channel.phoneNumberId,
    displayPhoneNumber: channel.displayPhoneNumber || "",
    hasAccessToken: Boolean(channel.accessToken),
    rentalType: channel.rentalType,
    assignedLocations: channel.assignedLocations || [],
    active: channel.active,
    assignedAt: channel.assignedAt,
    endedAt: channel.endedAt ?? null,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
}

/**
 * PATCH /api/whatsapp/channels/[id]
 *
 * Safe edits only: name, displayPhoneNumber, accessToken, locations, active,
 * businessPortfolioName, wabaName, metadata.
 *
 * Changing routing identity fields (phoneNumberId, wabaId, businessPortfolioId,
 * channelType, rentalType) requires POST to /api/whatsapp/channels/[id]/migrate
 * which deactivates this channel and creates a versioned replacement.
 */
export async function PATCH(
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

    // Detect if caller is trying to change identity fields — reject with guidance.
    const identityFields = ["phoneNumberId", "wabaId", "businessPortfolioId", "channelType", "rentalType"];
    const attempted = identityFields.filter((f) => f in body);
    if (attempted.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot change routing identity fields (${attempted.join(", ")}) via PATCH. Use the migrate endpoint (POST /api/whatsapp/channels/${id}/migrate) to create a versioned replacement channel.`,
          hint: "migrate",
        },
        { status: 422 },
      );
    }

    const parsed = editChannelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    await connectDb();
    const existing = await WhatsappChannel.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    const nextLocationKeys =
      data.locations !== undefined
        ? normalizeChannelLocationKeys(data.locations)
        : existing.assignedLocations || [];
    const nextActive = data.active ?? existing.active;
    const locationsChanged = data.locations !== undefined;

    // If locations change on an active channel, re-validate uniqueness.
    if (locationsChanged && nextActive) {
      await assertChannelTripleUnique({
        rentalType: existing.rentalType,
        channelType: existing.channelType,
        assignedLocationKeys: nextLocationKeys,
        excludeChannelId: id,
      });
    }

    const wasActive = existing.active;
    const becomingInactive = wasActive && nextActive === false;
    const becomingActive = !wasActive && nextActive === true;

    if (data.name !== undefined) existing.name = data.name;
    if (data.displayPhoneNumber !== undefined) existing.displayPhoneNumber = data.displayPhoneNumber;
    if (typeof data.accessToken === "string" && data.accessToken.trim()) {
      existing.accessToken = data.accessToken.trim();
    }
    if (data.locations !== undefined) existing.assignedLocations = nextLocationKeys;
    if (data.active !== undefined) existing.active = data.active;
    if (data.metadata !== undefined) {
      existing.metadata = data.metadata as Record<string, unknown>;
    }
    if (data.businessPortfolioName !== undefined) existing.businessPortfolioName = data.businessPortfolioName;
    if (data.wabaName !== undefined) existing.wabaName = data.wabaName;

    const now = new Date();

    if (becomingInactive && !existing.endedAt) {
      existing.endedAt = now;
    }
    if (becomingActive) {
      existing.endedAt = null;
      existing.assignedAt = now;
    }

    await existing.save();

    // Sync assignment rows.
    if (becomingInactive) {
      await WhatsappChannelAssignment.updateMany(
        { channelId: existing._id, endedAt: null },
        { endedAt: now },
      );
    } else if (becomingActive && nextLocationKeys.length > 0) {
      await WhatsappChannelAssignment.updateMany(
        { channelId: existing._id },
        { endedAt: now },
      );
      const assignmentDocs = nextLocationKeys.map((locationKey) => ({
        channelId: existing._id,
        locationKey,
        rentalType: existing.rentalType,
        channelType: existing.channelType,
        assignedAt: now,
        endedAt: null,
      }));
      await WhatsappChannelAssignment.insertMany(assignmentDocs);
    } else if (locationsChanged && nextActive) {
      // Location set changed — sync assignment rows.
      await WhatsappChannelAssignment.updateMany(
        { channelId: existing._id, endedAt: null },
        { endedAt: now },
      );
      if (nextLocationKeys.length > 0) {
        const assignmentDocs = nextLocationKeys.map((locationKey) => ({
          channelId: existing._id,
          locationKey,
          rentalType: existing.rentalType,
          channelType: existing.channelType,
          assignedAt: now,
          endedAt: null,
        }));
        await WhatsappChannelAssignment.insertMany(assignmentDocs);
      }
    }

    return NextResponse.json({ success: true, channel: serializeChannel(existing) });
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500;
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to update channel" },
      { status },
    );
  }
}

export async function DELETE(
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

    await connectDb();
    const now = new Date();

    // Soft-disable instead of hard delete to preserve routing history.
    const channel = await WhatsappChannel.findByIdAndUpdate(
      id,
      { active: false, endedAt: now },
      { new: true },
    ).lean<IWhatsappChannel | null>();

    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    // Close assignment rows.
    await WhatsappChannelAssignment.updateMany(
      { channelId: new mongoose.Types.ObjectId(id), endedAt: null },
      { endedAt: now },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500;
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to delete channel" },
      { status },
    );
  }
}
