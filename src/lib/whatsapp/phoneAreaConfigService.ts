import { normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import {
  WHATSAPP_PHONE_CONFIGS,
  FULL_ACCESS_ROLES,
  getAllowedPhoneIds,
  type WhatsAppPhoneConfig,
} from "@/lib/whatsapp/config";
import WhatsappChannel, { type IWhatsappChannel } from "@/models/whatsappChannel";
import {
  isDualRentalWhatsAppRole,
  resolveWhatsAppEmployeeRentalType,
} from "@/lib/whatsapp/rentalTypeAccess";
import WhatsAppPhoneAreaConfig, {
  type IPhoneLocationEntry,
} from "@/models/whatsappPhoneAreaConfig";
import { resolveLocationsAgainstMonthlyTargets } from "@/lib/monthly-target-locations";

const CACHE_TTL_MS = 30_000;

type PhoneLocationsMap = Map<string, IPhoneLocationEntry[]>;

type PhoneAreaConfigLean = {
  phoneNumberId?: string;
  locations?: IPhoneLocationEntry[];
};

let cache: { map: PhoneLocationsMap; expiresAt: number } | null = null;

function staticAreasForPhone(phoneNumberId: string): IPhoneLocationEntry[] {
  const config = WHATSAPP_PHONE_CONFIGS.find((c) => c.phoneNumberId === phoneNumberId);
  if (!config?.phoneNumberId) return [];

  const areas = Array.isArray(config.area) ? config.area : [config.area];
  return areas
    .filter((a) => a && a !== "all")
    .map((area) => ({
      displayName: toDisplayCity(area.charAt(0).toUpperCase() + area.slice(1)),
      locationKey: normalizeCityKey(area),
    }));
}

function dedupeLocations(entries: IPhoneLocationEntry[]): IPhoneLocationEntry[] {
  const seen = new Set<string>();
  const out: IPhoneLocationEntry[] = [];
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

export function parseLocationEntriesFromInput(
  raw: unknown
): IPhoneLocationEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: IPhoneLocationEntry[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      const displayName = toDisplayCity(item);
      entries.push({
        displayName,
        locationKey: normalizeCityKey(displayName),
      });
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as { displayName?: unknown; locationKey?: unknown };
      const display =
        typeof obj.displayName === "string" ? toDisplayCity(obj.displayName) : "";
      const key =
        typeof obj.locationKey === "string"
          ? normalizeCityKey(obj.locationKey)
          : display
            ? normalizeCityKey(display)
            : "";
      if (display && key) {
        entries.push({ displayName: display, locationKey: key });
      }
    }
  }
  return dedupeLocations(entries);
}

export async function invalidatePhoneAreaCache(): Promise<void> {
  cache = null;
}

async function loadPhoneLocationsMap(): Promise<PhoneLocationsMap> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.map;
  }

  const docs = await WhatsAppPhoneAreaConfig.find({}).lean();
  const map: PhoneLocationsMap = new Map();

  for (const doc of docs) {
    if (!doc.phoneNumberId) continue;
    map.set(
      doc.phoneNumberId,
      dedupeLocations((doc.locations || []) as IPhoneLocationEntry[])
    );
  }

  // Fallback: env/static config when DB has no row for a known phone
  for (const config of WHATSAPP_PHONE_CONFIGS) {
    if (!config.phoneNumberId || config.isInternal) continue;
    if (!map.has(config.phoneNumberId) || map.get(config.phoneNumberId)!.length === 0) {
      map.set(config.phoneNumberId, staticAreasForPhone(config.phoneNumberId));
    }
  }

  // Multi-portfolio channels: register phone lines from WhatsappChannel admin
  // so inbox visibility, notifications, and send access include channel-only phones.
  const channels = await WhatsappChannel.find({})
    .select("phoneNumberId assignedLocations active")
    .lean<IWhatsappChannel[]>();

  for (const channel of channels) {
    const phoneId = channel.phoneNumberId?.trim();
    if (!phoneId) continue;

    const fromChannel = (channel.assignedLocations || [])
      .map((key) => {
        const locationKey = normalizeCityKey(String(key));
        if (!locationKey) return null;
        return {
          displayName: toDisplayCity(String(key)),
          locationKey,
        };
      })
      .filter((entry): entry is IPhoneLocationEntry => Boolean(entry));

    const existing = map.get(phoneId) ?? [];
    map.set(phoneId, dedupeLocations([...existing, ...fromChannel]));
  }

  cache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

const UNALLOCATED_AREA_USES_ALL_LINES: readonly string[] = [
  "Sales",
  "sales-intern",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
];

/** Merge static config phone access with DB-assigned locations per phone line. */
function phoneIdsFromLocationsMap(
  map: PhoneLocationsMap,
  userRole: string,
  userAreas: string[],
): string[] {
  const staticIds = getAllowedPhoneIds(userRole, userAreas);
  const userKeys = userAreas.map((a) => normalizeCityKey(a)).filter(Boolean);
  const dbIds: string[] = [];

  for (const [phoneNumberId, locations] of map.entries()) {
    if (!phoneNumberId) continue;
    if (userKeys.length === 0) {
      if (UNALLOCATED_AREA_USES_ALL_LINES.includes(userRole)) {
        dbIds.push(phoneNumberId);
      }
    } else if (locations.some((loc) => userKeys.includes(loc.locationKey))) {
      dbIds.push(phoneNumberId);
    }
  }

  return [...new Set([...staticIds, ...dbIds].filter(Boolean))];
}

/** Sync helper — uses warmed cache when available, otherwise static config only. */
export function getPhoneIdsForUserAreasSync(
  userRole: string,
  userAreas: string[] = [],
): string[] {
  if (cache?.map) {
    return phoneIdsFromLocationsMap(cache.map, userRole, userAreas);
  }
  return getAllowedPhoneIds(userRole, userAreas);
}

/** DB-backed phone access — aligns with resolvePhoneIdForLocation. */
export async function resolveUserAllowedPhoneIds(
  userRole: string,
  userAreas: string[] = [],
): Promise<string[]> {
  const map = await loadPhoneLocationsMap();
  return phoneIdsFromLocationsMap(map, userRole, userAreas);
}

/**
 * Whether a user may send/receive on a business phone line.
 * Full-access roles may use any line (including channel-only phones not in
 * legacy phone-area config). Other roles also pass when an active
 * WhatsappChannel owns the phone and matches their area + rental type.
 */
export async function canUserAccessPhoneId(
  phoneNumberId: string,
  userRole: string,
  userAreas: string[] = [],
  opts: { userRentalType?: unknown } = {},
): Promise<boolean> {
  if (!phoneNumberId?.trim()) return false;

  if ((FULL_ACCESS_ROLES as readonly string[]).includes(userRole)) {
    return true;
  }

  const allowed = await resolveUserAllowedPhoneIds(userRole, userAreas);
  if (allowed.includes(phoneNumberId)) return true;

  const channel = (await WhatsappChannel.findOne({
    phoneNumberId: phoneNumberId.trim(),
    active: true,
  }).lean()) as IWhatsappChannel | null;
  if (!channel) return false;

  const userKeys = userAreas.map((a) => normalizeCityKey(a)).filter(Boolean);
  const channelLocations = channel.assignedLocations || [];

  const locationOk =
    userKeys.length === 0 ||
    UNALLOCATED_AREA_USES_ALL_LINES.includes(userRole) ||
    channelLocations.some((key) => userKeys.includes(key));

  if (!locationOk) return false;

  if (isDualRentalWhatsAppRole(userRole)) return true;

  const employeeRental = resolveWhatsAppEmployeeRentalType(opts.userRentalType);
  if (channel.rentalType === "General") return true;

  return channel.rentalType === employeeRental;
}

export async function getLocationsForPhone(
  phoneNumberId: string
): Promise<IPhoneLocationEntry[]> {
  const map = await loadPhoneLocationsMap();
  return map.get(phoneNumberId) ?? [];
}

export async function getAllPhoneLocationConfigs(): Promise<
  Array<{ phoneNumberId: string; locations: IPhoneLocationEntry[] }>
> {
  const map = await loadPhoneLocationsMap();
  const phoneIds = new Set<string>();
  for (const config of WHATSAPP_PHONE_CONFIGS) {
    if (config.phoneNumberId && !config.isInternal) {
      phoneIds.add(config.phoneNumberId);
    }
  }
  for (const id of map.keys()) {
    phoneIds.add(id);
  }

  return Array.from(phoneIds).map((phoneNumberId) => ({
    phoneNumberId,
    locations: map.get(phoneNumberId) ?? [],
  }));
}

/** Cities on any WhatsApp phone line (DB), intersected with Monthly Targets. */
export async function getConfiguredLocationDisplaysForWhatsApp(): Promise<string[]> {
  const { getMonthlyTargetCities } = await import("@/lib/monthly-target-locations");
  const monthlyKeys = new Set(
    (await getMonthlyTargetCities()).map((c) => normalizeCityKey(c))
  );

  const map = await loadPhoneLocationsMap();
  const seen = new Set<string>();
  const displays: string[] = [];

  for (const locations of map.values()) {
    for (const loc of locations) {
      if (!loc.locationKey || !monthlyKeys.has(loc.locationKey)) continue;
      if (seen.has(loc.locationKey)) continue;
      seen.add(loc.locationKey);
      displays.push(loc.displayName);
    }
  }

  return displays.sort((a, b) => a.localeCompare(b));
}

/** All assignable cities (any phone line), as display + key pairs. */
export async function getAllConfiguredLocationEntries(): Promise<
  IPhoneLocationEntry[]
> {
  const displays = await getConfiguredLocationDisplaysForWhatsApp();
  return displays.map((displayName) => ({
    displayName,
    locationKey: normalizeCityKey(displayName),
  }));
}

/** Whether this city exists on any WhatsApp phone line (Monthly Targets ∩ DB). */
export async function isLocationConfiguredForWhatsApp(
  location: string
): Promise<boolean> {
  const key = normalizeCityKey(location);
  if (!key) return false;
  const entries = await getAllConfiguredLocationEntries();
  return entries.some((loc) => loc.locationKey === key);
}

export async function resolvePhoneIdForLocation(
  location: string | undefined
): Promise<string | null> {
  if (!location?.trim()) return null;
  const key = normalizeCityKey(location);
  const map = await loadPhoneLocationsMap();

  for (const [phoneNumberId, locations] of map.entries()) {
    if (locations.some((loc) => loc.locationKey === key)) {
      return phoneNumberId;
    }
  }

  // Static fallback
  const staticConfig = WHATSAPP_PHONE_CONFIGS.find((c) => {
    if (!c.phoneNumberId) return false;
    const areas = Array.isArray(c.area) ? c.area : [c.area];
    return areas.some((a) => normalizeCityKey(String(a)) === key);
  });
  return staticConfig?.phoneNumberId || null;
}

export async function isLocationAllowedForPhone(
  phoneNumberId: string,
  location: string
): Promise<boolean> {
  const key = normalizeCityKey(location);
  if (!key) return false;
  const locations = await getLocationsForPhone(phoneNumberId);
  return locations.some((loc) => loc.locationKey === key);
}

export async function upsertPhoneLocations(
  phoneNumberId: string,
  locations: IPhoneLocationEntry[]
): Promise<IPhoneLocationEntry[]> {
  const normalized = dedupeLocations(locations);
  await WhatsAppPhoneAreaConfig.findOneAndUpdate(
    { phoneNumberId },
    { phoneNumberId, locations: normalized },
    { upsert: true, new: true }
  );
  await invalidatePhoneAreaCache();
  return normalized;
}

/** Seed DB rows from static config.ts for phones that have no DB record yet */
export async function seedPhoneLocationsFromStaticConfig(): Promise<{
  seeded: number;
  skipped: number;
}> {
  let seeded = 0;
  let skipped = 0;

  for (const config of WHATSAPP_PHONE_CONFIGS) {
    if (!config.phoneNumberId || config.isInternal) continue;

    const existing = (await WhatsAppPhoneAreaConfig.findOne({
      phoneNumberId: config.phoneNumberId,
    }).lean()) as PhoneAreaConfigLean | null;

    if (existing && (existing.locations?.length ?? 0) > 0) {
      skipped++;
      continue;
    }

    const locations = staticAreasForPhone(config.phoneNumberId);
    if (locations.length === 0) continue;

    await WhatsAppPhoneAreaConfig.findOneAndUpdate(
      { phoneNumberId: config.phoneNumberId },
      { phoneNumberId: config.phoneNumberId, locations },
      { upsert: true }
    );
    seeded++;
  }

  await invalidatePhoneAreaCache();
  return { seeded, skipped };
}

export type BulkPhoneLocationInput = {
  phoneNumberId: string;
  locations: unknown[];
};

export type BulkConfigureResult = {
  updated: Array<{ phoneNumberId: string; locations: IPhoneLocationEntry[] }>;
  skipped: Array<{ phoneNumberId: string; reason: string }>;
};

/**
 * Upsert locations for multiple phone lines in one operation.
 * Skips phones with empty phoneNumberId or unknown ids unless allowUnknownPhoneId.
 */
export async function bulkConfigurePhoneLocations(
  phones: BulkPhoneLocationInput[],
  options: { force?: boolean; allowUnknownPhoneId?: boolean } = {}
): Promise<BulkConfigureResult> {
  const { force = false, allowUnknownPhoneId = false } = options;
  const knownIds = new Set(
    WHATSAPP_PHONE_CONFIGS.filter((c) => c.phoneNumberId && !c.isInternal).map(
      (c) => c.phoneNumberId
    )
  );

  const updated: BulkConfigureResult["updated"] = [];
  const skipped: BulkConfigureResult["skipped"] = [];

  for (const row of phones) {
    const phoneNumberId = row.phoneNumberId?.trim();
    if (!phoneNumberId) {
      skipped.push({ phoneNumberId: "", reason: "Missing phoneNumberId" });
      continue;
    }

    if (!allowUnknownPhoneId && !knownIds.has(phoneNumberId)) {
      skipped.push({ phoneNumberId, reason: "Unknown phoneNumberId (not in env config)" });
      continue;
    }

    const parsed = parseLocationEntriesFromInput(row.locations);
    if (parsed.length === 0) {
      skipped.push({ phoneNumberId, reason: "No valid locations" });
      continue;
    }

    if (!force) {
      const existing = (await WhatsAppPhoneAreaConfig.findOne({
        phoneNumberId,
      }).lean()) as PhoneAreaConfigLean | null;
      if (existing && (existing.locations?.length ?? 0) > 0) {
        skipped.push({ phoneNumberId, reason: "Already configured (use force: true to overwrite)" });
        continue;
      }
    }

    const saved = await upsertPhoneLocations(phoneNumberId, parsed);
    updated.push({ phoneNumberId, locations: saved });
  }

  return { updated, skipped };
}

/** Write all env-configured phones; only areas that exist in Monthly Targets. */
export async function configureAllPhonesFromStaticConfig(): Promise<BulkConfigureResult> {
  const phones: BulkPhoneLocationInput[] = [];

  for (const config of WHATSAPP_PHONE_CONFIGS) {
    if (!config.phoneNumberId || config.isInternal) continue;
    const areas = Array.isArray(config.area) ? config.area : [config.area];
    const areaLabels = areas
      .filter((a) => a && a !== "all")
      .map((a) => String(a).charAt(0).toUpperCase() + String(a).slice(1));

    if (areaLabels.length === 0) continue;

    const { resolved, invalid } = await resolveLocationsAgainstMonthlyTargets(areaLabels);
    if (resolved.length === 0) continue;

    phones.push({
      phoneNumberId: config.phoneNumberId,
      locations: resolved.map((l) => l.displayName),
    });
  }

  return bulkConfigurePhoneLocations(phones, { force: true });
}

export async function getPhoneConfigAreasForAccess(
  config: WhatsAppPhoneConfig
): Promise<string[]> {
  const locations = await getLocationsForPhone(config.phoneNumberId);
  if (locations.length > 0) {
    return locations.map((l) => l.locationKey);
  }
  const areas = Array.isArray(config.area) ? config.area : [config.area];
  return areas.filter((a) => a && a !== "all").map((a) => normalizeCityKey(String(a)));
}

/**
 * Return all WhatsappChannel._id strings (as strings) that a user may access.
 *
 * A user may access a channel when:
 *   - Their role is full-access (SuperAdmin etc.) — all active channels.
 *   - Their allotedArea overlaps the channel's assignedLocations.
 *   - (Rental type is already enforced by buildRentalTypeVisibilityClause on queries.)
 *
 * Used by buildConversationVisibilityFilterAsync to add an OR branch covering
 * conversations frozen to an old channel whose phoneNumberId was migrated away.
 */
export async function getAccessibleChannelIds(
  userRole: string,
  userAreas: string[] = [],
  userRentalType?: unknown,
): Promise<string[]> {
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);

  const query: Record<string, unknown> = isFullAccess
    ? {}
    : {
        assignedLocations:
          userAreas.length === 0
            ? { $exists: true }
            : { $in: userAreas.map((a) => normalizeCityKey(a)).filter(Boolean) },
      };

  if (!isFullAccess) {
    if (isDualRentalWhatsAppRole(userRole)) {
      query.$or = [
        { rentalType: "Short Term" },
        { rentalType: "Long Term" },
        { rentalType: "General" },
      ];
    } else {
      const employeeRental = resolveWhatsAppEmployeeRentalType(userRentalType);
      query.$or = [{ rentalType: employeeRental }, { rentalType: "General" }];
    }
  }

  const channels = await WhatsappChannel.find(query)
    .select("_id")
    .lean<{ _id: unknown }[]>();

  return channels.map((c) => String(c._id));
}
