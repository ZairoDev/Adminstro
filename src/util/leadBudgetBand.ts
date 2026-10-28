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
 *    used as a lead-filter condition.
 * 2. A band is `(min, max]`: lower-exclusive, upper-inclusive. A boundary
 *    value belongs to the LOWER band — e.g. `maxBudget = 580` is owned by
 *    the 0–580 employee, and the 580–2500 band starts above 580.
 * 3. Exception: `min <= 0` means "from zero", so the lower bound is
 *    inclusive there (`maxBudget >= 0`).
 */
export type MaxBudgetCondition = {
  $gte?: number;
  $gt?: number;
  $lte?: number;
};

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

function normalizeLocationKey(location: string): string {
  return String(location).trim().toLowerCase();
}

export function getRuleForLocation(
  pricingRules: PricingRules | null,
  location: string,
): PricingRule | null {
  if (!pricingRules) return null;
  const key = normalizeLocationKey(location);
  const byLoc = pricingRules.byLocation || {};
  const locationRule = byLoc[key];
  // A saved-but-disabled city row must not hide an enabled All band.
  // Only an enabled city rule overrides All.
  if (locationRule?.enabled) return locationRule;
  if (pricingRules.all?.enabled) return pricingRules.all;
  return locationRule || pricingRules.all || null;
}

export function maxBudgetMatchesCondition(
  condition: MaxBudgetCondition | null,
  maxBudget: number,
): boolean {
  if (!condition) return true;
  if (condition.$gte !== undefined && maxBudget < condition.$gte) return false;
  if (condition.$gt !== undefined && maxBudget <= condition.$gt) return false;
  if (condition.$lte !== undefined && maxBudget > condition.$lte) return false;
  return true;
}

function readLeadCeiling(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const ceiling = typeof value === "number" ? value : Number(value);
  return Number.isFinite(ceiling) ? ceiling : null;
}

/**
 * Same decision as the lead-list query: a disabled or missing rule allows
 * the lead. An enabled band allows the lead only when `maxBudget` satisfies
 * that band.
 */
export function isLeadAllowedByPricingRules(params: {
  pricingRules: PricingRules | null | undefined;
  location: string;
  maxBudget: unknown;
}): boolean {
  const rule = getRuleForLocation(params.pricingRules ?? null, params.location);
  if (!rule?.enabled) return true;

  const { min, max } = computeEffectiveRange({ employeeRule: rule });
  if (isEmptyMaxBudgetRange(min, max)) return false;

  const condition = buildMaxBudgetCondition(min, max);
  if (!condition) return true;

  const ceiling = readLeadCeiling(params.maxBudget);
  if (ceiling === null) return false;
  return maxBudgetMatchesCondition(condition, ceiling);
}
