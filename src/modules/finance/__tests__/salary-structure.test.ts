import { splitGrossSalary, toComponentAmounts } from "../salary-structure";

describe("splitGrossSalary", () => {
  it("splits a round gross by the payroll percentages", () => {
    expect(splitGrossSalary(10000)).toEqual({
      gross: 10000,
      basic: 5000,
      hra: 2000,
      conveyance: 400,
      medical: 200,
      specialAllowance: 2400,
    });
  });

  it("keeps the parts equal to gross after rounding", () => {
    const breakdown = splitGrossSalary(33333);
    const parts =
      breakdown.basic +
      breakdown.hra +
      breakdown.conveyance +
      breakdown.medical +
      breakdown.specialAllowance;
    expect(parts).toBeCloseTo(breakdown.gross, 2);
  });

  it("never produces a negative component for whole-rupee amounts", () => {
    for (let rupees = 0; rupees <= 10000; rupees += 1) {
      const breakdown = splitGrossSalary(rupees);
      expect(breakdown.specialAllowance).toBeGreaterThanOrEqual(0);
      const parts =
        breakdown.basic +
        breakdown.hra +
        breakdown.conveyance +
        breakdown.medical +
        breakdown.specialAllowance;
      expect(Math.round(parts * 100)).toBe(Math.round(breakdown.gross * 100));
    }
  });

  it("rejects a negative gross", () => {
    expect(() => splitGrossSalary(-1)).toThrow(/non-negative/);
  });

  it("labels each component with its share of gross", () => {
    const amounts = toComponentAmounts(splitGrossSalary(10000));
    expect(amounts.map((component) => [component.label, component.percent, component.amount])).toEqual([
      ["Basic Salary", 50, 5000],
      ["HRA", 20, 2000],
      ["Conveyance Allowance", 4, 400],
      ["Medical Allowance", 2, 200],
      ["Special Allowance", 24, 2400],
    ]);
  });
});
