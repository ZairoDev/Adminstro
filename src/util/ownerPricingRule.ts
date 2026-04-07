import Employees from "@/models/employee";

export type OwnerPricingRule = {
  enabled?: boolean;
  min?: number | null;
  max?: number | null;
};

export type OwnerPricingRules = {
  all?: OwnerPricingRule;
  byLocation?: Record<string, OwnerPricingRule>;
};

export async function loadEmployeeOwnerPricingRules(employeeId: string): Promise<OwnerPricingRules | null> {
  if (!employeeId) return null;
  const emp = await Employees.findById(employeeId).select("ownerPricingRules").lean();
  return (emp as unknown as { ownerPricingRules?: OwnerPricingRules })?.ownerPricingRules || null;
}

function normalizeLocationKey(location: string): string {
  return String(location).trim().toLowerCase();
}

function getRuleForLocation(rules: OwnerPricingRules | null, location: string): OwnerPricingRule | null {
  if (!rules) return null;
  const key = normalizeLocationKey(location);
  const byLoc = rules.byLocation || {};
  return byLoc[key] || rules.all || null;
}

function computeEffectiveRange(params: {
  employeeRule?: OwnerPricingRule | null;
  uiMin?: unknown;
  uiMax?: unknown;
}): { min: number | null; max: number | null } {
  const { employeeRule, uiMin, uiMax } = params;

  const employeeEnabled = Boolean(employeeRule?.enabled);
  const employeeMin =
    employeeEnabled && employeeRule?.min !== null && employeeRule?.min !== undefined
      ? Number(employeeRule.min)
      : null;
  const employeeMax =
    employeeEnabled && employeeRule?.max !== null && employeeRule?.max !== undefined
      ? Number(employeeRule.max)
      : null;

  const parsedUiMin =
    uiMin !== null && uiMin !== undefined && String(uiMin).trim() !== "" ? Number(uiMin) : null;
  const parsedUiMax =
    uiMax !== null && uiMax !== undefined && String(uiMax).trim() !== "" ? Number(uiMax) : null;

  // Owner Sheet UI uses 0 as the "no filter" default for min/max.
  // Treat non-finite and non-positive values as null to preserve previous behavior.
  const uiMinNum =
    typeof parsedUiMin === "number" && Number.isFinite(parsedUiMin) && parsedUiMin > 0
      ? parsedUiMin
      : null;
  const uiMaxNum =
    typeof parsedUiMax === "number" && Number.isFinite(parsedUiMax) && parsedUiMax > 0
      ? parsedUiMax
      : null;

  const mins = [employeeMin, uiMinNum].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  const maxs = [employeeMax, uiMaxNum].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );

  const min = mins.length ? Math.max(...mins) : null;
  const max = maxs.length ? Math.min(...maxs) : null;

  return { min, max };
}

function pushPriceExprRange(params: {
  query: Record<string, unknown>;
  min: number | null;
  max: number | null;
}) {
  const { query, min, max } = params;

  if (min === null && max === null) return;

  // price is stored as string; compare after conversion.
  const priceField = {
    $convert: {
      input: { $trim: { input: "$price" } },
      to: "double",
      onError: null,
      onNull: null,
    },
  };

  const andExpr: unknown[] = [];
  if (typeof min === "number" && Number.isFinite(min)) {
    andExpr.push({ $gte: [priceField, Math.trunc(min)] });
  }
  if (typeof max === "number" && Number.isFinite(max)) {
    andExpr.push({ $lte: [priceField, Math.trunc(max)] });
  }

  if (andExpr.length === 0) return;

  const existingExpr = query.$expr as unknown;
  if (
    existingExpr &&
    typeof existingExpr === "object" &&
    "$and" in (existingExpr as Record<string, unknown>) &&
    Array.isArray((existingExpr as { $and?: unknown[] }).$and)
  ) {
    (existingExpr as { $and: unknown[] }).$and.push(...andExpr);
    query.$expr = existingExpr;
    return;
  }

  query.$expr = { $and: andExpr };
}

export function applyOwnerPricingRulesByLocationToQuery(params: {
  query: Record<string, unknown>;
  pricingRules: OwnerPricingRules | null;
  uiMinPrice?: unknown;
  uiMaxPrice?: unknown;
  locations: string[] | null; // null => unknown/all locations
}): { impossible: boolean } {
  const { query, pricingRules, uiMinPrice, uiMaxPrice, locations } = params;

  if (!locations || locations.length === 0) {
    const { min, max } = computeEffectiveRange({
      employeeRule: pricingRules?.all || null,
      uiMin: uiMinPrice,
      uiMax: uiMaxPrice,
    });
    if (typeof min === "number" && typeof max === "number" && min > max) return { impossible: true };
    pushPriceExprRange({ query, min, max });
    return { impossible: false };
  }

  if (locations.length === 1) {
    const rule = getRuleForLocation(pricingRules, locations[0]);
    const { min, max } = computeEffectiveRange({ employeeRule: rule, uiMin: uiMinPrice, uiMax: uiMaxPrice });
    if (typeof min === "number" && typeof max === "number" && min > max) return { impossible: true };
    pushPriceExprRange({ query, min, max });
    return { impossible: false };
  }

  // For multiple locations, build per-location clauses via $or.
  const locationClauses: Record<string, unknown>[] = [];
  for (const loc of locations) {
    const rule = getRuleForLocation(pricingRules, loc);
    const { min, max } = computeEffectiveRange({ employeeRule: rule, uiMin: uiMinPrice, uiMax: uiMaxPrice });
    if (typeof min === "number" && typeof max === "number" && min > max) continue;

    const clause: Record<string, unknown> = {
      location: new RegExp(`^${String(loc).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}$`, "i"),
    };
    pushPriceExprRange({ query: clause, min, max });
    locationClauses.push(clause);
  }

  if (locationClauses.length === 0) return { impossible: true };

  if ("location" in query) delete (query as Record<string, unknown>).location;

  const andList = Array.isArray((query as { $and?: unknown[] }).$and) ? (query as { $and: unknown[] }).$and : [];
  (query as { $and: unknown[] }).$and = [...andList, { $or: locationClauses }];

  return { impossible: false };
}

