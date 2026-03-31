import Employees from "@/models/employee";

export type PricingRule = {
  enabled?: boolean;
  min?: number | null;
  max?: number | null;
};

export type PricingRules = {
  all?: PricingRule;
  byLocation?: Record<string, PricingRule>;
};

export function computeEffectiveRange(params: {
  employeeRule?: PricingRule | null;
  uiBudgetFrom?: unknown;
  uiBudgetTo?: unknown;
}): { min: number | null; max: number | null } {
  const { employeeRule, uiBudgetFrom, uiBudgetTo } = params;

  const employeeEnabled = Boolean(employeeRule?.enabled);
  const employeeMin =
    employeeEnabled && employeeRule?.min !== null && employeeRule?.min !== undefined
      ? Number(employeeRule.min)
      : null;
  const employeeMax =
    employeeEnabled && employeeRule?.max !== null && employeeRule?.max !== undefined
      ? Number(employeeRule.max)
      : null;

  const uiMin =
    uiBudgetFrom !== null && uiBudgetFrom !== undefined && String(uiBudgetFrom).trim() !== ""
      ? Number(uiBudgetFrom)
      : null;
  const uiMax =
    uiBudgetTo !== null && uiBudgetTo !== undefined && String(uiBudgetTo).trim() !== ""
      ? Number(uiBudgetTo)
      : null;

  const min = [employeeMin, uiMin].filter((v): v is number => typeof v === "number" && Number.isFinite(v)).length
    ? Math.max(...([employeeMin, uiMin].filter((v): v is number => typeof v === "number" && Number.isFinite(v))))
    : null;

  const max = [employeeMax, uiMax].filter((v): v is number => typeof v === "number" && Number.isFinite(v)).length
    ? Math.min(...([employeeMax, uiMax].filter((v): v is number => typeof v === "number" && Number.isFinite(v))))
    : null;

  return { min, max };
}

export async function loadEmployeePricingRule(employeeId: string): Promise<PricingRule | null> {
  if (!employeeId) return null;
  const emp = await Employees.findById(employeeId).select("pricingRule").lean();
  return (emp as any)?.pricingRule || null;
}

export async function loadEmployeePricingRules(employeeId: string): Promise<PricingRules | null> {
  if (!employeeId) return null;
  const emp = await Employees.findById(employeeId).select("pricingRules").lean();
  return (emp as any)?.pricingRules || null;
}

export function applyEffectiveRangeToQuery(params: {
  query: Record<string, any>;
  effectiveMin: number | null;
  effectiveMax: number | null;
}): { impossible: boolean } {
  const { query, effectiveMin, effectiveMax } = params;
  if (
    typeof effectiveMin === "number" &&
    typeof effectiveMax === "number" &&
    Number.isFinite(effectiveMin) &&
    Number.isFinite(effectiveMax) &&
    effectiveMin > effectiveMax
  ) {
    return { impossible: true };
  }

  if (typeof effectiveMin === "number" && Number.isFinite(effectiveMin)) {
    query.minBudget = { $gte: Math.trunc(effectiveMin) };
  }
  if (typeof effectiveMax === "number" && Number.isFinite(effectiveMax)) {
    query.maxBudget = { $lte: Math.trunc(effectiveMax) };
  }
  return { impossible: false };
}

function normalizeLocationKey(location: string): string {
  return String(location).trim().toLowerCase();
}

function getRuleForLocation(pricingRules: PricingRules | null, location: string): PricingRule | null {
  if (!pricingRules) return null;
  const key = normalizeLocationKey(location);
  const byLoc = pricingRules.byLocation || {};
  return byLoc[key] || pricingRules.all || null;
}

export function applyPricingRulesByLocationToQuery(params: {
  query: Record<string, any>;
  pricingRules: PricingRules | null;
  uiBudgetFrom?: unknown;
  uiBudgetTo?: unknown;
  locations: string[] | null; // null => unknown/all locations
}): { impossible: boolean } {
  const { query, pricingRules, uiBudgetFrom, uiBudgetTo, locations } = params;

  // If we don't know locations, fall back to "all" rule only.
  if (!locations || locations.length === 0) {
    const { min, max } = computeEffectiveRange({
      employeeRule: pricingRules?.all || null,
      uiBudgetFrom,
      uiBudgetTo,
    });
    return applyEffectiveRangeToQuery({ query, effectiveMin: min, effectiveMax: max });
  }

  // Single location: apply that location's rule directly.
  if (locations.length === 1) {
    const rule = getRuleForLocation(pricingRules, locations[0]);
    const { min, max } = computeEffectiveRange({
      employeeRule: rule,
      uiBudgetFrom,
      uiBudgetTo,
    });
    return applyEffectiveRangeToQuery({ query, effectiveMin: min, effectiveMax: max });
  }

  // Multiple locations: apply per-location constraints via $or.
  const locationClauses: Record<string, any>[] = [];
  for (const loc of locations) {
    const rule = getRuleForLocation(pricingRules, loc);
    const { min, max } = computeEffectiveRange({
      employeeRule: rule,
      uiBudgetFrom,
      uiBudgetTo,
    });
    if (typeof min === "number" && typeof max === "number" && min > max) {
      // This location yields no results; skip it.
      continue;
    }
    const clause: Record<string, any> = {
      location: new RegExp(`^${String(loc).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    };
    if (typeof min === "number" && Number.isFinite(min)) {
      clause.minBudget = { $gte: Math.trunc(min) };
    }
    if (typeof max === "number" && Number.isFinite(max)) {
      clause.maxBudget = { $lte: Math.trunc(max) };
    }
    locationClauses.push(clause);
  }

  if (locationClauses.length === 0) {
    return { impossible: true };
  }

  // Replace existing location constraint with an explicit $or (per-location).
  if ("location" in query) {
    delete query.location;
  }
  const andList = Array.isArray(query.$and) ? query.$and : [];
  query.$and = [...andList, { $or: locationClauses }];
  return { impossible: false };
}

