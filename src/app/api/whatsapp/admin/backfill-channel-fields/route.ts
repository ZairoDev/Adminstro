import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsappChannel from "@/models/whatsappChannel";
import { normalizeStoredWabaId } from "@/lib/whatsapp/channelService";
import { DEFAULT_CONVERSATION_RENTAL_TYPE } from "@/lib/whatsapp/rentalTypeAccess";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["SuperAdmin", "Developer"];

/**
 * POST /api/whatsapp/admin/backfill-channel-fields
 *
 * Phase 6.5 — Mandatory gate before enabling new outbound routing.
 *
 * For every meta conversation that is missing any of the channel snapshot fields
 * (whatsappChannelId, channelType, businessPortfolioId, wabaId), this script:
 *   1. Resolves the WhatsappChannel by businessPhoneId (active or historical).
 *   2. Stamps the frozen snapshot fields on the conversation.
 *   3. Also backfills rentalType when missing (defaults to Long Term).
 *   4. When no channel exists, infers channelType from conversationType as fallback.
 *
 * Idempotent — only touches rows that are still missing fields.
 * Run this before setting WHATSAPP_CHANNEL_ROUTING_ENABLED=true.
 *
 * Supports:
 *   ?dryRun=true  — report counts without writing (default: false)
 *   ?batchSize=N  — conversations per batch (default: 100, max 500)
 */
export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as { role?: unknown } | null;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(String(token.role ?? ""))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const dryRun = params.get("dryRun") === "true";
    const batchSize = Math.min(500, Math.max(1, parseInt(params.get("batchSize") || "100")));

    await connectDb();

    // Pre-load all channels indexed by phoneNumberId for fast lookup.
    const allChannels = await WhatsappChannel.find({})
      .select("_id channelType phoneNumberId rentalType businessPortfolioId wabaId active")
      .lean();

    // Prefer active channel; fall back to most recently created inactive one.
    const channelByPhoneId = new Map<string, typeof allChannels[0]>();
    for (const ch of allChannels) {
      const existing = channelByPhoneId.get(ch.phoneNumberId);
      if (!existing || (!existing.active && ch.active)) {
        channelByPhoneId.set(ch.phoneNumberId, ch);
      }
    }

    // Find conversations missing any channel field.
    const missingFilter = {
      source: { $ne: "internal" },
      $or: [
        { whatsappChannelId: { $exists: false } },
        { whatsappChannelId: null },
        { channelType: { $exists: false } },
        { channelType: null },
      ],
    };

    const total = await WhatsAppConversation.countDocuments(missingFilter);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        total,
        channelsLoaded: allChannels.length,
        message: `Dry run: ${total} conversations would be processed.`,
      });
    }

    let processed = 0;
    let matched = 0;
    let skipped = 0; // no channel found

    const cursor = WhatsAppConversation.find(missingFilter)
      .select("_id businessPhoneId conversationType rentalType whatsappChannelId channelType")
      .batchSize(batchSize)
      .cursor();

    const bulkOps: object[] = [];

    for await (const conv of cursor) {
      processed++;

      const channel = conv.businessPhoneId
        ? channelByPhoneId.get(conv.businessPhoneId)
        : undefined;

      if (channel) {
        const update: Record<string, unknown> = {
          whatsappChannelId: channel._id,
          channelType: channel.channelType,
          businessPortfolioId: channel.businessPortfolioId || undefined,
          wabaId:
            normalizeStoredWabaId(channel.wabaId, channel.businessPortfolioId) ||
            undefined,
        };
        if (!conv.rentalType) {
          update.rentalType = channel.rentalType || DEFAULT_CONVERSATION_RENTAL_TYPE;
        }
        bulkOps.push({
          updateOne: {
            filter: { _id: conv._id },
            update: { $set: update },
          },
        });
        matched++;
      } else {
        // No channel record — infer channelType from conversationType as fallback.
        const inferredChannelType =
          conv.conversationType === "owner" ? "owner" : "guest";
        const update: Record<string, unknown> = {
          channelType: inferredChannelType,
        };
        if (!conv.rentalType) {
          update.rentalType = DEFAULT_CONVERSATION_RENTAL_TYPE;
        }
        bulkOps.push({
          updateOne: {
            filter: { _id: conv._id },
            update: { $set: update },
          },
        });
        skipped++;
      }

      // Flush every batchSize operations.
      if (bulkOps.length >= batchSize) {
        await WhatsAppConversation.bulkWrite(bulkOps as Parameters<typeof WhatsAppConversation.bulkWrite>[0]);
        bulkOps.length = 0;
      }
    }

    // Flush remaining ops.
    if (bulkOps.length > 0) {
      await WhatsAppConversation.bulkWrite(bulkOps as Parameters<typeof WhatsAppConversation.bulkWrite>[0]);
    }

    return NextResponse.json({
      success: true,
      total,
      processed,
      matchedChannel: matched,
      inferredOnly: skipped,
      message: `Backfill complete. ${matched} stamped from channel; ${skipped} inferred from conversationType.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Backfill failed" },
      { status: 500 },
    );
  }
}

/** GET returns current counts without modifying data. */
export async function GET(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as { role?: unknown } | null;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(String(token.role ?? ""))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const [total, missingChannel, missingChannelType, missingRentalType] = await Promise.all([
      WhatsAppConversation.countDocuments({ source: { $ne: "internal" } }),
      WhatsAppConversation.countDocuments({
        source: { $ne: "internal" },
        $or: [{ whatsappChannelId: { $exists: false } }, { whatsappChannelId: null }],
      }),
      WhatsAppConversation.countDocuments({
        source: { $ne: "internal" },
        $or: [{ channelType: { $exists: false } }, { channelType: null }],
      }),
      WhatsAppConversation.countDocuments({
        source: { $ne: "internal" },
        $or: [{ rentalType: { $exists: false } }, { rentalType: null }, { rentalType: "" }],
      }),
    ]);

    const ready = missingChannel === 0 && missingChannelType === 0;

    return NextResponse.json({
      success: true,
      total,
      missingChannel,
      missingChannelType,
      missingRentalType,
      ready,
      message: ready
        ? "All conversations have channel fields. Safe to enable WHATSAPP_CHANNEL_ROUTING_ENABLED."
        : `${Math.max(missingChannel, missingChannelType)} conversations still need backfill.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Status check failed" },
      { status: 500 },
    );
  }
}
