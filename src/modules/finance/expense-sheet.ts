/**
 * Expense sheet rules. Pure functions with no database access.
 *
 * A month shows three kinds of lines:
 * - Salaries: payable salary of active employees, calculated elsewhere and locked here.
 * - Recurring: templates that repeat monthly, quarterly or yearly, with optional
 *   per-month skip, amount override and paid status.
 * - One-off: expenses added for that month only.
 */

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Software",
  "Marketing",
  "Travel",
  "Office",
  "Taxes and Compliance",
  "Professional Fees",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = ["pending", "paid"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const RECURRING_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  monthly: "Every month",
  quarterly: "Every 3 months",
  yearly: "Every year",
};

export const SALARIES_CATEGORY = "Salaries" as const;
export type CategoryTotalKey = ExpenseCategory | typeof SALARIES_CATEGORY;

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

function monthIndex(monthKey: string): number {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (!match) throw new Error(`Invalid month: ${monthKey}`);
  return Number(match[1]) * 12 + (Number(match[2]) - 1);
}

export function previousMonthKey(monthKey: string): string {
  const index = monthIndex(monthKey) - 1;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function compareMonthKeys(left: string, right: string): number {
  return monthIndex(left) - monthIndex(right);
}

export function roundRupees(value: number): number {
  return Math.round(value * 100) / 100;
}

export type RecurringDefinition = {
  frequency: RecurringFrequency;
  startMonth: string;
  endMonth: string | null;
  isActive: boolean;
};

/** Whether a recurring expense falls due in the month. Quarterly and yearly count from the start month. */
export function recurringAppliesToMonth(definition: RecurringDefinition, monthKey: string): boolean {
  if (!definition.isActive) return false;
  if (compareMonthKeys(monthKey, definition.startMonth) < 0) return false;
  if (definition.endMonth && compareMonthKeys(monthKey, definition.endMonth) > 0) return false;
  const elapsed = monthIndex(monthKey) - monthIndex(definition.startMonth);
  if (definition.frequency === "monthly") return true;
  if (definition.frequency === "quarterly") return elapsed % 3 === 0;
  return elapsed % 12 === 0;
}

export type AmountRevision = { fromMonth: string; amount: number };

/** The amount in force for a month: the latest revision that starts on or before it. */
export function baseAmountForMonth(history: AmountRevision[], monthKey: string): number {
  let chosen: AmountRevision | null = null;
  for (const revision of history) {
    if (compareMonthKeys(revision.fromMonth, monthKey) > 0) continue;
    if (!chosen || compareMonthKeys(revision.fromMonth, chosen.fromMonth) >= 0) chosen = revision;
  }
  return chosen ? roundRupees(chosen.amount) : 0;
}

export function amountForMonth(
  history: AmountRevision[],
  override: number | null,
  monthKey: string,
): number {
  return override === null ? baseAmountForMonth(history, monthKey) : roundRupees(override);
}

/** New history after setting an amount from a month onward. Later revisions are dropped. */
export function reviseAmountHistory(
  history: AmountRevision[],
  fromMonth: string,
  amount: number,
): AmountRevision[] {
  const kept = history.filter((revision) => compareMonthKeys(revision.fromMonth, fromMonth) < 0);
  return [...kept, { fromMonth, amount: roundRupees(amount) }].sort((left, right) =>
    compareMonthKeys(left.fromMonth, right.fromMonth),
  );
}

export type ExpenseLine = {
  /** Recurring template id or one-off expense id. */
  id: string;
  source: "recurring" | "oneOff";
  title: string;
  category: ExpenseCategory;
  vendor: string;
  notes: string;
  amount: number;
  status: ExpenseStatus;
  paidOn: string | null;
  frequency: RecurringFrequency | null;
  startMonth: string | null;
  endMonth: string | null;
  skipped: boolean;
  /** Amount from the template before any override for this month. */
  baseAmount: number;
  overridden: boolean;
  /** Invoice uploaded when this line was marked paid. */
  invoiceUrl: string | null;
  invoiceName: string | null;
};

export type SalaryExpenseEmployee = {
  id: string;
  name: string;
  employeeCode: string | null;
  role: string;
  monthlyGross: number;
  payable: number;
};

export type SalaryExpense = {
  total: number;
  employeeCount: number;
  employees: SalaryExpenseEmployee[];
};

export type CategoryTotal = { category: CategoryTotalKey; amount: number };

export type ExpenseTotals = {
  salaries: number;
  recurring: number;
  oneOff: number;
  total: number;
  /** Paid and pending cover recurring and one-off lines. Salaries are tracked in the salary sheet. */
  paid: number;
  pending: number;
  categories: CategoryTotal[];
};

export function summarizeExpenses(salaryTotal: number, lines: ExpenseLine[]): ExpenseTotals {
  let recurring = 0;
  let oneOff = 0;
  let paid = 0;
  let pending = 0;
  const byCategory = new Map<CategoryTotalKey, number>();
  if (salaryTotal > 0) byCategory.set(SALARIES_CATEGORY, salaryTotal);

  for (const line of lines) {
    if (line.skipped) continue;
    if (line.source === "recurring") recurring += line.amount;
    else oneOff += line.amount;
    if (line.status === "paid") paid += line.amount;
    else pending += line.amount;
    byCategory.set(line.category, (byCategory.get(line.category) ?? 0) + line.amount);
  }

  const categories = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount: roundRupees(amount) }))
    .filter((entry) => entry.amount > 0)
    .sort((left, right) => right.amount - left.amount);

  return {
    salaries: roundRupees(salaryTotal),
    recurring: roundRupees(recurring),
    oneOff: roundRupees(oneOff),
    total: roundRupees(salaryTotal + recurring + oneOff),
    paid: roundRupees(paid),
    pending: roundRupees(pending),
    categories,
  };
}

export type MonthChange = { amount: number; percent: number | null };

export function changeFromPrevious(current: number, previous: number): MonthChange {
  const amount = roundRupees(current - previous);
  return { amount, percent: previous > 0 ? Math.round((amount / previous) * 1000) / 10 : null };
}

export type ExpenseFilters = {
  search: string;
  category: ExpenseCategory | "all";
  status: ExpenseStatus | "all";
};

export function filterExpenseLines(lines: ExpenseLine[], filters: ExpenseFilters): ExpenseLine[] {
  const needle = filters.search.trim().toLowerCase();
  return lines.filter((line) => {
    if (filters.category !== "all" && line.category !== filters.category) return false;
    if (filters.status !== "all" && line.status !== filters.status) return false;
    if (!needle) return true;
    return [line.title, line.vendor, line.notes, line.category].some((value) =>
      value.toLowerCase().includes(needle),
    );
  });
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** One person's salary for the month, split the way the salary sheet pays it. */
export type ExpenseRegisterSalary = {
  id: string;
  name: string;
  employeeCode: string | null;
  role: string;
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  gross: number;
  pf: number;
  /** Incentive and casual added on top of gross. */
  additions: number;
  /** Cash, advance, and hold taken off before release. */
  deductions: number;
  /** What is left to pay: gross − PF + additions − deductions. */
  amount: number;
};

export type ExpenseRegisterLine = {
  id: string;
  title: string;
  category: string;
  kind: string;
  vendor: string;
  amount: number;
  status: "paid" | "pending" | "skipped";
  paidOn: string | null;
  invoiceUrl: string | null;
  invoiceName: string | null;
};

export type ExpenseRegisterTotals = {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  gross: number;
  pf: number;
  additions: number;
  deductions: number;
  salaries: number;
  expenses: number;
  paid: number;
  pending: number;
  grandTotal: number;
};

export type ExpenseRegister = {
  month: string;
  monthLabel: string;
  salaries: ExpenseRegisterSalary[];
  expenses: ExpenseRegisterLine[];
  totals: ExpenseRegisterTotals;
};

const SALARY_SUM_KEYS = [
  "basic",
  "hra",
  "conveyance",
  "medical",
  "specialAllowance",
  "gross",
  "pf",
  "additions",
  "deductions",
  "amount",
] as const;

/** Monthly tax sheet: every salary that was made, then the other expenses for that month. */
export function buildExpenseRegister(input: {
  month: string;
  monthLabel: string;
  salaries: ExpenseRegisterSalary[];
  lines: ExpenseLine[];
}): ExpenseRegister {
  const salaries = [...input.salaries].sort((left, right) => left.name.localeCompare(right.name));
  const expenses: ExpenseRegisterLine[] = input.lines.map((line) => ({
    id: `${line.source}:${line.id}`,
    title: line.title,
    category: line.category,
    kind: line.source === "recurring" && line.frequency ? FREQUENCY_LABELS[line.frequency] : "One-off",
    vendor: line.vendor,
    amount: line.amount,
    status: line.skipped ? "skipped" : line.status,
    paidOn: line.paidOn,
    invoiceUrl: line.invoiceUrl,
    invoiceName: line.invoiceName,
  }));

  const sums = Object.fromEntries(SALARY_SUM_KEYS.map((key) => [key, 0])) as Record<
    (typeof SALARY_SUM_KEYS)[number],
    number
  >;
  for (const salary of salaries) {
    for (const key of SALARY_SUM_KEYS) sums[key] += salary[key];
  }

  let expensesTotal = 0;
  let paid = 0;
  let pending = 0;
  for (const expense of expenses) {
    if (expense.status === "skipped") continue;
    expensesTotal += expense.amount;
    if (expense.status === "paid") paid += expense.amount;
    else pending += expense.amount;
  }

  const salariesTotal = roundRupees(sums.amount);
  const countedExpenses = roundRupees(expensesTotal);

  return {
    month: input.month,
    monthLabel: input.monthLabel,
    salaries,
    expenses,
    totals: {
      basic: roundRupees(sums.basic),
      hra: roundRupees(sums.hra),
      conveyance: roundRupees(sums.conveyance),
      medical: roundRupees(sums.medical),
      specialAllowance: roundRupees(sums.specialAllowance),
      gross: roundRupees(sums.gross),
      pf: roundRupees(sums.pf),
      additions: roundRupees(sums.additions),
      deductions: roundRupees(sums.deductions),
      salaries: salariesTotal,
      expenses: countedExpenses,
      paid: roundRupees(paid),
      pending: roundRupees(pending),
      grandTotal: roundRupees(salariesTotal + countedExpenses),
    },
  };
}

export function expenseRegisterCsv(register: ExpenseRegister): string {
  const headers = [
    "Section",
    "Particulars",
    "Code or vendor",
    "Head",
    "Category",
    "Basic",
    "HRA",
    "Conveyance",
    "Medical",
    "Special allowance",
    "Gross",
    "PF",
    "Additions",
    "Deductions",
    "Amount",
    "Status",
    "Paid on",
    "Invoice",
  ];
  const salaryRows = register.salaries.map((salary) => [
    "Salary",
    salary.name,
    salary.employeeCode ?? "",
    salary.role,
    SALARIES_CATEGORY,
    salary.basic,
    salary.hra,
    salary.conveyance,
    salary.medical,
    salary.specialAllowance,
    salary.gross,
    salary.pf,
    salary.additions,
    salary.deductions,
    salary.amount,
    "Made",
    "",
    "",
  ]);
  const expenseRows = register.expenses.map((expense) => [
    "Expense",
    expense.title,
    expense.vendor,
    expense.kind,
    expense.category,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    expense.status === "skipped" ? 0 : expense.amount,
    expense.status,
    expense.paidOn ? expense.paidOn.slice(0, 10) : "",
    expense.invoiceUrl ?? "",
  ]);
  const totals = register.totals;
  const footer = [
    "Total",
    register.monthLabel,
    "",
    "",
    "",
    totals.basic,
    totals.hra,
    totals.conveyance,
    totals.medical,
    totals.specialAllowance,
    totals.gross,
    totals.pf,
    totals.additions,
    totals.deductions,
    totals.grandTotal,
    "",
    "",
    "",
  ];
  return [headers, ...salaryRows, ...expenseRows, footer].map((record) => record.map(csvCell).join(",")).join("\n");
}

export function expenseSheetCsv(input: {
  monthLabel: string;
  salary: SalaryExpense;
  lines: ExpenseLine[];
}): string {
  const headers = ["Type", "Item", "Category", "Vendor", "Frequency", "Amount", "Status", "Paid on", "Invoice", "Notes"];
  const rows: Array<Array<string | number>> = [
    ["Salary", `Salaries (${input.salary.employeeCount} employees)`, SALARIES_CATEGORY, "", "Every month", input.salary.total, "", "", "", `Payable salary for ${input.monthLabel}`],
  ];
  for (const line of input.lines) {
    rows.push([
      line.source === "recurring" ? "Recurring" : "One-off",
      line.title,
      line.category,
      line.vendor,
      line.frequency ? FREQUENCY_LABELS[line.frequency] : "",
      line.skipped ? 0 : line.amount,
      line.skipped ? "skipped" : line.status,
      line.paidOn ? line.paidOn.slice(0, 10) : "",
      line.invoiceUrl ?? "",
      line.notes,
    ]);
  }
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
