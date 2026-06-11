import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsappChannel, { IWhatsappChannel } from "@/models/whatsappChannel";
import {
  assertChannelTripleUnique,
  normalizeChannelLocationKeys,
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

const createChannelSchema = z.object({
  name: z.string().trim().min(1, "Channel name is required"),
  channelType: z.enum(["guest", "owner", "support", "backup"]),
  businessPortfolioId: z.string().trim().default(""),
  businessPortfolioName: z.string().trim().default(""),
  wabaId: z.string().trim().default(""),
  wabaName: z.string().trim().default(""),
  phoneNumberId: z.string().trim().min(1, "Phone Number ID is required"),
  displayPhoneNumber: z.string().trim().default(""),
  accessToken: z.string().trim().default(""),
  rentalType: z.enum(["Short Term", "Long Term", "General"]),
  locations: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

/** Strip secrets before returning channels to the client. */
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

export async function GET(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as AuthToken;
    const guard = requireChannelAdmin(token);
    if (guard) return guard;

    await connectDb();
    const channels = await WhatsappChannel.find({})
      .sort({ createdAt: -1 })
      .lean<IWhatsappChannel[]>();

    return NextResponse.json({
      success: true,
      channels: channels.map(serializeChannel),
    });
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500;
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to load channels" },
      { status },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as AuthToken;
    const guard = requireChannelAdmin(token);
    if (guard) return guard;

    const body = await req.json();
    const parsed = createChannelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const assignedLocations = normalizeChannelLocationKeys(data.locations);

    await connectDb();

    // Pre-check uniqueness (DB partial unique index is the hard guard, this gives friendlier error).
    if (data.active) {
      await assertChannelTripleUnique({
        rentalType: data.rentalType,
        channelType: data.channelType,
        assignedLocationKeys: assignedLocations,
      });
    }

    const channel = await createChannelWithAssignment({
      name: data.name,
      channelType: data.channelType,
      businessPortfolioId: data.businessPortfolioId,
      businessPortfolioName: data.businessPortfolioName,
      wabaId: data.wabaId,
      wabaName: data.wabaName,
      phoneNumberId: data.phoneNumberId,
      displayPhoneNumber: data.displayPhoneNumber,
      accessToken: data.accessToken,
      rentalType: data.rentalType,
      assignedLocations,
      active: data.active,
      metadata: data.metadata,
    });

    return NextResponse.json(
      { success: true, channel: serializeChannel(channel) },
      { status: 201 },
    );
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500;
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Failed to create channel" },
      { status },
    );
  }
}
