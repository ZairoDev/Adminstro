import AttendanceRecord from "@/models/attendanceRecord";
import PayrollAdjustment from "@/models/payrollAdjustment";
import { datesInPayrollMonth, istDateKey } from "@/modules/attendance/dates";
import { leaveCategoryForStatus } from "@/modules/attendance/calculate";
import type { AttendanceStatus, LeavePay, RecordLeaveCategory } from "@/modules/attendance/types";
import type { EmployeeSalarySheetRow } from "@/modules/finance/services/salary.service";
import {
  getEmployeeMonthSalary,
  listEmployeeSalaries,
} from "@/modules/finance/services/salary.service";
import type { ListSalariesQuery } from "@/modules/finance/schemas/salary.schema";
import type { UpdateSalarySheetBody } from "@/modules/finance/schemas/salary-sheet.schema";
import { parsePayrollMonth, payrollMonthLabel } from "@/modules/finance/salary-month";
import {
  EMPTY_PAYROLL_ADJUSTMENTS,
  salarySheetMoney,
  sheetDay,
  sheetWeekday,
  type PayrollAdjustments,
  type SalarySheetMoney,
  type SheetCountKey,
  type SheetDay,
} from "@/modules/finance/salary-sheet";

export type SalarySheetDate = {
  date: string;
  day: number;
  weekday: string;
  weekend: boolean;
  today: boolean;
};

export type SalarySheetLine = {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  role: string;
  organization: string;
  days: SheetDay[];
  counts: Record<SheetCountKey, number>;
  money: SalarySheetMoney;
};

export type SalarySheetView = {
  month: string;
  monthLabel: string;
  dates: SalarySheetDate[];
  rows: SalarySheetLine[];
  totals: {
    employees: number;
    monthlySalary: number;
    finalSalary: number;
    amount: number;
  };
  policyConfirmed: boolean;
};

type AttendanceCell = {
  status: AttendanceStatus;
  leavePay: LeavePay | null;
  leaveCategory: RecordLeaveCategory | null;
  isLate: boolean;
};

function adjustmentsFrom(stored: Partial<PayrollAdjustments> | null | undefined): PayrollAdjustments {
  return {
    pf: stored?.pf ?? 0,
    incentive: stored?.incentive ?? 0,
    casual: stored?.casual ?? 0,
    cash: stored?.cash ?? 0,
    advance: stored?.advance ?? 0,
    hold: stored?.hold ?? 0,
  };
}

function countsFor(row: EmployeeSalarySheetRow): Record<SheetCountKey, number> {
  return {
    presentDays: row.pay.presentDays,
    halfDays: row.pay.halfDays,
    uninformedLeaveDays: row.pay.unplannedLeaveDays,
    totalLeaveDays: row.pay.paidLeaveDays + row.pay.unpaidLeaveDays + row.pay.unplannedLeaveDays,
    paidLeaveDays: row.pay.paidLeaveDays,
    holidays: row.pay.holidays,
    weeklyOffs: row.pay.weeklyOffs,
  };
}

function lineFor(
  row: EmployeeSalarySheetRow,
  dates: string[],
  today: string,
  byEmployee: Map<string, Map<string, AttendanceCell>>,
  adjustments: PayrollAdjustments,
): SalarySheetLine {
  const cells = byEmployee.get(row.id);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    employeeCode: row.employeeCode,
    role: row.role,
    organization: row.organization,
    counts: countsFor(row),
    money: salarySheetMoney(row.salary, row.pay, adjustments),
    days: dates.map((date) => {
      const cell = cells?.get(date);
      return sheetDay({
        date,
        status: cell?.status ?? null,
        isLate: cell?.isLate ?? false,
        leaveCategory: cell?.leaveCategory ?? null,
        leavePay: cell?.leavePay ?? null,
        isFuture: date > today,
      });
    }),
  };
}

export async function getSalarySheet(params: ListSalariesQuery): Promise<SalarySheetView> {
  const listed = await listEmployeeSalaries(params);
  const month = parsePayrollMonth(listed.month);
  if (!month) {
    return {
      month: listed.month,
      monthLabel: listed.monthLabel,
      dates: [],
      rows: [],
      totals: { employees: 0, monthlySalary: 0, finalSalary: 0, amount: 0 },
      policyConfirmed: listed.policyConfirmed,
    };
  }

  const dateKeys = datesInPayrollMonth(month);
  const today = istDateKey(new Date());
  const ids = listed.employees.map((employee) => employee.id);
  const from = dateKeys[0] ?? `${month.key}-01`;
  const to = dateKeys[dateKeys.length - 1] ?? from;

  const [records, storedAdjustments] = await Promise.all([
    ids.length === 0
      ? Promise.resolve([])
      : AttendanceRecord.find({
          employeeId: { $in: ids },
          attendanceDate: { $gte: from, $lte: to },
        })
          .select("employeeId attendanceDate status leavePay leaveCategory isLate")
          .lean<
            {
              employeeId: string;
              attendanceDate: string;
              status: AttendanceStatus;
              leavePay?: LeavePay | null;
              leaveCategory?: RecordLeaveCategory | null;
              isLate?: boolean;
            }[]
          >(),
    ids.length === 0
      ? Promise.resolve([])
      : PayrollAdjustment.find({ employeeId: { $in: ids }, monthKey: month.key })
          .select("employeeId pf incentive casual cash advance hold")
          .lean<
            {
              employeeId: string;
              pf?: number;
              incentive?: number;
              casual?: number;
              cash?: number;
              advance?: number;
              hold?: number;
            }[]
          >(),
  ]);

  const byEmployee = new Map<string, Map<string, AttendanceCell>>();
  for (const record of records) {
    const days = byEmployee.get(record.employeeId) ?? new Map<string, AttendanceCell>();
    days.set(record.attendanceDate, {
      status: record.status,
      leavePay: record.leavePay ?? null,
      leaveCategory: leaveCategoryForStatus(record.status, record.leaveCategory ?? null),
      isLate: Boolean(record.isLate),
    });
    byEmployee.set(record.employeeId, days);
  }

  const adjustmentByEmployee = new Map<string, PayrollAdjustments>();
  for (const stored of storedAdjustments) {
    adjustmentByEmployee.set(stored.employeeId, adjustmentsFrom(stored));
  }

  const rows = listed.employees.map((employee) =>
    lineFor(
      employee,
      dateKeys,
      today,
      byEmployee,
      adjustmentByEmployee.get(employee.id) ?? EMPTY_PAYROLL_ADJUSTMENTS,
    ),
  );

  return {
    month: month.key,
    monthLabel: payrollMonthLabel(month),
    dates: dateKeys.map((date) => {
      const { weekday, weekend } = sheetWeekday(date);
      return {
        date,
        day: Number(date.slice(-2)),
        weekday,
        weekend,
        today: date === today,
      };
    }),
    rows,
    totals: {
      employees: rows.length,
      monthlySalary: rows.reduce((sum, row) => sum + row.money.monthlySalary, 0),
      finalSalary: rows.reduce((sum, row) => sum + row.money.finalSalary, 0),
      amount: rows.reduce((sum, row) => sum + row.money.amount, 0),
    },
    policyConfirmed: listed.policyConfirmed,
  };
}

export async function updateSalarySheetAdjustment(input: UpdateSalarySheetBody) {
  const employee = await getEmployeeMonthSalary(input.employeeId, input.month);
  const amount = Math.round(input.amount * 100) / 100;
  const stored = await PayrollAdjustment.findOneAndUpdate(
    { employeeId: input.employeeId, monthKey: input.month },
    { $set: { [input.field]: amount } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<{
    pf?: number;
    incentive?: number;
    casual?: number;
    cash?: number;
    advance?: number;
    hold?: number;
  } | null>();

  return {
    employeeId: employee.id,
    money: salarySheetMoney(employee.salary, employee.pay, adjustmentsFrom(stored)),
  };
}
