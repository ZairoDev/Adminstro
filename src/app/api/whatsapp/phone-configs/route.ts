import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import {
  WHATSAPP_PHONE_CONFIGS,
  WHATSAPP_BUSINESS_ACCOUNT_ID,
  FULL_ACCESS_ROLES,
  getAllowedPhoneConfigs,
  getRetargetPhoneId,
  type WhatsAppPhoneConfig,
} from "@/lib/whatsapp/config";
import { normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import {
  getAllPhoneLocationConfigs,
  resolveUserAllowedPhoneIds,
} from "@/lib/whatsapp/phoneAreaConfigService";
import WhatsappChannel from "@/models/whatsappChannel";
import WhatsAppConversation from "@/models/whatsappConversation";

// Force dynamic rendering since we use request.cookies for authentication
export const dynamic = 'force-dynamic';

// NOTE: This endpoint no longer filters Meta-fetched configs because we no longer
// fetch phone lists from Meta here (no env fallback). Role/area filtering is
// applied directly via getAllowedPhoneConfigs + DB channel visibility.

/**
 * GET /api/whatsapp/phone-configs
 * 
 * Fetch phone configs independently of conversations.
 * 
 * Data Ownership:
 * - Meta API: Source of truth for phone number existence and metadata
 * - config.ts: Source of truth for enabled numbers, locations, and role permissions
 * 
 * Returns phone configs that exist in BOTH Meta and config.ts, filtered by user role/area.
 */
type ChannelPhoneConfig = WhatsAppPhoneConfig & { channelId?: string };

function channelRowsToPhoneConfigs(
  channels: Array<{
    _id?: unknown;
    phoneNumberId?: string;
    displayPhoneNumber?: string;
    name?: string;
    wabaName?: string;
    wabaId?: string;
    assignedLocations?: string[];
  }>,
): ChannelPhoneConfig[] {
  return channels
    .filter((ch) => ch.phoneNumberId?.trim())
    .map((ch) => ({
      phoneNumberId: ch.phoneNumberId!.trim(),
      displayNumber: ch.displayPhoneNumber?.trim() || ch.phoneNumberId!.trim(),
      displayName: ch.name?.trim() || ch.wabaName?.trim() || "WhatsApp Channel",
      area:
        ch.assignedLocations && ch.assignedLocations.length > 0
          ? (ch.assignedLocations as WhatsAppPhoneConfig["area"])
          : ("all" as const),
      businessAccountId: ch.wabaId?.trim() || WHATSAPP_BUSINESS_ACCOUNT_ID,
      channelId: ch._id ? String(ch._id) : undefined,
    }));
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = token.role || "";
    
    // Normalize userAreas - handle string, array, or comma-separated string
    // This ensures consistent behavior between local and production environments
    let userAreas: string[] = [];
    if (token.allotedArea) {
      if (Array.isArray(token.allotedArea)) {
        userAreas = token.allotedArea.map((a: any) => String(a).trim()).filter(Boolean);
      } else if (typeof token.allotedArea === 'string') {
        // Handle comma-separated string (e.g., "athens,thessaloniki") or single string
        userAreas = token.allotedArea.split(',').map((a: any) => a.trim()).filter(Boolean);
      }
    }

    // Debug logging to help diagnose differences between local and production


    // No Meta fetch here: channels admin + DB mappings are the source of truth.
    // Area mapping: DB is source of truth; config.ts is fallback via service
    const dbPhoneLocations = await getAllPhoneLocationConfigs();
    const areaMapping = new Map<string, string | string[]>();
    for (const row of dbPhoneLocations) {
      if (row.locations.length > 0) {
        areaMapping.set(
          row.phoneNumberId,
          row.locations.map((loc) => loc.locationKey)
        );
      }
    }
    WHATSAPP_PHONE_CONFIGS.forEach((config) => {
      if (config.phoneNumberId && !areaMapping.has(config.phoneNumberId)) {
        areaMapping.set(config.phoneNumberId, config.area);
      }
    });

    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);

    // Staff: legacy configs only (role/area gated) + allowed channel rows.
    // Full-access: all channel rows + legacy configs (for display labels).
    let allowedPhoneConfigs = isFullAccess
      ? (WHATSAPP_PHONE_CONFIGS.filter((c) => c.phoneNumberId) as ChannelPhoneConfig[])
      : (getAllowedPhoneConfigs(userRole, userAreas) as ChannelPhoneConfig[]);

    // Advert role: grant access to retarget phone only (for retarget WhatsApp inbox)
    if (allowedPhoneConfigs.length === 0 && userRole === "Advert") {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        const retargetConfig = allowedPhoneConfigs.find(
          (c: any) => c.phoneNumberId === retargetPhoneId
        );
        if (retargetConfig) {
          allowedPhoneConfigs = [retargetConfig];
        }
      }
    }

    // Merge WhatsappChannel admin phones (multi-portfolio) not listed in legacy .env.
    const channelFilter = isFullAccess
      ? {}
      : {
          active: true,
          phoneNumberId: {
            $in: await resolveUserAllowedPhoneIds(userRole, userAreas),
          },
        };
    const channelRows = await WhatsappChannel.find(channelFilter)
      .select("_id phoneNumberId displayPhoneNumber name wabaName wabaId assignedLocations")
      .lean();
    const channelConfigs = channelRowsToPhoneConfigs(channelRows);
    const mergedByPhone = new Map<string, ChannelPhoneConfig & { locations?: unknown[] }>();
    for (const config of allowedPhoneConfigs) {
      if (config.phoneNumberId) mergedByPhone.set(config.phoneNumberId, config as ChannelPhoneConfig);
    }
    for (const config of channelConfigs) {
      const existing = mergedByPhone.get(config.phoneNumberId);
      if (!existing) {
        mergedByPhone.set(config.phoneNumberId, config);
      } else if (!existing.channelId && config.channelId) {
        // Backfill channelId onto legacy env-sourced configs if a DB channel row exists.
        mergedByPhone.set(config.phoneNumberId, { ...existing, channelId: config.channelId });
      }
    }

    // Full-access: include active conversations on lines missing from Meta/channels
    // (migrated numbers, legacy env drift, channels with no assignedLocations).
    if (isFullAccess) {
      const knownPhoneIds = [...mergedByPhone.keys()].filter(Boolean);
      const orphanPhoneIds = (await WhatsAppConversation.distinct("businessPhoneId", {
        businessPhoneId: {
          $exists: true,
          $nin: ["", "internal-you", ...knownPhoneIds],
        },
        source: { $ne: "internal" },
        status: "active",
      })) as string[];

      for (const phoneNumberId of orphanPhoneIds) {
        const trimmed = phoneNumberId?.trim();
        if (!trimmed || mergedByPhone.has(trimmed)) continue;
        mergedByPhone.set(trimmed, {
          phoneNumberId: trimmed,
          displayNumber: trimmed,
          displayName: "Unconfigured line",
          area: "all",
          businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
        });
      }
    }

    allowedPhoneConfigs = Array.from(mergedByPhone.values()) as ChannelPhoneConfig[];

    // Attach full location entries for clients (display + key)
    const locationsByPhone = new Map(
      dbPhoneLocations.map((row) => [row.phoneNumberId, row.locations])
    );
    for (const channel of channelRows) {
      if (!channel.phoneNumberId) continue;
      const fromChannel = (channel.assignedLocations || []).map((key) => ({
        displayName: toDisplayCity(String(key)),
        locationKey: normalizeCityKey(String(key)),
      }));
      const existing = locationsByPhone.get(channel.phoneNumberId) ?? [];
      locationsByPhone.set(channel.phoneNumberId, [...existing, ...fromChannel]);
    }

    allowedPhoneConfigs = allowedPhoneConfigs.map((config) => ({
      ...config,
      locations: config.phoneNumberId
        ? locationsByPhone.get(config.phoneNumberId) ?? []
        : [],
    })) as unknown as ChannelPhoneConfig[];

    return NextResponse.json({
      success: true,
      phoneConfigs: allowedPhoneConfigs,
    });
  } catch (error: any) {
    console.error("Get phone configs error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
