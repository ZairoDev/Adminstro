import mongoose, { type FilterQuery } from "mongoose";
import Employees from "@/models/employee";
import { escapeRegex } from "@/modules/finance/escape-regex";
import type { ListSalariesQuery } from "@/modules/finance/schemas/salary.schema";
import {
  salaryAmountsMatch,
  splitGrossSalary,
  toComponentAmounts,
  type SalaryBreakdown,
  type SalaryComponentAmount,
} from "@/modules/finance/salary-structure";
import {
  comparePayrollMonths,
  currentPayrollMonth,
  daysInPayrollMonth,
  latestOpenPayrollMonth,
  lossOfPayDeduction,
  parsePayrollMonth,
  payrollMonthEnd,
  payrollMonthKeyFromDate,
  payrollMonthLabel,
  payrollMonthStart,
  type PayrollMonth,
} from "@/modules/finance/salary-month";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";

export class EmployeeSalaryError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "EmployeeSalaryError";
    this.status = status;
  }
}

export type SalaryRevisionView = {
  gross: number;
  components: SalaryComponentAmount[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  updatedByName: string | null;
};

export type EmployeeSalaryRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeCode: string | null;
  role: string;
  organization: string;
  empType: string;
  dateOfJoining: string | null;
  salary: number;
  components: SalaryComponentAmount[];
  effectiveFrom: string | null;
  updatedByName: string | null;
  history: SalaryRevisionView[];
};

export type EmployeeSalaryList = {
  month: string;
  monthLabel: string;
  employees: EmployeeSalaryRow[];
  totalEmployees: number;
  totalSalary: number;
};

export type SalaryUpdateResult = {
  employee: EmployeeSalaryRow;
  changed: boolean;
};

type StoredRevision = {
  gross?: number;
  basic?: number;
  hra?: number;
  conveyance?: number;
  medical?: number;
  specialAllowance?: number;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
};

type SalaryDocument = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  phone?: string;
  employeeCode?: string | null;
  role?: string;
  organization?: string;
  empType?: string;
  dateOfJoining?: Date | string | null;
  createdAt?: Date | string | null;
  accountNo?: string | null;
  ifsc?: string | null;
  address?: string | null;
  isActive?: boolean;
  salary?: number | null;
  salaryStructure?: StoredRevision | null;
  salaryHistory?: StoredRevision[] | null;
};

const SALARY_FIELDS =
  "name email phone employeeCode role organization empType dateOfJoining createdAt accountNo ifsc address isActive salary salaryStructure salaryHistory";

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toSalary(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function isCompleteBreakdown(
  stored: StoredRevision | null | undefined,
): stored is Required<Pick<StoredRevision, keyof SalaryBreakdown>> & StoredRevision {
  return Boolean(
    stored &&
      typeof stored.gross === "number" &&
      typeof stored.basic === "number" &&
      typeof stored.hra === "number" &&
      typeof stored.conveyance === "number" &&
      typeof stored.medical === "number" &&
      typeof stored.specialAllowance === "number",
  );
}

function breakdownFromStored(
  stored: StoredRevision | null | undefined,
  fallbackGross: number,
): SalaryBreakdown {
  if (isCompleteBreakdown(stored)) {
    return {
      gross: stored.gross,
      basic: stored.basic,
      hra: stored.hra,
      conveyance: stored.conveyance,
      medical: stored.medical,
      specialAllowance: stored.specialAllowance,
    };
  }
  return splitGrossSalary(Math.max(0, fallbackGross));
}

function toRevisionView(stored: StoredRevision, fallbackGross: number): SalaryRevisionView {
  const breakdown = breakdownFromStored(stored, fallbackGross);
  return {
    gross: breakdown.gross,
    components: toComponentAmounts(breakdown),
    effectiveFrom: toIsoDate(stored.effectiveFrom),
    effectiveTo: toIsoDate(stored.effectiveTo),
    updatedByName: stored.updatedByName?.trim() || null,
  };
}

function covers(entry: StoredRevision, instant: Date): boolean {
  const from = entry.effectiveFrom ? new Date(entry.effectiveFrom) : null;
  const to = entry.effectiveTo ? new Date(entry.effectiveTo) : null;
  if (from && !Number.isNaN(from.getTime()) && from.getTime() > instant.getTime()) return false;
  if (to && !Number.isNaN(to.getTime()) && to.getTime() <= instant.getTime()) return false;
  return true;
}

function salaryAt(doc: SalaryDocument, instant: Date): {
  breakdown: SalaryBreakdown;
  effectiveFrom: string | null;
  updatedByName: string | null;
} {
  const candidates = [
    ...(doc.salaryHistory ?? []),
    ...(doc.salaryStructure ? [doc.salaryStructure] : []),
  ].filter((entry) => covers(entry, instant));

  candidates.sort((left, right) => {
    const leftFrom = left.effectiveFrom ? new Date(left.effectiveFrom).getTime() : 0;
    const rightFrom = right.effectiveFrom ? new Date(right.effectiveFrom).getTime() : 0;
    return rightFrom - leftFrom;
  });

  const chosen = candidates[0];
  return {
    breakdown: breakdownFromStored(chosen, toSalary(doc.salary)),
    effectiveFrom: toIsoDate(chosen?.effectiveFrom),
    updatedByName: chosen?.updatedByName?.trim() || null,
  };
}

function joinedAfterMonth(doc: SalaryDocument, month: PayrollMonth): boolean {
  if (!doc.dateOfJoining) return false;
  const joined = new Date(doc.dateOfJoining);
  const joinedKey = payrollMonthKeyFromDate(joined);
  return Boolean(joinedKey && joinedKey > month.key);
}

export function resolvePayrollMonth(value: string | undefined, now = new Date()): PayrollMonth {
  const current = currentPayrollMonth(now);
  if (!value) return current;
  const parsed = parsePayrollMonth(value);
  if (!parsed) {
    throw new EmployeeSalaryError(400, "Enter a valid month");
  }
  if (comparePayrollMonths(parsed, current) < 0) {
    throw new EmployeeSalaryError(400, "Salary months start from the current month");
  }
  if (comparePayrollMonths(parsed, latestOpenPayrollMonth(now)) > 0) {
    throw new EmployeeSalaryError(400, "Choose a month within the next 18 months");
  }
  return parsed;
}

function toRow(doc: SalaryDocument, asOf: Date = new Date()): EmployeeSalaryRow {
  const applicable = salaryAt(doc, asOf);
  const history = (doc.salaryHistory ?? [])
    .map((entry) => toRevisionView(entry, entry.gross ?? 0))
    .sort((left, right) => {
      const leftTime = left.effectiveTo ? new Date(left.effectiveTo).getTime() : 0;
      const rightTime = right.effectiveTo ? new Date(right.effectiveTo).getTime() : 0;
      return rightTime - leftTime;
    });

  return {
    id: doc._id.toString(),
    name: doc.name?.trim() || "Unnamed employee",
    email: doc.email?.trim() || "",
    phone: doc.phone?.trim() || "",
    employeeCode: doc.employeeCode?.trim() || null,
    role: doc.role?.trim() || "",
    organization: doc.organization?.trim() || "",
    empType: doc.empType?.trim() || "",
    dateOfJoining: toIsoDate(doc.dateOfJoining),
    salary: applicable.breakdown.gross,
    components: toComponentAmounts(applicable.breakdown),
    effectiveFrom: applicable.effectiveFrom,
    updatedByName: applicable.updatedByName,
    history,
  };
}

function sumSalary(rows: EmployeeSalaryRow[]): number {
  return rows.reduce((total, row) => total + row.salary, 0);
}

function buildFilter(params: ListSalariesQuery): FilterQuery<SalaryDocument> {
  const filter: FilterQuery<SalaryDocument> = {
    isActive: { $ne: false },
  };

  if (params.role !== "all") filter.role = params.role;

  const search = params.search.trim();
  if (search) {
    const pattern = escapeRegex(search);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
      { phone: { $regex: pattern, $options: "i" } },
      { employeeCode: { $regex: pattern, $options: "i" } },
    ];
  }

  return excludeTestAccountFromQuery(filter) as FilterQuery<SalaryDocument>;
}

export async function listEmployeeSalaries(
  params: ListSalariesQuery,
): Promise<EmployeeSalaryList> {
  const month = resolvePayrollMonth(params.month);
  const documents = (await Employees.find(buildFilter(params))
    .select(SALARY_FIELDS)
    .sort({ name: 1 })
    .lean()) as SalaryDocument[];

  await storeMissingStructures(documents);
  const asOf = payrollMonthEnd(month);
  const employees = documents.filter((document) => !joinedAfterMonth(document, month)).map((document) => toRow(document, asOf));

  return {
    month: month.key,
    monthLabel: payrollMonthLabel(month),
    employees,
    totalEmployees: employees.length,
    totalSalary: sumSalary(employees),
  };
}

async function storeMissingStructures(documents: SalaryDocument[]): Promise<void> {
  const operations = documents.flatMap((document) => {
    if (isCompleteBreakdown(document.salaryStructure)) return [];
    const breakdown = splitGrossSalary(Math.max(0, toSalary(document.salary)));
    const salaryStructure: StoredRevision = {
      ...breakdown,
      effectiveFrom: document.dateOfJoining ?? document.createdAt ?? new Date(),
      effectiveTo: null,
      updatedBy: null,
      updatedByName: null,
    };
    document.salaryStructure = salaryStructure;
    return [
      {
        updateOne: {
          filter: {
            _id: document._id,
            $or: [{ salaryStructure: { $exists: false } }, { salaryStructure: null }],
          },
          update: { $set: { salaryStructure } },
        },
      },
    ];
  });

  if (operations.length === 0) return;
  await Employees.bulkWrite(operations);
}

export function parseGrossSalary(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
    return Number(trimmed);
  }
  return null;
}

export async function updateEmployeeGrossSalary(input: {
  employeeId: string;
  gross: number;
  updatedById?: string;
  updatedByName?: string;
}): Promise<SalaryUpdateResult> {
  if (!mongoose.Types.ObjectId.isValid(input.employeeId)) {
    throw new EmployeeSalaryError(400, "Invalid employee");
  }

  const next = splitGrossSalary(input.gross);
  const employee = (await Employees.findById(input.employeeId)
    .select(SALARY_FIELDS)
    .lean()) as SalaryDocument | null;

  if (!employee) {
    throw new EmployeeSalaryError(404, "Employee not found");
  }

  const currentGross = isCompleteBreakdown(employee.salaryStructure)
    ? employee.salaryStructure.gross
    : toSalary(employee.salary);
  const hasStoredStructure = isCompleteBreakdown(employee.salaryStructure);
  const grossChanged = !salaryAmountsMatch(currentGross, next.gross);

  if (!grossChanged && hasStoredStructure) {
    return { employee: toRow(employee), changed: false };
  }

  const now = new Date();
  const salaryStructure: StoredRevision = {
    ...next,
    effectiveFrom: grossChanged
      ? now
      : employee.salaryStructure?.effectiveFrom ??
        employee.dateOfJoining ??
        employee.createdAt ??
        now,
    effectiveTo: null,
    updatedBy: grossChanged
      ? input.updatedById ?? null
      : employee.salaryStructure?.updatedBy ?? null,
    updatedByName: grossChanged
      ? input.updatedByName ?? null
      : employee.salaryStructure?.updatedByName ?? null,
  };
  const update: {
    $set: Record<string, unknown>;
    $push?: { salaryHistory: StoredRevision };
  } = {
    $set: {
      salary: next.gross,
      salaryStructure,
    },
  };

  if (grossChanged && currentGross > 0) {
    const previous = breakdownFromStored(employee.salaryStructure, currentGross);
    update.$push = {
      salaryHistory: {
        ...previous,
        effectiveFrom:
          employee.salaryStructure?.effectiveFrom ??
          employee.dateOfJoining ??
          employee.createdAt ??
          null,
        effectiveTo: now,
        updatedBy: employee.salaryStructure?.updatedBy ?? null,
        updatedByName: employee.salaryStructure?.updatedByName ?? null,
      },
    };
  }

  await Employees.updateOne({ _id: employee._id }, update);

  return {
    changed: grossChanged,
    employee: toRow({
      ...employee,
      salary: next.gross,
      salaryStructure,
      salaryHistory: update.$push
        ? [...(employee.salaryHistory ?? []), update.$push.salaryHistory]
        : employee.salaryHistory,
    }),
  };
}

function slipText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function readLossOfPayDays(value: string, daysInMonth: number): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new EmployeeSalaryError(400, "Enter loss of pay days as a number");
  }
  const days = Number(trimmed);
  if (days > daysInMonth) {
    throw new EmployeeSalaryError(
      400,
      `Loss of pay days cannot be more than ${daysInMonth} in this month`,
    );
  }
  return days;
}

export async function getEmployeeSalarySlip(
  employeeId: string,
  monthValue: string,
  lossOfPayDaysValue = "0",
) {
  const month = resolvePayrollMonth(monthValue);
  const monthLength = daysInPayrollMonth(month);
  const lossOfPayDays = readLossOfPayDays(lossOfPayDaysValue, monthLength);
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    throw new EmployeeSalaryError(400, "Invalid employee");
  }

  const employee = (await Employees.findById(employeeId)
    .select(SALARY_FIELDS)
    .lean()) as SalaryDocument | null;
  if (!employee || employee.isActive === false) {
    throw new EmployeeSalaryError(404, "Active employee not found");
  }
  if (joinedAfterMonth(employee, month)) {
    throw new EmployeeSalaryError(400, "This employee has not joined by that month");
  }

  const applicable = salaryAt(employee, payrollMonthEnd(month));
  const code = employee.employeeCode?.trim() || employee._id.toString().slice(-6).toUpperCase();
  const generatedOn = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const periodStart = payrollMonthStart(month);
  const periodEnd = payrollMonthEnd(month);
  const formatDay = (value: Date) =>
    value.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

  return {
    monthKey: month.key,
    monthLabel: payrollMonthLabel(month),
    slipNumber: `PAY-${month.key}-${code}`,
    periodLabel: `${formatDay(periodStart)} - ${formatDay(periodEnd)}`,
    employeeName: employee.name?.trim() || "Unnamed employee",
    employeeCode: employee.employeeCode?.trim() || null,
    role: employee.role?.trim() || "",
    organization: employee.organization?.trim() || "",
    empType: employee.empType?.trim() || "",
    dateOfJoining: toIsoDate(employee.dateOfJoining),
    email: employee.email?.trim() || "",
    phone: employee.phone?.trim() || "",
    accountNo: slipText(employee.accountNo),
    ifsc: slipText(employee.ifsc),
    address: slipText(employee.address),
    components: toComponentAmounts(applicable.breakdown),
    gross: applicable.breakdown.gross,
    lossOfPayDays,
    lossOfPayAmount: lossOfPayDeduction(
      applicable.breakdown.gross,
      monthLength,
      lossOfPayDays,
    ),
    generatedOn,
  };
}
