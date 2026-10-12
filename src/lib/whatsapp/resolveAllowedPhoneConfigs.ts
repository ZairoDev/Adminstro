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
  getAccessibleChannelIds,
  resolveUserAllowedPhoneIds,
} from "@/lib/whatsapp/phoneAreaConfigService";
import WhatsappChannel from "@/models/whatsappChannel";
import WhatsAppConversation from "@/models/whatsappConversation";

export type ChannelPhoneConfig = WhatsAppPhoneConfig & {
  channelId?: string;
  locations?: Array<{ displayName: string; locationKey: string }>;
};

type PhoneLocationEntry = { displayName: string; locationKey: string };

export function normalizeUserAreas(allotedArea: unknown): string[] {
  if (!allotedArea) return [];
  if (Array.isArray(allotedArea)) {
    return allotedArea.map((a) => String(a).trim()).filter(Boolean);
  }
  if (typeof allotedArea === "string") {
    return allotedArea.split(",").map((a) => a.trim()).filter(Boolean);
  }
  return [];
}

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

export type ResolveAllowedPhoneConfigsOptions = {
  /** Include lines found only in active conversations (SuperAdmin drift recovery). */
  includeOrphanConversations?: boolean;
  /** When true, only active WhatsappChannel rows are merged (health dashboard). */
  activeChannelsOnly?: boolean;
};

/**
 * Resolve phone configs visible to a user — DB channels + legacy env, same as /api/whatsapp/phone-configs.
 */
export async function resolveAllowedPhoneConfigs(
  userRole: string,
  userAreas: string[] = [],
  options: ResolveAllowedPhoneConfigsOptions = {},
): Promise<ChannelPhoneConfig[]> {
  const { includeOrphanConversations = false, activeChannelsOnly = false } = options;
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);

  let allowedPhoneConfigs: ChannelPhoneConfig[] = isFullAccess
    ? WHATSAPP_PHONE_CONFIGS.filter((c) => c.phoneNumberId && !c.isInternal)
    : getAllowedPhoneConfigs(userRole, userAreas).filter((c) => !c.isInternal);

  if (allowedPhoneConfigs.length === 0 && userRole === "Advert") {
    const retargetPhoneId = getRetargetPhoneId();
    if (retargetPhoneId) {
      const retargetConfig = WHATSAPP_PHONE_CONFIGS.find(
        (c) => c.phoneNumberId === retargetPhoneId,
      );
      if (retargetConfig) {
        allowedPhoneConfigs = [retargetConfig];
      }
    }
  }

  const channelFilter = isFullAccess
    ? activeChannelsOnly
      ? { active: true }
      : {}
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
  const mergedByPhone = new Map<string, ChannelPhoneConfig>();

  for (const config of channelConfigs) {
    mergedByPhone.set(config.phoneNumberId, config);
  }

  const useLegacyFallback = !activeChannelsOnly || channelConfigs.length === 0;
  if (useLegacyFallback) {
    for (const config of allowedPhoneConfigs) {
      if (!config.phoneNumberId) continue;
      const existing = mergedByPhone.get(config.phoneNumberId);
      if (!existing) {
        mergedByPhone.set(config.phoneNumberId, config);
      } else if (!existing.channelId && config.channelId) {
        mergedByPhone.set(config.phoneNumberId, { ...existing, channelId: config.channelId });
      }
    }
  }

  if (includeOrphanConversations && isFullAccess) {
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

  const dbPhoneLocations = await getAllPhoneLocationConfigs();
  const locationsByPhone = new Map(
    dbPhoneLocations.map((row) => [row.phoneNumberId, row.locations]),
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

  return Array.from(mergedByPhone.values()).map((config) => ({
    ...config,
    locations: config.phoneNumberId
      ? locationsByPhone.get(config.phoneNumberId) ?? []
      : [],
  }));
}

function dedupeLocationEntries(
  entries: Array<{ displayName: string; locationKey: string }>,
): Array<{ displayName: string; locationKey: string }> {
  const seen = new Set<string>();
  const out: Array<{ displayName: string; locationKey: string }> = [];
  for (const entry of entries) {
    const key = normalizeCityKey(entry.locationKey || entry.displayName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      displayName: toDisplayCity(entry.displayName || key),
      locationKey: key,
    });
  }
  return out;
}

export type AllottedChannelPhone = ChannelPhoneConfig & {
  accessToken?: string;
};

/**
 * Active WhatsappChannel rows the user may access — unique by phoneNumberId only.
 * No legacy env IDs, no orphan conversation lines.
 */
export async function resolveAllottedChannelPhones(
  userRole: string,
  userAreas: string[] = [],
  userRentalType?: unknown,
): Promise<AllottedChannelPhone[]> {
  const accessibleChannelIds = await getAccessibleChannelIds(
    userRole,
    userAreas,
    userRentalType,
  );
  if (accessibleChannelIds.length === 0) return [];

  const channelRows = await WhatsappChannel.find({
    _id: { $in: accessibleChannelIds },
    active: true,
    phoneNumberId: { $exists: true, $ne: "" },
  })
    .select("_id phoneNumberId displayPhoneNumber name wabaName wabaId assignedLocations accessToken")
    .lean();

  const byPhoneId = new Map<string, AllottedChannelPhone & { locations: PhoneLocationEntry[] }>();

  for (const row of channelRows) {
    const phoneNumberId = row.phoneNumberId?.trim();
    if (!phoneNumberId) continue;

    const fromChannel = (row.assignedLocations || []).map((key) => ({
      displayName: toDisplayCity(String(key)),
      locationKey: normalizeCityKey(String(key)),
    }));

    const existing = byPhoneId.get(phoneNumberId);
    if (!existing) {
      byPhoneId.set(phoneNumberId, {
        phoneNumberId,
        displayNumber: row.displayPhoneNumber?.trim() || phoneNumberId,
        displayName: row.name?.trim() || row.wabaName?.trim() || "WhatsApp Channel",
        area:
          row.assignedLocations && row.assignedLocations.length > 0
            ? (row.assignedLocations as WhatsAppPhoneConfig["area"])
            : ("all" as const),
        businessAccountId: row.wabaId?.trim() || WHATSAPP_BUSINESS_ACCOUNT_ID,
        channelId: row._id ? String(row._id) : undefined,
        accessToken: row.accessToken?.trim() || undefined,
        locations: dedupeLocationEntries(fromChannel),
      });
      continue;
    }

    byPhoneId.set(phoneNumberId, {
      ...existing,
      accessToken: existing.accessToken || row.accessToken?.trim() || undefined,
      locations: dedupeLocationEntries([...existing.locations, ...fromChannel]),
    });
  }

  return Array.from(byPhoneId.values());
}
