import type { PropertyVisibilityRules } from "@/util/propertyVisibilityRule";

/** Owner-sheet property type rule: enabled plus allowed bedroom/property labels. */
export type PropertyTypeRule = {
  enabled?: boolean;
  allowedPropertyType?: string[];
};

export type PropertyTypeRules = {
  all?: PropertyTypeRule | null;
  byLocation?:
    | Record<string, PropertyTypeRule | null | undefined>
    | Map<string, PropertyTypeRule | null | undefined>
    | null;
};

export const PROPERTY_TYPE_RULE_BYPASS_ROLES = [
  "SuperAdmin",
  "Admin",
  "Developer",
] as const;

export function isPropertyTypeRuleBypassRole(role: string | undefined): boolean {
  const value = (role || "").trim();
  return (PROPERTY_TYPE_RULE_BYPASS_ROLES as readonly string[]).includes(value);
}

export function ownerRulesForRole(
  role: string | undefined,
  rules: PropertyTypeRules | null | undefined,
): PropertyTypeRules | null {
  if (isPropertyTypeRuleBypassRole(role)) return null;
  return rules ?? null;
}

export function normalizePropertyTypeLocationKey(location: string): string {
  return String(location || "").trim().toLowerCase();
}

function readByLocationRule(
  byLocation: PropertyTypeRules["byLocation"],
  locKey: string,
): PropertyTypeRule | null {
  if (!byLocation || !locKey) return null;
  if (typeof (byLocation as Map<string, PropertyTypeRule>).get === "function") {
    return (byLocation as Map<string, PropertyTypeRule>).get(locKey) ?? null;
  }
  return (
    (byLocation as Record<string, PropertyTypeRule | null | undefined>)[locKey] ??
    null
  );
}

function cleanTypeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value).trim()).filter(Boolean);
}

/**
 * Allowed property types for one city.
 * A city rule wins when it is enabled with a non-empty list; otherwise the global rule.
 * Returns null when nothing should be filtered.
 */
export function resolveAllowedPropertyTypes(
  rules: PropertyTypeRules | null | undefined,
  location?: string | null,
): string[] | null {
  if (!rules) return null;

  const locKey = location ? normalizePropertyTypeLocationKey(location) : "";
  // A stored city rule, even when disabled, wins over the global rule.
  const cityRule = locKey ? readByLocationRule(rules.byLocation, locKey) : null;
  const rule = locKey ? cityRule || rules.all || null : rules.all || null;
  const allowed = cleanTypeList(rule?.allowedPropertyType);
  if (!rule?.enabled || allowed.length === 0) return null;
  return allowed;
}

export function typesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function listIncludesType(allowed: string[], value: string): boolean {
  return allowed.some((item) => typesMatch(item, value));
}

/** null means no extra filter. An empty array means the intersection allows nothing. */
export function intersectTypeLists(
  ownerAllowed: string[] | null,
  guestAllowed: string[] | null,
): string[] | null {
  if (!ownerAllowed && !guestAllowed) return null;
  if (!ownerAllowed) return guestAllowed;
  if (!guestAllowed) return ownerAllowed;
  return ownerAllowed.filter((item) => listIncludesType(guestAllowed, item));
}

function guestVisibilityTypes(
  rules: PropertyVisibilityRules | null | undefined,
  location?: string | null,
): string[] | null {
  if (!rules) return null;
  const locKey = location ? normalizePropertyTypeLocationKey(location) : "";
  const byLoc = rules.byLocation || {};
  const cityRule = locKey
    ? (byLoc as Record<string, { enabled?: boolean; allowedTypeOfProperty?: string[] } | undefined>)[
        locKey
      ]
    : null;
  const rule = locKey ? cityRule || rules.all || null : rules.all || null;
  if (!rule?.enabled) return null;
  const allowed = cleanTypeList(rule.allowedTypeOfProperty);
  return allowed.length > 0 ? allowed : null;
}

/**
 * Types a guest lead may have in this city.
 * Intersects the owner-sheet allow-list with propertyVisibilityRules when that rule is on.
 * null = no type filter. [] = no guest can match.
 */
export function resolveGuestTypeAllowList(params: {
  ownerRules: PropertyTypeRules | null | undefined;
  propertyVisibilityRules?: PropertyVisibilityRules | null;
  location?: string | null;
}): string[] | null {
  const ownerAllowed = resolveAllowedPropertyTypes(
    params.ownerRules,
    params.location,
  );
  const guestAllowed = guestVisibilityTypes(
    params.propertyVisibilityRules,
    params.location,
  );
  return intersectTypeLists(ownerAllowed, guestAllowed);
}

export function guestTypeIsAllowed(
  typeOfProperty: unknown,
  allowed: string[] | null,
): boolean {
  if (!allowed) return true;
  const value = String(typeOfProperty ?? "").trim();
  if (!value) return false;
  return listIncludesType(allowed, value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function strictValueRegex(value: string): RegExp {
  return new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, "i");
}

function locationRegex(location: string): RegExp {
  return new RegExp(`^${escapeRegex(location)}$`, "i");
}

/**
 * Owner sheet filter. Same result as the previous per-route copies:
 * city rule, else global rule; UI propertyType must sit inside the allow-list.
 */
export function applyOwnerSheetPropertyTypeFilter(params: {
  query: Record<string, unknown>;
  rules: PropertyTypeRules | null | undefined;
  locations: string[];
  propertyTypeFilter?: string;
}): { impossible: boolean } {
  const { query, rules, locations } = params;
  const propertyTypeFilter = String(params.propertyTypeFilter || "").trim();

  if (locations.length > 0) {
    const clauses: Record<string, unknown>[] = [];
    for (const loc of locations) {
      const allowed = resolveAllowedPropertyTypes(rules, loc);
      if (allowed) {
        if (propertyTypeFilter && !listIncludesType(allowed, propertyTypeFilter)) {
          continue;
        }
        clauses.push({
          location: { $regex: locationRegex(loc) },
          propertyType: propertyTypeFilter
            ? strictValueRegex(propertyTypeFilter)
            : { $in: allowed.map((type) => strictValueRegex(type)) },
        });
      } else {
        clauses.push({
          location: { $regex: locationRegex(loc) },
          ...(propertyTypeFilter
            ? { propertyType: strictValueRegex(propertyTypeFilter) }
            : {}),
        });
      }
    }

    if (clauses.length === 0) return { impossible: true };
    query.$or = clauses;
    if ("propertyType" in query) delete query.propertyType;
    return { impossible: false };
  }

  const allowed = resolveAllowedPropertyTypes(rules, null);
  if (allowed) {
    if (propertyTypeFilter) {
      if (!listIncludesType(allowed, propertyTypeFilter)) {
        return { impossible: true };
      }
      query.propertyType = strictValueRegex(propertyTypeFilter);
    } else {
      query.propertyType = { $in: allowed.map((type) => strictValueRegex(type)) };
    }
    return { impossible: false };
  }

  if (propertyTypeFilter) {
    query.propertyType = strictValueRegex(propertyTypeFilter);
  }
  return { impossible: false };
}

/**
 * Restrict a guest-lead query to the employee's property-type allow-list.
 * Leads with an empty typeOfProperty do not match while a list is active.
 */
export function applyGuestPropertyTypeAllowListToLeadQuery(params: {
  query: Record<string, unknown>;
  ownerRules: PropertyTypeRules | null | undefined;
  propertyVisibilityRules?: PropertyVisibilityRules | null;
  locations: string[] | null;
}): { impossible: boolean } {
  const { query, ownerRules, propertyVisibilityRules, locations } = params;
  const scoped =
    locations && locations.length > 0 ? locations : [null as string | null];

  if (scoped.length === 1) {
    const allowed = resolveGuestTypeAllowList({
      ownerRules,
      propertyVisibilityRules,
      location: scoped[0],
    });
    if (!allowed) return { impossible: false };
    if (allowed.length === 0) return { impossible: true };
    return applyTypeListToQuery(query, allowed);
  }

  const clauses: Record<string, unknown>[] = [];
  for (const loc of scoped) {
    if (!loc) continue;
    const allowed = resolveGuestTypeAllowList({
      ownerRules,
      propertyVisibilityRules,
      location: loc,
    });
    const clause: Record<string, unknown> = {
      location: locationRegex(loc),
    };
    if (allowed) {
      if (allowed.length === 0) continue;
      const temp: Record<string, unknown> = {};
      const applied = applyTypeListToQuery(temp, allowed);
      if (applied.impossible) continue;
      Object.assign(clause, temp);
    }
    clauses.push(clause);
  }

  if (clauses.length === 0) return { impossible: true };

  const restricted = clauses.some((clause) => "typeOfProperty" in clause);
  if (!restricted) return { impossible: false };

  if ("location" in query) delete query.location;
  const andList = Array.isArray(query.$and)
    ? (query.$and as Record<string, unknown>[])
    : [];
  query.$and = [...andList, { $or: clauses }];
  return { impossible: false };
}

function applyTypeListToQuery(
  query: Record<string, unknown>,
  allowed: string[],
): { impossible: boolean } {
  const current = query.typeOfProperty;
  if (typeof current === "string" && current.trim()) {
    if (!listIncludesType(allowed, current)) return { impossible: true };
    return { impossible: false };
  }

  if (
    current &&
    typeof current === "object" &&
    Array.isArray((current as { $in?: unknown[] }).$in)
  ) {
    const existing = (current as { $in: unknown[] }).$in.map((item) => String(item));
    const intersection = existing.filter((item) => listIncludesType(allowed, item));
    if (intersection.length === 0) return { impossible: true };
    query.typeOfProperty = { $in: intersection };
    return { impossible: false };
  }

  query.typeOfProperty = { $in: allowed };
  return { impossible: false };
}
