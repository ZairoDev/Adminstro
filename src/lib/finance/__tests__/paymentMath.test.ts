import {
  computeCompleteAdjustment,
  computePendingAmount,
  validateSplitAllocations,
  AMOUNT_TOLERANCE,
} from "../paymentMath";

describe("computeCompleteAdjustment", () => {
  it("returns discount when paid < due (beyond tolerance)", () => {
    const result = computeCompleteAdjustment(50000, 45000);
    expect(result.discountGiven).toBe(5000);
    expect(result.newAmountDue).toBe(45000);
    expect(result.isOverpayment).toBe(false);
  });

  it("returns zero discount for exact match", () => {
    const result = computeCompleteAdjustment(50000, 50000);
    expect(result.discountGiven).toBe(0);
    expect(result.newAmountDue).toBe(50000);
  });

  it("returns zero discount within tolerance", () => {
    const result = computeCompleteAdjustment(50000, 49999.5);
    expect(result.discountGiven).toBe(0);
    expect(result.newAmountDue).toBe(50000);
  });

  it("detects overpayment", () => {
    const result = computeCompleteAdjustment(50000, 51000);
    expect(result.isOverpayment).toBe(true);
    expect(result.overpaymentAmount).toBe(1000);
    expect(result.discountGiven).toBe(0);
    expect(result.newAmountDue).toBe(50000);
  });

  it("treats difference exactly equal to AMOUNT_TOLERANCE as match (not discount)", () => {
    const result = computeCompleteAdjustment(50000, 50000 - AMOUNT_TOLERANCE);
    expect(result.discountGiven).toBe(0);
  });
});

describe("computePendingAmount", () => {
  it("returns the remaining balance", () => {
    expect(computePendingAmount(50000, 20000)).toBe(30000);
  });

  it("returns 0 when fully paid", () => {
    expect(computePendingAmount(50000, 50000)).toBe(0);
  });

  it("returns 0 (never negative) when overpaid", () => {
    expect(computePendingAmount(50000, 55000)).toBe(0);
  });
});

describe("validateSplitAllocations", () => {
  it("passes when sum equals totalAmount", () => {
    const result = validateSplitAllocations(
      [
        { amount: 25000 },
        { amount: 25000 },
      ],
      50000,
    );
    expect(result.valid).toBe(true);
  });

  it("passes when within tolerance", () => {
    const result = validateSplitAllocations(
      [{ amount: 25000 }, { amount: 24999.5 }],
      50000,
    );
    expect(result.valid).toBe(true);
  });

  it("fails when sum differs beyond tolerance", () => {
    const result = validateSplitAllocations(
      [{ amount: 20000 }, { amount: 20000 }],
      50000,
    );
    expect(result.valid).toBe(false);
    expect(result.difference).toBeGreaterThan(AMOUNT_TOLERANCE);
  });

  it("fails with fewer than 2 allocations", () => {
    const result = validateSplitAllocations([{ amount: 50000 }], 50000);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 2/);
  });
});
