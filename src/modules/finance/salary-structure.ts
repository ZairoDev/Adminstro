const PAISE_PER_RUPEE = 100;

/** Shares of monthly gross. The last component absorbs rounding so the parts equal gross. */
export const SALARY_COMPONENTS = [
  { key: "basic", label: "Basic Salary", percent: 50 },
  { key: "hra", label: "HRA", percent: 20 },
  { key: "conveyance", label: "Conveyance Allowance", percent: 4 },
  { key: "medical", label: "Medical Allowance", percent: 2 },
  { key: "specialAllowance", label: "Special Allowance", percent: 24 },
] as const;

export type SalaryComponentKey = (typeof SALARY_COMPONENTS)[number]["key"];

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
  amount: number;
};

function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

export function splitGrossSalary(gross: number): SalaryBreakdown {
  if (!Number.isFinite(gross) || gross < 0) {
    throw new Error("Gross salary must be a non-negative number");
  }

  const grossPaise = Math.round(gross * PAISE_PER_RUPEE);
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

export function toComponentAmounts(breakdown: SalaryBreakdown): SalaryComponentAmount[] {
  return SALARY_COMPONENTS.map((component) => ({
    key: component.key,
    label: component.label,
    percent: component.percent,
    amount: breakdown[component.key],
  }));
}

export function salaryAmountsMatch(left: number, right: number): boolean {
  return Math.round(left * PAISE_PER_RUPEE) === Math.round(right * PAISE_PER_RUPEE);
}
