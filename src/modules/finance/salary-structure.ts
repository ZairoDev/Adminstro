const PAISE_PER_RUPEE = 100;
export const MONTHS_PER_YEAR = 12;

/**
 * Shares of the annual salary. The last component absorbs rounding so the parts equal the total.
 * Salary is entered and stored as an annual amount; monthly figures are annual divided by 12.
 */
export const SALARY_COMPONENTS = [
  { key: "basic", label: "Basic Salary", percent: 50 },
  { key: "hra", label: "HRA", percent: 20 },
  { key: "conveyance", label: "Conveyance Allowance", percent: 4 },
  { key: "medical", label: "Medical Allowance", percent: 2 },
  { key: "specialAllowance", label: "Special Allowance", percent: 24 },
] as const;

export type SalaryComponentKey = (typeof SALARY_COMPONENTS)[number]["key"];

/** Gross plus its components. Annual when stored, monthly after `toMonthlyBreakdown`. */
export type SalaryBreakdown = {
  gross: number;
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
};

export type SalaryComponentAmount = {
  key: SalaryComponentKey;
  label: string;
  percent: number;
  annual: number;
  monthly: number;
};

function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

function toPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function splitGrossSalary(gross: number): SalaryBreakdown {
  if (!Number.isFinite(gross) || gross < 0) {
    throw new Error("Gross salary must be a non-negative number");
  }

  const grossPaise = toPaise(gross);
  const basic = Math.round((grossPaise * 50) / 100);
  const hra = Math.round((grossPaise * 20) / 100);
  const conveyance = Math.round((grossPaise * 4) / 100);
  const medical = Math.round((grossPaise * 2) / 100);
  let specialAllowance = grossPaise - basic - hra - conveyance - medical;
  let basicPaise = basic;
  if (specialAllowance < 0) {
    basicPaise += specialAllowance;
    specialAllowance = 0;
  }

  return {
    gross: paiseToRupees(grossPaise),
    basic: paiseToRupees(basicPaise),
    hra: paiseToRupees(hra),
    conveyance: paiseToRupees(conveyance),
    medical: paiseToRupees(medical),
    specialAllowance: paiseToRupees(specialAllowance),
  };
}

/** Monthly salary for an annual amount: annual divided by 12, rounded to the paisa. */
export function monthlyFromAnnual(annual: number): number {
  if (!Number.isFinite(annual) || annual <= 0) return 0;
  return paiseToRupees(Math.round(toPaise(annual) / MONTHS_PER_YEAR));
}

/**
 * Annual breakdown divided by 12. Each part is rounded to the paisa and
 * Special Allowance absorbs the difference so the parts equal the monthly gross.
 */
export function toMonthlyBreakdown(annual: SalaryBreakdown): SalaryBreakdown {
  const grossPaise = Math.round(toPaise(annual.gross) / MONTHS_PER_YEAR);
  const monthlyPart = (value: number) => Math.round(toPaise(value) / MONTHS_PER_YEAR);
  const basic = monthlyPart(annual.basic);
  const hra = monthlyPart(annual.hra);
  const conveyance = monthlyPart(annual.conveyance);
  const medical = monthlyPart(annual.medical);
  let specialAllowance = grossPaise - basic - hra - conveyance - medical;
  let basicPaise = basic;
  if (specialAllowance < 0) {
    basicPaise += specialAllowance;
    specialAllowance = 0;
  }

  return {
    gross: paiseToRupees(grossPaise),
    basic: paiseToRupees(basicPaise),
    hra: paiseToRupees(hra),
    conveyance: paiseToRupees(conveyance),
    medical: paiseToRupees(medical),
    specialAllowance: paiseToRupees(specialAllowance),
  };
}

export function toComponentAmounts(annual: SalaryBreakdown): SalaryComponentAmount[] {
  const monthly = toMonthlyBreakdown(annual);
  return SALARY_COMPONENTS.map((component) => ({
    key: component.key,
    label: component.label,
    percent: component.percent,
    annual: annual[component.key],
    monthly: monthly[component.key],
  }));
}

export function salaryAmountsMatch(left: number, right: number): boolean {
  return toPaise(left) === toPaise(right);
}

/** Helper text for annual salary inputs, e.g. "Monthly salary: ₹8,333.33 (annual / 12)". */
export function monthlySalaryHint(annual: number | string | null | undefined): string {
  const value = typeof annual === "string" ? Number(annual.trim()) : annual;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "Enter the salary per year. Monthly pay is the annual salary divided by 12.";
  }
  const monthly = monthlyFromAnnual(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Monthly salary: ${monthly} (annual / 12)`;
}
