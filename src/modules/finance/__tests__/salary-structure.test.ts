import {
  monthlyFromAnnual,
  monthlySalaryHint,
  splitGrossSalary,
  toComponentAmounts,
  toMonthlyBreakdown,
} from "../salary-structure";

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

  it("labels each component with its share and annual and monthly amounts", () => {
    const amounts = toComponentAmounts(splitGrossSalary(120000));
    expect(
      amounts.map((component) => [component.label, component.percent, component.annual, component.monthly]),
    ).toEqual([
      ["Basic Salary", 50, 60000, 5000],
      ["HRA", 20, 24000, 2000],
      ["Conveyance Allowance", 4, 4800, 400],
      ["Medical Allowance", 2, 2400, 200],
      ["Special Allowance", 24, 28800, 2400],
    ]);
  });
});

describe("annual to monthly", () => {
  it("divides the annual salary by 12", () => {
    expect(monthlyFromAnnual(120000)).toBe(10000);
    expect(monthlyFromAnnual(100000)).toBe(8333.33);
    expect(monthlyFromAnnual(0)).toBe(0);
  });

  it("keeps monthly components equal to the monthly gross", () => {
    for (const annual of [100000, 333333, 450001, 1234567.89]) {
      const monthly = toMonthlyBreakdown(splitGrossSalary(annual));
      const parts =
        monthly.basic + monthly.hra + monthly.conveyance + monthly.medical + monthly.specialAllowance;
      expect(Math.round(parts * 100)).toBe(Math.round(monthly.gross * 100));
      expect(monthly.gross).toBe(monthlyFromAnnual(annual));
      expect(monthly.specialAllowance).toBeGreaterThanOrEqual(0);
    }
  });

  it("describes the monthly amount for an annual input", () => {
    expect(monthlySalaryHint("120000")).toContain("10,000.00");
    expect(monthlySalaryHint("")).toMatch(/divided by 12/);
  });
});
