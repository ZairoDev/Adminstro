import {
  applyEffectiveRangeToQuery,
  applyPricingRulesByLocationToQuery,
  buildMaxBudgetCondition,
  computeEffectiveRange,
  isEmptyMaxBudgetRange,
} from "@/util/pricingRule";

/** Does a lead with this `maxBudget` match the built Mongo condition? */
function matchesMaxBudget(
  condition: { $gte?: number; $gt?: number; $lte?: number } | undefined,
  maxBudget: number,
): boolean {
  if (!condition) return true;
  if (condition.$gte !== undefined && maxBudget < condition.$gte) return false;
  if (condition.$gt !== undefined && maxBudget <= condition.$gt) return false;
  if (condition.$lte !== undefined && maxBudget > condition.$lte) return false;
  return true;
}

function queryForRange(min: number | null, max: number | null) {
  const query: Record<string, unknown> = {};
  const result = applyEffectiveRangeToQuery({
    query,
    effectiveMin: min,
    effectiveMax: max,
  });
  return { query, impossible: result.impossible };
}

describe("exclusive ownership by maxBudget", () => {
  it("never puts a filter condition on minBudget", () => {
    const { query } = queryForRange(0, 580);
    expect(query.minBudget).toBeUndefined();
    expect(query.maxBudget).toEqual({ $gte: 0, $lte: 580 });
  });

  it("assigns a straddling lead (400-800) by its ceiling, not by containment", () => {
    // Lead minBudget=400, maxBudget=800: previously invisible to both
    // the 0-580 and the 580-2500 employee. Now owned solely by 580-2500.
    const low = queryForRange(0, 580);
    const high = queryForRange(580, 2500);
    expect(matchesMaxBudget(low.query.maxBudget as never, 800)).toBe(false);
    expect(matchesMaxBudget(high.query.maxBudget as never, 800)).toBe(true);
  });

  it("gives the boundary value to the lower band only", () => {
    const low = queryForRange(0, 580);
    const high = queryForRange(580, 2500);
    expect(matchesMaxBudget(low.query.maxBudget as never, 580)).toBe(true);
    expect(matchesMaxBudget(high.query.maxBudget as never, 580)).toBe(false);
  });

  it("keeps a 0-budget lead in the 0-band", () => {
    const low = queryForRange(0, 580);
    expect(matchesMaxBudget(low.query.maxBudget as never, 0)).toBe(true);
  });

  it("adjacent bands partition every ceiling with no gap and no overlap", () => {
    const low = queryForRange(0, 580);
    const high = queryForRange(580, 2500);
    for (const ceiling of [0, 1, 300, 579, 580, 581, 800, 2499, 2500]) {
      const inLow = matchesMaxBudget(low.query.maxBudget as never, ceiling);
      const inHigh = matchesMaxBudget(high.query.maxBudget as never, ceiling);
      expect(inLow !== inHigh).toBe(true);
    }
    // Above the top band belongs to neither — same as the 0-2500 filter.
    const all = queryForRange(0, 2500);
    expect(matchesMaxBudget(all.query.maxBudget as never, 2501)).toBe(false);
  });

  it("treats a positive min === max band as empty (boundary is lower band's)", () => {
    expect(isEmptyMaxBudgetRange(580, 580)).toBe(true);
    expect(isEmptyMaxBudgetRange(0, 0)).toBe(false);
    expect(queryForRange(580, 580).impossible).toBe(true);
  });

  it("supports single-sided ranges", () => {
    expect(buildMaxBudgetCondition(null, 580)).toEqual({ $lte: 580 });
    expect(buildMaxBudgetCondition(580, null)).toEqual({ $gt: 580 });
    expect(buildMaxBudgetCondition(0, null)).toEqual({ $gte: 0 });
    expect(buildMaxBudgetCondition(null, null)).toBeNull();
  });
});

describe("employee rule intersected with UI budget filter", () => {
  it("intersects ranges before classifying by maxBudget", () => {
    const { min, max } = computeEffectiveRange({
      employeeRule: { enabled: true, min: 0, max: 580 },
      uiBudgetFrom: "100",
      uiBudgetTo: "900",
    });
    expect(min).toBe(100);
    expect(max).toBe(580);

    const { query } = queryForRange(min, max);
    expect(matchesMaxBudget(query.maxBudget as never, 100)).toBe(false);
    expect(matchesMaxBudget(query.maxBudget as never, 101)).toBe(true);
    expect(matchesMaxBudget(query.maxBudget as never, 580)).toBe(true);
    expect(matchesMaxBudget(query.maxBudget as never, 581)).toBe(false);
  });

  it("is impossible when the UI filter lies entirely in the lower band", () => {
    const { min, max } = computeEffectiveRange({
      employeeRule: { enabled: true, min: 580, max: 2500 },
      uiBudgetFrom: "0",
      uiBudgetTo: "580",
    });
    expect(queryForRange(min, max).impossible).toBe(true);
  });
});

describe("per-location pricing rules", () => {
  it("applies the maxBudget condition inside each location clause", () => {
    const query: Record<string, unknown> = {};
    const result = applyPricingRulesByLocationToQuery({
      query,
      pricingRules: {
        byLocation: {
          berlin: { enabled: true, min: 0, max: 580 },
          munich: { enabled: true, min: 580, max: 2500 },
        },
      },
      locations: ["Berlin", "Munich"],
    });

    expect(result.impossible).toBe(false);
    const and = query.$and as Array<{ $or: Array<Record<string, unknown>> }>;
    const clauses = and[0].$or;
    expect(clauses).toHaveLength(2);
    for (const clause of clauses) {
      expect(clause.minBudget).toBeUndefined();
      expect(clause.maxBudget).toBeDefined();
    }
    expect(clauses[0].maxBudget).toEqual({ $gte: 0, $lte: 580 });
    expect(clauses[1].maxBudget).toEqual({ $gt: 580, $lte: 2500 });
  });
});
