import { weekdayIndex } from "@/modules/attendance/dates";
import { statusLabel } from "@/modules/attendance/presentation";
import type { AttendanceStatus, LeavePay, RecordLeaveCategory } from "@/modules/attendance/types";
import { splitGrossSalary } from "@/modules/finance/salary-structure";
import type { AttendancePay } from "@/modules/finance/salary-month";

export const PAYROLL_ADJUSTMENT_FIELDS = [
  "pf",
  "incentive",
  "casual",
  "cash",
  "advance",
  "hold",
] as const;

export type PayrollAdjustmentField = (typeof PAYROLL_ADJUSTMENT_FIELDS)[number];

export type PayrollAdjustments = Record<PayrollAdjustmentField, number>;

export const EMPTY_PAYROLL_ADJUSTMENTS: PayrollAdjustments = {
  pf: 0,
  incentive: 0,
  casual: 0,
  cash: 0,
  advance: 0,
  hold: 0,
};

export type SalarySheetMoney = PayrollAdjustments & {
  monthlySalary: number;
  totalDays: number;
  actualDays: number;
  lopDays: number;
  perDaySalary: number;
  lopAmount: number;
  joiningDeduction: number;
  gross: number;
  finalSalary: number;
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  total: number;
  earnedNet: number;
  bank: number;
  net: number;
  amount: number;
};

function rupees(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * One employee, one month.
 * Final is the monthly salary after attendance loss of pay and days before joining.
 * Basic, HRA, conveyance, medical and special allowance are that final amount split
 * on the salary structure. PF, incentive, casual, cash, advance and hold are entered
 * for the month. Amount is what is left to release.
 */
export function salarySheetMoney(
  monthlySalary: number,
  pay: Pick<
    AttendancePay,
    | "totalDays"
    | "payableDays"
    | "lopDays"
    | "perDaySalary"
    | "lossOfPayAmount"
    | "joiningDeduction"
    | "payableSalary"
  >,
  adjustments: PayrollAdjustments,
): SalarySheetMoney {
  const finalSalary = pay.payableSalary;
  const earned = splitGrossSalary(Math.max(0, finalSalary));
  const total = rupees(finalSalary - adjustments.pf + adjustments.incentive + adjustments.casual);
  const earnedNet = total;
  const bank = rupees(earnedNet - adjustments.cash);
  const net = rupees(bank - adjustments.advance);
  const amount = rupees(net - adjustments.hold);

  return {
    monthlySalary,
    totalDays: pay.totalDays,
    actualDays: pay.payableDays,
    lopDays: pay.lopDays,
    perDaySalary: pay.perDaySalary,
    lopAmount: pay.lossOfPayAmount,
    joiningDeduction: pay.joiningDeduction,
    gross: finalSalary,
    finalSalary,
    basic: earned.basic,
    hra: earned.hra,
    conveyance: earned.conveyance,
    medical: earned.medical,
    specialAllowance: earned.specialAllowance,
    pf: adjustments.pf,
    incentive: adjustments.incentive,
    casual: adjustments.casual,
    total,
    earnedNet,
    cash: adjustments.cash,
    bank,
    advance: adjustments.advance,
    net,
    hold: adjustments.hold,
    amount,
  };
}

export type SheetDayTone =
  | "present"
  | "half"
  | "uninformed"
  | "absent"
  | "leave"
  | "paid"
  | "holiday"
  | "off"
  | "pending"
  | "notJoined"
  | "empty";

export type SheetDay = {
  date: string;
  letter: string;
  label: string;
  tone: SheetDayTone;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function sheetWeekday(dateKey: string): { weekday: string; weekend: boolean } {
  const index = weekdayIndex(dateKey);
  return {
    weekday: WEEKDAYS[index] ?? "",
    weekend: index === 0 || index === 6,
  };
}

export function sheetDay(input: {
  date: string;
  status: AttendanceStatus | null;
  isLate: boolean;
  leaveCategory: RecordLeaveCategory | null;
  leavePay: LeavePay | null;
  isFuture: boolean;
}): SheetDay {
  if (!input.status) {
    return {
      date: input.date,
      letter: "",
      label: input.isFuture ? "Not yet" : "No attendance",
      tone: "empty",
    };
  }

  if (input.status === "present" || input.status === "work_from_home") {
    const late = input.isLate && input.status === "present";
    return {
      date: input.date,
      letter: input.status === "work_from_home" ? "WF" : "P",
      label: late ? "Late" : statusLabel(input.status, false, null),
      tone: "present",
    };
  }
  if (input.status === "half_day") {
    return { date: input.date, letter: "HD", label: "Half day", tone: "half" };
  }
  if (input.status === "holiday") {
    return { date: input.date, letter: "H", label: "Holiday", tone: "holiday" };
  }
  if (input.status === "weekly_off") {
    return { date: input.date, letter: "WO", label: "Weekly off", tone: "off" };
  }
  if (input.status === "not_joined") {
    return { date: input.date, letter: "NJ", label: "Not joined", tone: "notJoined" };
  }
  if (input.status === "pending_verification") {
    return { date: input.date, letter: "PV", label: "Pending", tone: "pending" };
  }
  if (input.status === "absent" || input.leaveCategory === "unapproved") {
    return { date: input.date, letter: "A", label: "Absent", tone: "absent" };
  }
  if (input.leaveCategory === "unplanned") {
    return { date: input.date, letter: "UL", label: "Uninformed leave", tone: "uninformed" };
  }
  if (input.leavePay === "paid") {
    return { date: input.date, letter: "PL", label: "Paid leave", tone: "paid" };
  }
  if (input.status === "on_leave") {
    return { date: input.date, letter: "L", label: "Unpaid leave", tone: "leave" };
  }
  return {
    date: input.date,
    letter: "",
    label: statusLabel(input.status, input.isLate, input.leaveCategory),
    tone: "empty",
  };
}

export type SheetCountKey =
  | "presentDays"
  | "halfDays"
  | "uninformedLeaveDays"
  | "totalLeaveDays"
  | "paidLeaveDays"
  | "holidays"
  | "weeklyOffs";

export type SheetMoneyKey = keyof SalarySheetMoney;

export const SHEET_COUNT_COLUMNS: Array<{ key: SheetCountKey; label: string }> = [
  { key: "presentDays", label: "Present" },
  { key: "halfDays", label: "Half day" },
  { key: "uninformedLeaveDays", label: "Uninformed" },
  { key: "totalLeaveDays", label: "Total leave" },
  { key: "paidLeaveDays", label: "Paid leave" },
  { key: "holidays", label: "Holidays" },
  { key: "weeklyOffs", label: "WO" },
];

export const SHEET_PAY_COLUMNS: Array<{ key: SheetMoneyKey; label: string; hint: string }> = [
  { key: "totalDays", label: "Total days", hint: "Calendar days in the month" },
  { key: "actualDays", label: "Actual days", hint: "Total days minus loss of pay and days before joining" },
  { key: "lopDays", label: "LOP days", hint: "Absence, half day, unpaid leave, and unplanned leave" },
  { key: "monthlySalary", label: "Salary", hint: "Annual salary divided by 12, before attendance" },
  { key: "perDaySalary", label: "Per day", hint: "Monthly salary (annual / 12) divided by the days in the month" },
  { key: "gross", label: "Gross", hint: "Salary after loss of pay and days before joining" },
  { key: "finalSalary", label: "Final", hint: "Same as gross, before PF, incentive, and casual" },
];

export const SHEET_BREAKUP_COLUMNS: Array<{ key: SheetMoneyKey; label: string; hint: string }> = [
  { key: "basic", label: "Basic", hint: "50% of final" },
  { key: "hra", label: "HRA", hint: "20% of final" },
  { key: "conveyance", label: "Conveyance", hint: "4% of final" },
  { key: "medical", label: "Medical", hint: "2% of final" },
  { key: "specialAllowance", label: "Special", hint: "24% of final" },
];

export const SHEET_ADJUSTMENT_COLUMNS: Array<{ key: PayrollAdjustmentField; label: string; hint: string }> = [
  { key: "pf", label: "PF", hint: "Deducted from final" },
  { key: "incentive", label: "Incentive", hint: "Added to final" },
  { key: "casual", label: "Casual", hint: "Added to final" },
];

export const SHEET_PAYOUT_COLUMNS: Array<{
  key: SheetMoneyKey;
  label: string;
  hint: string;
  editable?: PayrollAdjustmentField;
}> = [
  { key: "total", label: "Total", hint: "Final minus PF, plus incentive and casual" },
  { key: "earnedNet", label: "Net", hint: "Same as total, before cash, advance, and hold" },
  { key: "cash", label: "Cash", hint: "Amount paid in cash", editable: "cash" },
  { key: "bank", label: "Bank", hint: "Net minus cash" },
  { key: "advance", label: "Advance", hint: "Salary advance recovered this month", editable: "advance" },
  { key: "net", label: "Net pay", hint: "Bank minus advance" },
  { key: "hold", label: "Hold", hint: "Amount held back this month", editable: "hold" },
  { key: "amount", label: "Amount", hint: "Net pay minus hold. This is what is released." },
];

const DAY_KEYS = new Set<SheetMoneyKey>(["totalDays", "actualDays", "lopDays"]);

export function sheetNumber(key: SheetMoneyKey, value: number): string {
  if (DAY_KEYS.has(key)) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function salarySheetCsv(input: {
  monthLabel: string;
  dates: string[];
  rows: Array<{
    name: string;
    employeeCode: string | null;
    role: string;
    days: SheetDay[];
    counts: Record<SheetCountKey, number>;
    money: SalarySheetMoney;
  }>;
}): string {
  const headers = [
    "Employee",
    "Code",
    "Role",
    ...input.dates,
    ...SHEET_COUNT_COLUMNS.map((column) => column.label),
    ...SHEET_PAY_COLUMNS.map((column) => column.label),
    ...SHEET_BREAKUP_COLUMNS.map((column) => column.label),
    ...SHEET_ADJUSTMENT_COLUMNS.map((column) => column.label),
    ...SHEET_PAYOUT_COLUMNS.map((column) => column.label),
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const row of input.rows) {
    const values = [
      row.name,
      row.employeeCode ?? "",
      row.role,
      ...input.dates.map((date) => row.days.find((day) => day.date === date)?.letter ?? ""),
      ...SHEET_COUNT_COLUMNS.map((column) => row.counts[column.key]),
      ...SHEET_PAY_COLUMNS.map((column) => row.money[column.key]),
      ...SHEET_BREAKUP_COLUMNS.map((column) => row.money[column.key]),
      ...SHEET_ADJUSTMENT_COLUMNS.map((column) => row.money[column.key]),
      ...SHEET_PAYOUT_COLUMNS.map((column) => row.money[column.key]),
    ];
    lines.push(values.map((value) => csvCell(value)).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
