import Query from "@/models/query";
import { loadEmployeeLeadContext } from "@/lib/leads/employeeLeadContext";
import { getUserAreasFromToken } from "@/lib/whatsapp/areaTokenUtils";
import { findLeadByPhoneOrEmail } from "@/lib/whatsapp/leadLookupService";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import {
  isLeadAllowedByPricingRules,
  type PricingRule,
  type PricingRules,
} from "@/util/leadBudgetBand";
import {
  isPropertyTypeRuleBypassRole,
  normalizePropertyTypeLocationKey,
} from "@/util/propertyTypeAllowList";

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
    pricingRules: PricingRules | null;
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

function toPlainByLocation(
  byLocation: PricingRules["byLocation"] | Map<string, PricingRule> | undefined,
): Record<string, PricingRule> {
  if (!byLocation) return {};
  if (typeof (byLocation as Map<string, PricingRule>).get === "function") {
    return Object.fromEntries(
      (byLocation as Map<string, PricingRule>).entries(),
    );
  }
  return { ...(byLocation as Record<string, PricingRule>) };
}

function toPlainPricingRules(raw: PricingRules | null | undefined): PricingRules | null {
  if (!raw) return null;
  return {
    all: raw.all,
    byLocation: toPlainByLocation(raw.byLocation),
  };
}

function hasEnabledPricingBand(rules: PricingRules | null): boolean {
  if (!rules) return false;
  if (rules.all?.enabled) return true;
  return Object.values(rules.byLocation || {}).some((rule) => Boolean(rule?.enabled));
}

async function loadPricingRules(user: RuleUser): Promise<PricingRules | null> {
  if (isPropertyTypeRuleBypassRole(user.role)) return null;
  const employeeId = String(user.id || user._id || "");
  if (!employeeId) return null;

  const cached = ruleCache.get(employeeId);
  if (cached && cached.expires > Date.now()) {
    return cached.pricingRules;
  }

  const context = await loadEmployeeLeadContext(employeeId, user.rentalType);
  const pricingRules = toPlainPricingRules(context.pricingRules);
  ruleCache.set(employeeId, {
    expires: Date.now() + RULE_CACHE_MS,
    pricingRules,
  });
  return pricingRules;
}

function phoneFormsForExclusion(digits: string): string[] {
  const forms = new Set<string>();
  if (!digits) return [];
  forms.add(digits);
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (last10) forms.add(last10);
  if (last10.length === 10) forms.add(`91${last10}`);
  return [...forms];
}

function phonesFailingPricingBand(
  newestBudgetByPhone: Map<string, { location: string; maxBudget: number }>,
  pricingRules: PricingRules,
): string[] {
  const phones: string[] = [];
  for (const [digits, lead] of newestBudgetByPhone) {
    if (
      !isLeadAllowedByPricingRules({
        pricingRules,
        location: lead.location,
        maxBudget: lead.maxBudget,
      })
    ) {
      phones.push(...phoneFormsForExclusion(digits));
    }
  }
  return [...new Set(phones)];
}

async function newestBudgetLeadByPhone(
  locations: string[],
): Promise<Map<string, { location: string; maxBudget: number }>> {
  const query: Record<string, unknown> = {
    maxBudget: { $type: "number" },
  };
  if (locations.length > 0) {
    query.$or = locations.map((location) => ({
      location: new RegExp(`^${escapeRegex(location)}$`, "i"),
    }));
  }

  const leads = await Query.find(query)
    .sort({ updatedAt: -1 })
    .select("phoneNo location maxBudget")
    .lean<Array<{ phoneNo?: string; location?: string; maxBudget?: number }>>();

  const newest = new Map<string, { location: string; maxBudget: number }>();
  for (const lead of leads) {
    const digits = normalizePhone(String(lead.phoneNo || ""));
    const ceiling = Number(lead.maxBudget);
    const location = String(lead.location || "").trim();
    if (!digits || !Number.isFinite(ceiling) || newest.has(digits)) continue;
    newest.set(digits, {
      location: location || "all",
      maxBudget: ceiling,
    });
  }
  return newest;
}

const ALWAYS_VISIBLE_CHAT: Record<string, unknown>[] = [
  { conversationType: "owner" },
  { channelType: { $in: ["owner", "support", "backup"] } },
  { source: "internal" },
  { businessPhoneId: "internal-you" },
];

/**
 * Mongo clause that hides guest chats whose linked lead maxBudget is outside
 * the employee pricing band. Chats with no lead / no maxBudget stay visible
 * (same unclassified policy as property-type WhatsApp filtering).
 */
export async function buildGuestPricingVisibilityClause(
  user: RuleUser,
): Promise<Record<string, unknown> | null> {
  const pricingRules = await loadPricingRules(user);
  if (!hasEnabledPricingBand(pricingRules)) return null;

  const locations = getUserAreasFromToken(user);
  const newest = await newestBudgetLeadByPhone(locations);
  if (newest.size === 0) return null;

  const phones = phonesFailingPricingBand(newest, pricingRules as PricingRules);
  if (phones.length === 0) return null;

  return {
    $or: [
      ...ALWAYS_VISIBLE_CHAT,
      { participantPhone: { $nin: phones } },
    ],
  };
}

export async function withGuestPricingClause(
  user: RuleUser,
  filter: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if ("_id" in filter && filter._id === null) return filter;
  const clause = await buildGuestPricingVisibilityClause(user);
  if (!clause) return filter;
  const and = Array.isArray(filter.$and)
    ? (filter.$and as Record<string, unknown>[])
    : [];
  return { ...filter, $and: [...and, clause] };
}

/**
 * No lead / no maxBudget stay visible.
 * A lead whose ceiling is outside the employee's band hides the guest chat.
 */
export async function guestConversationPassesPricingRule(
  user: RuleUser,
  conversation: Record<string, unknown>,
): Promise<boolean> {
  if (!isGuestConversation(conversation)) return true;
  const pricingRules = await loadPricingRules(user);
  if (!hasEnabledPricingBand(pricingRules)) return true;

  const locationRaw = String(
    conversation.participantLocationKey || conversation.participantLocation || "",
  ).trim();
  const location = locationRaw
    ? normalizePropertyTypeLocationKey(locationRaw)
    : "";

  let maxBudget: unknown = undefined;
  let leadLocation = "";

  const leadQueryId = String(conversation.leadQueryId || "").trim();
  if (leadQueryId) {
    const linked = await Query.findById(leadQueryId)
      .select("location maxBudget")
      .lean<{ location?: string; maxBudget?: number } | null>();
    if (linked) {
      maxBudget = linked.maxBudget;
      leadLocation = String(linked.location || "");
    }
  }

  if (maxBudget === null || maxBudget === undefined) {
    const lead = await findLeadByPhoneOrEmail({
      phone: String(conversation.participantPhone || ""),
    });
    maxBudget = lead?.maxBudget;
    leadLocation = String(lead?.location || leadLocation);
  }

  if (maxBudget === null || maxBudget === undefined) return true;

  return isLeadAllowedByPricingRules({
    pricingRules,
    location: leadLocation || location || "",
    maxBudget,
  });
}
