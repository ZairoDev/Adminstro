export type OwnerVisibilityRule = {
  enabled?: boolean;
  allowedInteriorStatus?: string[];
  allowedPropertyType?: string[];
  allowedPetStatus?: string[];
};

export type OwnerVisibilityRules = {
  all?: OwnerVisibilityRule;
  byLocation?: Record<string, OwnerVisibilityRule>;
};

function normalizeLocationKey(location: string): string {
  return String(location).trim().toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toExactRegexList(values: string[]): RegExp[] { 
  return values
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map((v) => new RegExp(`^${escapeRegex(v)}$`, "i"));
}

function toInteriorStatusRegexList(values: string[]): RegExp[] {
  const normalized = values
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean);

  const regexes: RegExp[] = [];

  // Support common variants in DB: "SemiFurnished" vs "Semi-furnished" vs "Semi furnished"
  if (normalized.some((v) => v === "semifurnished" || v === "semi-furnished" || v === "semi furnished")) {
    regexes.push(/^semi[\s-]?furnished$/i);
  }

  // Support "Fully Furnished" vs "Fully-furnished" (and sometimes just "Furnished")
  if (normalized.some((v) => v === "fully furnished" || v === "fully-furnished" || v === "furnished")) {
    regexes.push(/^(fully[\s-]?furnished|furnished)$/i);
  }

  // Support "Unfurnished" vs "unfurnished"
  if (normalized.some((v) => v === "unfurnished")) {
    regexes.push(/^unfurnished$/i);
  }

  // Fallback: any other unknown values as exact match
  const known = new Set(["semifurnished", "semi-furnished", "semi furnished", "fully furnished", "fully-furnished", "furnished", "unfurnished"]);
  for (const v of normalized) {
    if (!known.has(v)) {
      regexes.push(new RegExp(`^${escapeRegex(v)}$`, "i"));
    }
  }

  return Array.from(new Set(regexes.map((r) => r.source))).map((source) => new RegExp(source, "i"));
}

function getRuleForLocation(rules: OwnerVisibilityRules | null, location: string): OwnerVisibilityRule | null {
  if (!rules) return null;
  const key = normalizeLocationKey(location);
  const byLoc = rules.byLocation || {};
  return byLoc[key] || rules.all || null;
}

function applySingleOwnerVisibilityRule(params: {
  query: Record<string, unknown>;
  rule: OwnerVisibilityRule | null;
  uiInteriorStatus?: unknown;
  uiPropertyType?: unknown;
  uiPetStatus?: unknown;
}): { impossible: boolean } {
  const { query, rule, uiInteriorStatus, uiPropertyType, uiPetStatus } = params;

  const enabled = Boolean(rule?.enabled);

  const allowedInteriorStatus = Array.isArray(rule?.allowedInteriorStatus)
    ? rule!.allowedInteriorStatus!.map(String).filter(Boolean)
    : [];
  const allowedPropertyType = Array.isArray(rule?.allowedPropertyType)
    ? rule!.allowedPropertyType!.map(String).filter(Boolean)
    : [];
  const allowedPetStatus = Array.isArray(rule?.allowedPetStatus)
    ? rule!.allowedPetStatus!.map(String).filter(Boolean)
    : [];

  // If rule is not enabled, just apply UI filters (if any) and exit.
  if (!enabled) {
    if (uiInteriorStatus && String(uiInteriorStatus).trim() !== "") {
      query.interiorStatus = uiInteriorStatus;
    }
    if (uiPropertyType && String(uiPropertyType).trim() !== "") {
      query.propertyType = uiPropertyType;
    }
    if (uiPetStatus && String(uiPetStatus).trim() !== "") {
      query.petStatus = uiPetStatus;
    }
    return { impossible: false };
  }

  // Interior Status intersection
  if (allowedInteriorStatus.length > 0) {
    if (uiInteriorStatus && String(uiInteriorStatus).trim() !== "") {
      const v = String(uiInteriorStatus).trim();
      const allowed = allowedInteriorStatus.some((a) => a.toLowerCase() === v.toLowerCase());
      if (!allowed) return { impossible: true };
      query.interiorStatus = new RegExp(`^${escapeRegex(v)}$`, "i");
    } else {
      query.interiorStatus = { $in: toInteriorStatusRegexList(allowedInteriorStatus) };
    }
  } else if (uiInteriorStatus && String(uiInteriorStatus).trim() !== "") {
    query.interiorStatus = uiInteriorStatus;
  }

  // Property Type intersection
  if (allowedPropertyType.length > 0) {
    if (uiPropertyType && String(uiPropertyType).trim() !== "") {
      const v = String(uiPropertyType).trim();
      const allowed = allowedPropertyType.some((a) => a.toLowerCase() === v.toLowerCase());
      if (!allowed) return { impossible: true };
      query.propertyType = new RegExp(`^${escapeRegex(v)}$`, "i");
    } else {
      query.propertyType = { $in: toExactRegexList(allowedPropertyType) };
    }
  } else if (uiPropertyType && String(uiPropertyType).trim() !== "") {
    query.propertyType = uiPropertyType;
  }

  // Pet Status intersection
  if (allowedPetStatus.length > 0) {
    if (uiPetStatus && String(uiPetStatus).trim() !== "") {
      const v = String(uiPetStatus).trim();
      const allowed = allowedPetStatus.some((a) => a.toLowerCase() === v.toLowerCase());
      if (!allowed) return { impossible: true };
      query.petStatus = new RegExp(`^${escapeRegex(v)}$`, "i");
    } else {
      query.petStatus = { $in: toExactRegexList(allowedPetStatus) };
    }
  } else if (uiPetStatus && String(uiPetStatus).trim() !== "") {
    query.petStatus = uiPetStatus;
  }

  return { impossible: false };
}

export function applyOwnerVisibilityRulesByLocationToQuery(params: {
  query: Record<string, unknown>;
  rules: OwnerVisibilityRules | null;
  locations: string[] | null;
  uiInteriorStatus?: unknown;
  uiPropertyType?: unknown;
  uiPetStatus?: unknown;
}): { impossible: boolean } {
  const { query, rules, locations, uiInteriorStatus, uiPropertyType, uiPetStatus } = params;

  if (!locations || locations.length === 0) {
    return applySingleOwnerVisibilityRule({
      query,
      rule: rules?.all || null,
      uiInteriorStatus,
      uiPropertyType,
      uiPetStatus,
    });
  }

  if (locations.length === 1) {
    const rule = getRuleForLocation(rules, locations[0]);
    return applySingleOwnerVisibilityRule({
      query,
      rule,
      uiInteriorStatus,
      uiPropertyType,
      uiPetStatus,
    });
  }

  const locationClauses: Record<string, unknown>[] = [];
  for (const loc of locations) {
    const rule = getRuleForLocation(rules, loc);
    const clause: Record<string, unknown> = {
      location: new RegExp(`^${escapeRegex(String(loc))}$`, "i"),
    };
    const temp: Record<string, unknown> = {};
    const { impossible } = applySingleOwnerVisibilityRule({
      query: temp,
      rule,
      uiInteriorStatus,
      uiPropertyType,
      uiPetStatus,
    });
    if (impossible) continue;
    Object.assign(clause, temp);
    locationClauses.push(clause);
  }

  if (locationClauses.length === 0) return { impossible: true };

  if ("location" in query) delete (query as Record<string, unknown>).location;

  const andList = Array.isArray((query as { $and?: unknown[] }).$and) ? (query as { $and: unknown[] }).$and : [];
  (query as { $and: unknown[] }).$and = [...andList, { $or: locationClauses }];

  return { impossible: false };
}

export function applyOwnerLocationBlockToQuery(params: {
  query: Record<string, unknown>;
  blockedLocations: string[] | null | undefined;
}): void {
  const { query, blockedLocations } = params;
  const blocked = Array.isArray(blockedLocations)
    ? blockedLocations.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (blocked.length === 0) return;

  const norClauses = blocked.map((loc) => ({
    location: { $regex: new RegExp(`^${escapeRegex(loc)}$`, "i") },
  }));

  const andList = Array.isArray((query as { $and?: unknown[] }).$and) ? (query as { $and: unknown[] }).$and : [];
  (query as { $and: unknown[] }).$and = [...andList, { $nor: norClauses }];
}

