import { normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import {
  WHATSAPP_PHONE_CONFIGS,
  FULL_ACCESS_ROLES,
  getAllowedPhoneIds,
} from "@/lib/whatsapp/config";
import WhatsappChannel, { type IWhatsappChannel } from "@/models/whatsappChannel";
import {
  isDualRentalWhatsAppRole,
  resolveWhatsAppEmployeeRentalType,
} from "@/lib/whatsapp/rentalTypeAccess";
import { getAllowedChannelTypes } from "@/lib/whatsapp/channelTypeAccess";

const CACHE_TTL_MS = 30_000;

export type PhoneLocationEntry = {
  displayName: string;
  locationKey: string;
};

type PhoneLocationsMap = Map<string, PhoneLocationEntry[]>;

let cache: { map: PhoneLocationsMap; expiresAt: number } | null = null;

function staticAreasForPhone(phoneNumberId: string): PhoneLocationEntry[] {
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

function dedupeLocations(entries: PhoneLocationEntry[]): PhoneLocationEntry[] {
  const seen = new Set<string>();
  const out: PhoneLocationEntry[] = [];
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

export function invalidatePhoneAreaCache(): void {
  cache = null;
}

async function loadPhoneLocationsMap(): Promise<PhoneLocationsMap> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.map;
  }

  const map: PhoneLocationsMap = new Map();

  for (const config of WHATSAPP_PHONE_CONFIGS) {
    if (!config.phoneNumberId || config.isInternal) continue;
    map.set(config.phoneNumberId, staticAreasForPhone(config.phoneNumberId));
  }

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
      .filter((entry): entry is PhoneLocationEntry => Boolean(entry));

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

export function getPhoneIdsForUserAreasSync(
  userRole: string,
  userAreas: string[] = [],
): string[] {
  if (cache?.map) {
    return phoneIdsFromLocationsMap(cache.map, userRole, userAreas);
  }
  return getAllowedPhoneIds(userRole, userAreas);
}

export async function resolveUserAllowedPhoneIds(
  userRole: string,
  userAreas: string[] = [],
): Promise<string[]> {
  const map = await loadPhoneLocationsMap();
  return phoneIdsFromLocationsMap(map, userRole, userAreas);
}

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
  phoneNumberId: string,
): Promise<PhoneLocationEntry[]> {
  const map = await loadPhoneLocationsMap();
  return map.get(phoneNumberId) ?? [];
}

export async function getAllPhoneLocationConfigs(): Promise<
  Array<{ phoneNumberId: string; locations: PhoneLocationEntry[] }>
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

export async function getConfiguredLocationDisplaysForWhatsApp(): Promise<string[]> {
  const { getMonthlyTargetCities } = await import("@/lib/monthly-target-locations");
  const monthlyKeys = new Set(
    (await getMonthlyTargetCities()).map((c) => normalizeCityKey(c)),
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

export async function getAllConfiguredLocationEntries(): Promise<PhoneLocationEntry[]> {
  const displays = await getConfiguredLocationDisplaysForWhatsApp();
  return displays.map((displayName) => ({
    displayName,
    locationKey: normalizeCityKey(displayName),
  }));
}

export async function isLocationConfiguredForWhatsApp(
  location: string,
): Promise<boolean> {
  const key = normalizeCityKey(location);
  if (!key) return false;
  const entries = await getAllConfiguredLocationEntries();
  return entries.some((loc) => loc.locationKey === key);
}

export async function isLocationAllowedForPhone(
  phoneNumberId: string,
  location: string,
): Promise<boolean> {
  const key = normalizeCityKey(location);
  if (!key) return false;
  const locations = await getLocationsForPhone(phoneNumberId);
  return locations.some((loc) => loc.locationKey === key);
}

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

    const allowedChannelTypes = getAllowedChannelTypes(userRole);
    if (allowedChannelTypes) {
      query.channelType = { $in: allowedChannelTypes };
    }
  }

  const channels = await WhatsappChannel.find({ ...query, active: true })
    .select("_id")
    .lean<{ _id: unknown }[]>();

  return channels.map((c) => String(c._id));
}
