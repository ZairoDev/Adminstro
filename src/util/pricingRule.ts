import Employees from "@/models/employee";
import {
  buildMaxBudgetCondition,
  computeEffectiveRange,
  getRuleForLocation,
  isEmptyMaxBudgetRange,
  type PricingRule,
  type PricingRules,
} from "@/util/leadBudgetBand";

export type { MaxBudgetCondition, PricingRule, PricingRules } from "@/util/leadBudgetBand";
export {
  buildMaxBudgetCondition,
  computeEffectiveRange,
  isEmptyMaxBudgetRange,
  isLeadAllowedByPricingRules,
} from "@/util/leadBudgetBand";

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

