import Query from "@/models/query";
import { loadEmployeeLeadContext } from "@/lib/leads/employeeLeadContext";
import { getUserAreasFromToken } from "@/lib/whatsapp/areaTokenUtils";
import { findLeadByPhoneOrEmail } from "@/lib/whatsapp/leadLookupService";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import {
  isPropertyTypeRuleBypassRole,
  listIncludesType,
  normalizePropertyTypeLocationKey,
  resolveGuestTypeAllowList,
  type PropertyTypeRules,
} from "@/util/propertyTypeAllowList";
import type { PropertyVisibilityRules } from "@/util/propertyVisibilityRule";

type RuleUser = {
  id?: string;
  _id?: string;
  role?: string;
  allotedArea?: string | string[];
  rentalType?: unknown;
};

const RULE_CACHE_MS = 15_000;
const ruleCache = new Map<
  string,
  {
    expires: number;
    ownerRules: PropertyTypeRules | null;
    propertyVisibilityRules: PropertyVisibilityRules | null;
  }
>();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGuestConversation(conversation: Record<string, unknown>): boolean {
  if (
    conversation.source === "internal" ||
    conversation.businessPhoneId === "internal-you"
  ) {
    return false;
  }
  if (conversation.conversationType === "owner" || conversation.channelType === "owner") {
    return false;
  }
  if (conversation.conversationType === "guest" || conversation.channelType === "guest") {
    return true;
  }
  return !conversation.conversationType && !conversation.channelType;
}

async function loadRules(user: RuleUser): Promise<{
  ownerRules: PropertyTypeRules | null;
  propertyVisibilityRules: PropertyVisibilityRules | null;
} | null> {
  if (isPropertyTypeRuleBypassRole(user.role)) return null;
  const employeeId = String(user.id || user._id || "");
  if (!employeeId) return null;

  const cached = ruleCache.get(employeeId);
  if (cached && cached.expires > Date.now()) {
    return cached;
  }

  const context = await loadEmployeeLeadContext(employeeId, user.rentalType);
  const next = {
    expires: Date.now() + RULE_CACHE_MS,
    ownerRules: context.ownerPropertyTypeVisibilityRules,
    propertyVisibilityRules: context.propertyVisibilityRules,
  };
  ruleCache.set(employeeId, next);
  return next;
}

function restrictionApplies(
  rules: {
    ownerRules: PropertyTypeRules | null;
    propertyVisibilityRules: PropertyVisibilityRules | null;
  },
  locations: string[],
): boolean {
  if (locations.length === 0) {
    if (
      resolveGuestTypeAllowList({
        ownerRules: rules.ownerRules,
        propertyVisibilityRules: rules.propertyVisibilityRules,
        location: null,
      })
    ) {
      return true;
    }
    return locationKeysFromRules(rules).some(
      (location) =>
        resolveGuestTypeAllowList({
          ownerRules: rules.ownerRules,
          propertyVisibilityRules: rules.propertyVisibilityRules,
          location,
        }) !== null,
    );
  }

  return locations.some(
    (location) =>
      resolveGuestTypeAllowList({
        ownerRules: rules.ownerRules,
        propertyVisibilityRules: rules.propertyVisibilityRules,
        location,
      }) !== null,
  );
}

function locationKeysFromRules(rules: {
  ownerRules: PropertyTypeRules | null;
  propertyVisibilityRules: PropertyVisibilityRules | null;
}): string[] {
  const keys = new Set<string>();
  const add = (byLocation: PropertyTypeRules["byLocation"] | PropertyVisibilityRules["byLocation"]) => {
    if (!byLocation) return;
    if (typeof (byLocation as Map<string, unknown>).keys === "function" &&
      typeof (byLocation as Map<string, unknown>).get === "function" &&
      !(byLocation as { location?: unknown }).location) {
      for (const key of (byLocation as Map<string, unknown>).keys()) {
        keys.add(String(key));
      }
      return;
    }
    for (const key of Object.keys(byLocation as Record<string, unknown>)) {
      keys.add(key);
    }
  };
  add(rules.ownerRules?.byLocation);
  add(rules.propertyVisibilityRules?.byLocation);
  return [...keys];
}

function phonesFailingAllowList(
  newestTypeByPhone: Map<string, string>,
  allowed: string[],
): string[] {
  const phones: string[] = [];
  for (const [digits, type] of newestTypeByPhone) {
    if (allowed.length === 0 || !listIncludesType(allowed, type)) {
      phones.push(digits);
    }
  }
  return phones;
}

async function newestTypedLeadByPhone(
  locations: string[],
): Promise<Map<string, string>> {
  const query: Record<string, unknown> = {
    typeOfProperty: { $type: "string", $nin: ["", null] },
  };
  if (locations.length > 0) {
    query.$or = locations.map((location) => ({
      location: new RegExp(`^${escapeRegex(location)}$`, "i"),
    }));
  }

  const leads = await Query.find(query)
    .sort({ updatedAt: -1 })
    .select("phoneNo typeOfProperty")
    .lean<Array<{ phoneNo?: string; typeOfProperty?: string }>>();

  const newest = new Map<string, string>();
  for (const lead of leads) {
    const digits = normalizePhone(String(lead.phoneNo || ""));
    const type = String(lead.typeOfProperty || "").trim();
    if (!digits || !type || newest.has(digits)) continue;
    newest.set(digits, type);
  }
  return newest;
}

const ALWAYS_VISIBLE_CHAT: Record<string, unknown>[] = [
  { conversationType: "owner" },
  { channelType: { $in: ["owner", "support", "backup"] } },
  { source: "internal" },
  { businessPhoneId: "internal-you" },
];

/** Mongo clause that hides guest chats whose linked lead type is outside the allow-list. */
export async function buildGuestPropertyTypeVisibilityClause(
  user: RuleUser,
): Promise<Record<string, unknown> | null> {
  const rules = await loadRules(user);
  if (!rules) return null;
  const locations = getUserAreasFromToken(user);
  if (!restrictionApplies(rules, locations)) return null;

  const newest = await newestTypedLeadByPhone(locations);
  if (newest.size === 0) return null;

  if (locations.length === 0) {
    const branches: Record<string, unknown>[] = [...ALWAYS_VISIBLE_CHAT];
    const restrictedKeys: string[] = [];
    for (const location of locationKeysFromRules(rules)) {
      const allowed = resolveGuestTypeAllowList({
        ownerRules: rules.ownerRules,
        propertyVisibilityRules: rules.propertyVisibilityRules,
        location,
      });
      if (!allowed) continue;
      restrictedKeys.push(normalizePropertyTypeLocationKey(location));
      const phones = phonesFailingAllowList(newest, allowed);
      branches.push(
        phones.length === 0
          ? { participantLocationKey: normalizePropertyTypeLocationKey(location) }
          : {
              participantLocationKey: normalizePropertyTypeLocationKey(location),
              participantPhone: { $nin: phones },
            },
      );
    }
    const globalAllowed = resolveGuestTypeAllowList({
      ownerRules: rules.ownerRules,
      propertyVisibilityRules: rules.propertyVisibilityRules,
      location: null,
    });
    if (globalAllowed) {
      const phones = phonesFailingAllowList(newest, globalAllowed);
      branches.push(
        phones.length === 0
          ? { participantLocationKey: { $nin: restrictedKeys } }
          : {
              participantLocationKey: { $nin: restrictedKeys },
              participantPhone: { $nin: phones },
            },
      );
    } else if (restrictedKeys.length > 0) {
      branches.push({ participantLocationKey: { $nin: restrictedKeys } });
    } else {
      return null;
    }
    return { $or: branches };
  }

  const branches: Record<string, unknown>[] = [...ALWAYS_VISIBLE_CHAT];
  let restricted = false;
  for (const location of locations) {
    const key = normalizePropertyTypeLocationKey(location);
    const allowed = resolveGuestTypeAllowList({
      ownerRules: rules.ownerRules,
      propertyVisibilityRules: rules.propertyVisibilityRules,
      location,
    });
    if (!allowed) {
      branches.push({ participantLocationKey: key });
      continue;
    }
    restricted = true;
    const phones = phonesFailingAllowList(newest, allowed);
    branches.push(
      phones.length === 0
        ? { participantLocationKey: key }
        : { participantLocationKey: key, participantPhone: { $nin: phones } },
    );
  }

  if (!restricted) return null;
  return { $or: branches };
}

export async function withGuestPropertyTypeClause(
  user: RuleUser,
  filter: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if ("_id" in filter && filter._id === null) return filter;
  const clause = await buildGuestPropertyTypeVisibilityClause(user);
  if (!clause) return filter;
  const and = Array.isArray(filter.$and)
    ? (filter.$and as Record<string, unknown>[])
    : [];
  return { ...filter, $and: [...and, clause] };
}

/**
 * Untyped leads and chats with no lead stay visible.
 * A typed lead outside the city allow-list hides the guest chat.
 */
export async function guestConversationPassesPropertyTypeRule(
  user: RuleUser,
  conversation: Record<string, unknown>,
): Promise<boolean> {
  if (!isGuestConversation(conversation)) return true;
  const rules = await loadRules(user);
  if (!rules) return true;

  const locationRaw = String(
    conversation.participantLocationKey || conversation.participantLocation || "",
  ).trim();
  const location = locationRaw
    ? normalizePropertyTypeLocationKey(locationRaw)
    : null;
  const allowed = resolveGuestTypeAllowList({
    ownerRules: rules.ownerRules,
    propertyVisibilityRules: rules.propertyVisibilityRules,
    location,
  });
  if (!allowed) return true;

  const lead = await findLeadByPhoneOrEmail({
    phone: String(conversation.participantPhone || ""),
  });
  const type = String(lead?.typeOfProperty || "").trim();
  if (!type) return true;
  if (allowed.length === 0) return false;
  return listIncludesType(allowed, type);
}
