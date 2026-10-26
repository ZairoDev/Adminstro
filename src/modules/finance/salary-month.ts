const TIME_ZONE = "Asia/Kolkata";
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const MAX_FUTURE_PAYROLL_MONTHS = 18;

export type PayrollMonth = {
  year: number;
  month: number;
  key: string;
};

function toPayrollMonth(year: number, month: number): PayrollMonth {
  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, "0")}`,
  };
}

export function currentPayrollMonth(now = new Date()): PayrollMonth {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(now);
  const [year, month] = formatted.split("-").map((part) => Number(part));
  return toPayrollMonth(year ?? now.getFullYear(), month ?? now.getMonth() + 1);
}

export function parsePayrollMonth(value: string): PayrollMonth | null {
  const match = MONTH_PATTERN.exec(value.trim());
  if (!match) return null;
  return toPayrollMonth(Number(match[1]), Number(match[2]));
}

export function addPayrollMonths(month: PayrollMonth, count: number): PayrollMonth {
  const index = month.year * 12 + (month.month - 1) + count;
  return toPayrollMonth(Math.floor(index / 12), (index % 12) + 1);
}

export function comparePayrollMonths(left: PayrollMonth, right: PayrollMonth): number {
  return left.year * 12 + left.month - (right.year * 12 + right.month);
}

export function payrollMonthLabel(month: PayrollMonth): string {
  const date = new Date(Date.UTC(month.year, month.month - 1, 1));
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysInPayrollMonth(month: PayrollMonth): number {
  return new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
}

export function lossOfPayDeduction(
  gross: number,
  daysInMonth: number,
  lossOfPayDays: number,
): number {
  if (daysInMonth <= 0 || lossOfPayDays <= 0 || gross <= 0) return 0;
  const grossPaise = Math.round(gross * 100);
  const deductionPaise = Math.round((grossPaise * lossOfPayDays) / daysInMonth);
  return Math.min(grossPaise, deductionPaise) / 100;
}

export function payrollMonthStart(month: PayrollMonth): Date {
  return new Date(`${month.key}-01T00:00:00+05:30`);
}

export function payrollMonthEnd(month: PayrollMonth): Date {
  const next = addPayrollMonths(month, 1);
  const startOfNext = new Date(`${next.key}-01T00:00:00+05:30`);
  return new Date(startOfNext.getTime() - 1);
}

export function payrollMonthKeyFromDate(value: Date): string | null {
  if (Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(value);
}

export function financialYearStart(month: PayrollMonth): PayrollMonth {
  const year = month.month >= 4 ? month.year : month.year - 1;
  return { year, month: 4, key: `${year}-04` };
}

export function payrollMonthsThrough(start: PayrollMonth, end: PayrollMonth): PayrollMonth[] {
  const months: PayrollMonth[] = [];
  let cursor = start;
  while (comparePayrollMonths(cursor, end) <= 0) {
    months.push(cursor);
    cursor = addPayrollMonths(cursor, 1);
    if (months.length > 24) break;
  }
  return months;
}

export function shortPayrollLabel(month: PayrollMonth): string {
  const date = new Date(Date.UTC(month.year, month.month - 1, 1));
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function latestOpenPayrollMonth(now = new Date()): PayrollMonth {
  return addPayrollMonths(currentPayrollMonth(now), MAX_FUTURE_PAYROLL_MONTHS);
}
