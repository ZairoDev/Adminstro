import mongoose from "mongoose";
import { istDateKey } from "@/modules/attendance/dates";
import {
  amountForMonth,
  baseAmountForMonth,
  changeFromPrevious,
  compareMonthKeys,
  previousMonthKey,
  recurringAppliesToMonth,
  reviseAmountHistory,
  roundRupees,
  summarizeExpenses,
  type ExpenseLine,
  type ExpenseTotals,
  type MonthChange,
  type SalaryExpense,
} from "@/modules/finance/expense-sheet";
import {
  Expense,
  RecurringExpense,
  RecurringExpenseMonth,
  type ExpenseDoc,
  type RecurringExpenseDoc,
  type RecurringExpenseMonthDoc,
} from "@/modules/finance/models/expense.model";
import type {
  CopyPreviousBody,
  CreateExpenseBody,
  CreateRecurringExpenseBody,
  ExpenseSheetQuery,
  RecurringMonthBody,
  UpdateExpenseBody,
  UpdateRecurringExpenseBody,
} from "@/modules/finance/schemas/expense.schema";
import {
  comparePayrollMonths,
  currentPayrollMonth,
  earliestPayrollMonth,
  latestOpenPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
  type PayrollMonth,
} from "@/modules/finance/salary-month";
import { listEmployeeSalaries } from "@/modules/finance/services/salary.service";

export class ExpenseError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ExpenseError";
    this.status = status;
  }
}

export type ExpenseSheetView = {
  month: string;
  monthLabel: string;
  salary: SalaryExpense;
  lines: ExpenseLine[];
  totals: ExpenseTotals;
  /** Total expense for the month before, or null when that month is outside the sheet range. */
  previousTotal: number | null;
  change: MonthChange | null;
  /** One-off expenses in the month before, which can be copied into this month. */
  previousOneOffCount: number;
};

export type Actor = { id?: string };

function resolveMonth(value: string | undefined, now = new Date()): PayrollMonth {
  if (!value) return currentPayrollMonth(now);
  const parsed = parsePayrollMonth(value);
  if (!parsed) throw new ExpenseError(400, "Enter a valid month");
  assertMonthInRange(parsed, now);
  return parsed;
}

function assertMonthInRange(month: PayrollMonth, now = new Date()): void {
  if (comparePayrollMonths(month, earliestPayrollMonth(now)) < 0) {
    throw new ExpenseError(400, "Expense months go back 12 months");
  }
  if (comparePayrollMonths(month, latestOpenPayrollMonth(now)) > 0) {
    throw new ExpenseError(400, "Choose a month within the next 18 months");
  }
}

function assertMonthKeyInRange(monthKey: string): PayrollMonth {
  const parsed = parsePayrollMonth(monthKey);
  if (!parsed) throw new ExpenseError(400, "Enter a valid month");
  assertMonthInRange(parsed);
  return parsed;
}

function requireObjectId(id: string, label: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ExpenseError(400, `Invalid ${label}`);
}

function parsePaidOn(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00+05:30`);
}

/** Paid items keep a paid date (default today); pending items have none. */
function paymentFields(
  status: "pending" | "paid" | undefined,
  paidOn: string | null | undefined,
  existing: { status: "pending" | "paid"; paidOn: Date | null },
  invoice?: { invoiceUrl?: string; invoiceName?: string },
): { status: "pending" | "paid"; paidOn: Date | null; invoiceUrl?: string; invoiceName?: string } {
  const nextStatus = status ?? existing.status;
  if (nextStatus === "pending") {
    return status === "pending"
      ? { status: "pending", paidOn: null, invoiceUrl: "", invoiceName: "" }
      : { status: "pending", paidOn: null };
  }
  if (status === "paid") {
    const invoiceUrl = invoice?.invoiceUrl?.trim() ?? "";
    const invoiceName = invoice?.invoiceName?.trim() ?? "";
    if (!invoiceUrl.startsWith("https://") || !invoiceName) {
      throw new ExpenseError(400, "Upload the invoice before marking this paid");
    }
    return {
      status: "paid",
      paidOn:
        paidOn !== undefined && paidOn !== null
          ? parsePaidOn(paidOn)
          : parsePaidOn(istDateKey(new Date())),
      invoiceUrl,
      invoiceName,
    };
  }
  if (paidOn !== undefined && paidOn !== null) return { status: "paid", paidOn: parsePaidOn(paidOn) };
  if (existing.status === "paid" && existing.paidOn && paidOn === undefined) {
    return { status: "paid", paidOn: existing.paidOn };
  }
  return { status: "paid", paidOn: parsePaidOn(istDateKey(new Date())) };
}

function recurringLine(
  template: RecurringExpenseDoc,
  state: RecurringExpenseMonthDoc | undefined,
  monthKey: string,
): ExpenseLine {
  const override = typeof state?.amountOverride === "number" ? state.amountOverride : null;
  return {
    id: template._id.toString(),
    source: "recurring",
    title: template.title,
    category: template.category,
    vendor: template.vendor ?? "",
    notes: template.notes ?? "",
    amount: amountForMonth(template.amountHistory ?? [], override, monthKey),
    status: state?.status ?? "pending",
    paidOn: state?.paidOn ? new Date(state.paidOn).toISOString() : null,
    frequency: template.frequency,
    startMonth: template.startMonth,
    endMonth: template.endMonth ?? null,
    skipped: Boolean(state?.skipped),
    baseAmount: baseAmountForMonth(template.amountHistory ?? [], monthKey),
    overridden: override !== null,
    invoiceUrl: state?.invoiceUrl?.trim() || null,
    invoiceName: state?.invoiceName?.trim() || null,
  };
}

function oneOffLine(doc: ExpenseDoc): ExpenseLine {
  return {
    id: doc._id.toString(),
    source: "oneOff",
    title: doc.title,
    category: doc.category,
    vendor: doc.vendor ?? "",
    notes: doc.notes ?? "",
    amount: roundRupees(doc.amount),
    status: doc.status,
    paidOn: doc.paidOn ? new Date(doc.paidOn).toISOString() : null,
    frequency: null,
    startMonth: null,
    endMonth: null,
    skipped: false,
    baseAmount: roundRupees(doc.amount),
    overridden: false,
    invoiceUrl: doc.invoiceUrl?.trim() || null,
    invoiceName: doc.invoiceName?.trim() || null,
  };
}

async function recurringLinesForMonth(monthKey: string): Promise<ExpenseLine[]> {
  const templates = await RecurringExpense.find({
    isActive: true,
    startMonth: { $lte: monthKey },
    $or: [{ endMonth: null }, { endMonth: { $exists: false } }, { endMonth: { $gte: monthKey } }],
  })
    .sort({ createdAt: 1 })
    .lean<RecurringExpenseDoc[]>();

  const due = templates.filter((template) =>
    recurringAppliesToMonth(
      {
        frequency: template.frequency,
        startMonth: template.startMonth,
        endMonth: template.endMonth ?? null,
        isActive: template.isActive,
      },
      monthKey,
    ),
  );
  if (due.length === 0) return [];

  const states = await RecurringExpenseMonth.find({
    monthKey,
    recurringExpenseId: { $in: due.map((template) => template._id.toString()) },
  }).lean<RecurringExpenseMonthDoc[]>();
  const byTemplate = new Map(states.map((state) => [state.recurringExpenseId, state]));
  return due.map((template) => recurringLine(template, byTemplate.get(template._id.toString()), monthKey));
}

async function oneOffLinesForMonth(monthKey: string): Promise<ExpenseLine[]> {
  const docs = await Expense.find({ monthKey }).sort({ createdAt: 1 }).lean<ExpenseDoc[]>();
  return docs.map(oneOffLine);
}

async function salaryExpenseFor(monthKey: string): Promise<SalaryExpense> {
  const listed = await listEmployeeSalaries({ search: "", role: "all", month: monthKey });
  const employees = listed.employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    employeeCode: employee.employeeCode,
    role: employee.role,
    monthlyGross: employee.monthlySalary,
    payable: employee.pay.payableSalary,
  }));
  return {
    total: roundRupees(employees.reduce((sum, employee) => sum + employee.payable, 0)),
    employeeCount: employees.length,
    employees,
  };
}

async function previousTotalFor(previousKey: string): Promise<number | null> {
  const previous = parsePayrollMonth(previousKey);
  if (!previous || comparePayrollMonths(previous, earliestPayrollMonth()) < 0) return null;
  const [salary, recurring, oneOff] = await Promise.all([
    salaryExpenseFor(previousKey),
    recurringLinesForMonth(previousKey),
    oneOffLinesForMonth(previousKey),
  ]);
  return summarizeExpenses(salary.total, [...recurring, ...oneOff]).total;
}

export async function getExpenseSheet(query: ExpenseSheetQuery): Promise<ExpenseSheetView> {
  const month = resolveMonth(query.month);
  const previousKey = previousMonthKey(month.key);
  const [salary, recurring, oneOff, previousTotal, previousOneOffCount] = await Promise.all([
    salaryExpenseFor(month.key),
    recurringLinesForMonth(month.key),
    oneOffLinesForMonth(month.key),
    previousTotalFor(previousKey),
    Expense.countDocuments({ monthKey: previousKey }),
  ]);
  const lines = [...recurring, ...oneOff];
  const totals = summarizeExpenses(salary.total, lines);
  return {
    month: month.key,
    monthLabel: payrollMonthLabel(month),
    salary,
    lines,
    totals,
    previousTotal,
    change: previousTotal === null ? null : changeFromPrevious(totals.total, previousTotal),
    previousOneOffCount,
  };
}

/* One-off expenses */

export async function createExpense(body: CreateExpenseBody, actor: Actor): Promise<ExpenseLine> {
  assertMonthKeyInRange(body.month);
  const payment = paymentFields(body.status, body.paidOn, { status: "pending", paidOn: null }, body);
  const created = await Expense.create({
    monthKey: body.month,
    title: body.title,
    category: body.category,
    vendor: body.vendor,
    notes: body.notes,
    amount: roundRupees(body.amount),
    ...payment,
    createdBy: actor.id ?? null,
  });
  return oneOffLine(created.toObject() as ExpenseDoc);
}

export async function updateExpense(id: string, body: UpdateExpenseBody): Promise<ExpenseLine> {
  requireObjectId(id, "expense");
  const existing = await Expense.findById(id).lean<ExpenseDoc | null>();
  if (!existing) throw new ExpenseError(404, "Expense not found");

  const set: Partial<ExpenseDoc> = {};
  if (body.title !== undefined) set.title = body.title;
  if (body.category !== undefined) set.category = body.category;
  if (body.vendor !== undefined) set.vendor = body.vendor;
  if (body.notes !== undefined) set.notes = body.notes;
  if (body.amount !== undefined) set.amount = roundRupees(body.amount);
  if (body.status !== undefined || body.paidOn !== undefined) {
    Object.assign(set, paymentFields(body.status, body.paidOn, existing, body));
  }

  const updated = await Expense.findByIdAndUpdate(id, { $set: set }, { new: true, runValidators: true }).lean<ExpenseDoc | null>();
  if (!updated) throw new ExpenseError(404, "Expense not found");
  return oneOffLine(updated);
}

export async function deleteExpense(id: string): Promise<void> {
  requireObjectId(id, "expense");
  const deleted = await Expense.findByIdAndDelete(id).lean();
  if (!deleted) throw new ExpenseError(404, "Expense not found");
}

export async function copyPreviousMonthExpenses(body: CopyPreviousBody, actor: Actor): Promise<{ copied: number }> {
  assertMonthKeyInRange(body.month);
  const sourceKey = previousMonthKey(body.month);
  const [source, existing] = await Promise.all([
    Expense.find({ monthKey: sourceKey }).sort({ createdAt: 1 }).lean<ExpenseDoc[]>(),
    Expense.find({ monthKey: body.month }).lean<ExpenseDoc[]>(),
  ]);
  const signature = (item: Pick<ExpenseDoc, "title" | "category" | "amount">) =>
    `${item.title.toLowerCase()}|${item.category}|${roundRupees(item.amount)}`;
  const present = new Set(existing.map(signature));
  const fresh = source.filter((item) => !present.has(signature(item)));
  if (fresh.length === 0) return { copied: 0 };

  await Expense.insertMany(
    fresh.map((item) => ({
      monthKey: body.month,
      title: item.title,
      category: item.category,
      vendor: item.vendor,
      notes: item.notes,
      amount: item.amount,
      status: "pending" as const,
      paidOn: null,
      invoiceUrl: "",
      invoiceName: "",
      createdBy: actor.id ?? null,
    })),
  );
  return { copied: fresh.length };
}

/* Recurring expenses */

export async function createRecurringExpense(
  body: CreateRecurringExpenseBody,
  actor: Actor,
): Promise<{ id: string }> {
  assertMonthKeyInRange(body.startMonth);
  const created = await RecurringExpense.create({
    title: body.title,
    category: body.category,
    vendor: body.vendor,
    notes: body.notes,
    frequency: body.frequency,
    startMonth: body.startMonth,
    endMonth: body.endMonth,
    isActive: true,
    amountHistory: [{ fromMonth: body.startMonth, amount: roundRupees(body.amount) }],
    createdBy: actor.id ?? null,
  });
  return { id: created._id.toString() };
}

export async function updateRecurringExpense(
  id: string,
  body: UpdateRecurringExpenseBody,
): Promise<void> {
  requireObjectId(id, "recurring expense");
  const template = await RecurringExpense.findById(id).lean<RecurringExpenseDoc | null>();
  if (!template) throw new ExpenseError(404, "Recurring expense not found");

  if (body.action === "details") {
    const set: Partial<RecurringExpenseDoc> = {};
    if (body.title !== undefined) set.title = body.title;
    if (body.category !== undefined) set.category = body.category;
    if (body.vendor !== undefined) set.vendor = body.vendor;
    if (body.notes !== undefined) set.notes = body.notes;
    if (body.frequency !== undefined) set.frequency = body.frequency;
    await RecurringExpense.updateOne({ _id: id }, { $set: set }, { runValidators: true });
    return;
  }

  if (body.action === "amount") {
    assertMonthKeyInRange(body.fromMonth);
    if (compareMonthKeys(body.fromMonth, template.startMonth) < 0) {
      throw new ExpenseError(400, "The new amount cannot start before this expense does");
    }
    const amountHistory = reviseAmountHistory(template.amountHistory ?? [], body.fromMonth, body.amount);
    await RecurringExpense.updateOne({ _id: id }, { $set: { amountHistory } });
    return;
  }

  if (compareMonthKeys(body.lastMonth, template.startMonth) < 0) {
    throw new ExpenseError(400, "The last month cannot be before the start month");
  }
  await RecurringExpense.updateOne({ _id: id }, { $set: { endMonth: body.lastMonth } });
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  requireObjectId(id, "recurring expense");
  const deleted = await RecurringExpense.findByIdAndDelete(id).lean();
  if (!deleted) throw new ExpenseError(404, "Recurring expense not found");
  await RecurringExpenseMonth.deleteMany({ recurringExpenseId: id });
}

export async function setRecurringExpenseMonth(
  id: string,
  monthKey: string,
  body: RecurringMonthBody,
): Promise<ExpenseLine> {
  requireObjectId(id, "recurring expense");
  assertMonthKeyInRange(monthKey);
  const template = await RecurringExpense.findById(id).lean<RecurringExpenseDoc | null>();
  if (!template) throw new ExpenseError(404, "Recurring expense not found");
  const due = recurringAppliesToMonth(
    {
      frequency: template.frequency,
      startMonth: template.startMonth,
      endMonth: template.endMonth ?? null,
      isActive: template.isActive,
    },
    monthKey,
  );
  if (!due) throw new ExpenseError(400, "This expense is not due in that month");

  const existing = await RecurringExpenseMonth.findOne({
    recurringExpenseId: id,
    monthKey,
  }).lean<RecurringExpenseMonthDoc | null>();

  const set: Partial<RecurringExpenseMonthDoc> = {};
  if (body.skipped !== undefined) set.skipped = body.skipped;
  if (body.amountOverride !== undefined) {
    set.amountOverride = body.amountOverride === null ? null : roundRupees(body.amountOverride);
  }
  if (body.status !== undefined || body.paidOn !== undefined) {
    Object.assign(
      set,
      paymentFields(
        body.status,
        body.paidOn,
        {
          status: existing?.status ?? "pending",
          paidOn: existing?.paidOn ?? null,
        },
        body,
      ),
    );
  }

  const saved = await RecurringExpenseMonth.findOneAndUpdate(
    { recurringExpenseId: id, monthKey },
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  ).lean<RecurringExpenseMonthDoc | null>();
  return recurringLine(template, saved ?? undefined, monthKey);
}
