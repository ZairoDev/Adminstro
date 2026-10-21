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

/**
 * Canonical lead-budget semantics — EVERY lead budget filter in the app
 * (employee pricing rules, the UI "Budget From/To" filters on all lead
 * lists, and the WhatsApp retarget price filter) must go through this
 * module so a lead is classified identically everywhere.
 *
 * Rules:
 * 1. A lead is classified by its `maxBudget` ONLY (the customer's ceiling).
 *    `minBudget` is descriptive / property-matching data and must NEVER be
 *    used as a lead-filter condition. Filtering on both fields required a
 *    lead's whole range to fit inside a band, so any lead straddling a
 *    band boundary (e.g. 400–800 across 0–580 / 580–2500) was visible to
 *    nobody — leads were silently lost.
 * 2. A band is `(min, max]`: lower-exclusive, upper-inclusive. A boundary
 *    value belongs to the LOWER band — e.g. `maxBudget = 580` is owned by
 *    the 0–580 employee, and the 580–2500 band starts above 580. Adjacent
 *    bands therefore never overlap and never leave a gap.
 * 3. Exception: `min <= 0` means "from zero", so the lower bound is
 *    inclusive there (`maxBudget >= 0`); a 0-budget lead belongs to the
 *    0-band instead of to nobody.
 */
export type MaxBudgetCondition = {
  $gte?: number;
  $gt?: number;
  $lte?: number;
};

/** Build the Mongo condition on `maxBudget` for an effective range. */
export function buildMaxBudgetCondition(
  effectiveMin: number | null,
  effectiveMax: number | null,
): MaxBudgetCondition | null {
  const condition: MaxBudgetCondition = {};

  if (typeof effectiveMin === "number" && Number.isFinite(effectiveMin)) {
    const min = Math.trunc(effectiveMin);
    if (min <= 0) {
      condition.$gte = min;
    } else {
      condition.$gt = min;
    }
  }
  if (typeof effectiveMax === "number" && Number.isFinite(effectiveMax)) {
    condition.$lte = Math.trunc(effectiveMax);
  }

  return Object.keys(condition).length > 0 ? condition : null;
}

/**
 * Whether `(min, max]` can match no `maxBudget` at all. With the
 * lower-exclusive convention a positive `min === max` is empty (the single
 * boundary value belongs to the lower band); `0–0` still matches 0.
 */
export function isEmptyMaxBudgetRange(
  effectiveMin: number | null,
  effectiveMax: number | null,
): boolean {
  if (
    typeof effectiveMin !== "number" ||
    typeof effectiveMax !== "number" ||
    !Number.isFinite(effectiveMin) ||
    !Number.isFinite(effectiveMax)
  ) {
    return false;
  }
  if (effectiveMin <= 0) {
    return effectiveMin > effectiveMax;
  }
  return effectiveMin >= effectiveMax;
}

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
  if (isEmptyMaxBudgetRange(effectiveMin, effectiveMax)) {
    return { impossible: true };
  }

  // Exclusive ownership by `maxBudget` only — see module doc above.
  // `minBudget` must never carry a filter condition, so clear any stale one.
  delete query.minBudget;
  const condition = buildMaxBudgetCondition(effectiveMin, effectiveMax);
  if (condition) {
    query.maxBudget = condition;
  } else {
    delete query.maxBudget;
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
    if (isEmptyMaxBudgetRange(min, max)) {
      // This location yields no results; skip it.
      continue;
    }
    const clause: Record<string, any> = {
      location: new RegExp(`^${String(loc).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    };
    const condition = buildMaxBudgetCondition(min, max);
    if (condition) {
      clause.maxBudget = condition;
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

