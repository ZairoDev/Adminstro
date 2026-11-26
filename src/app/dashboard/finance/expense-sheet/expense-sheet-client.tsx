"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  FREQUENCY_LABELS,
  expenseSheetCsv,
  filterExpenseLines,
  previousMonthKey,
  type ExpenseCategory,
  type ExpenseFilters,
  type ExpenseLine,
  type ExpenseStatus,
} from "@/modules/finance/expense-sheet";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  earliestPayrollMonth,
  latestOpenPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import type { ExpenseSheetView } from "@/modules/finance/services/expense-sheet.service";
import {
  FinanceSheetEmpty,
  FinanceSheetError,
  FinanceSheetSkeleton,
  SheetStat,
  sheetFooterClass,
  sheetFrameClass,
  sheetRowClass,
  sheetScrollClass,
  sheetTableClass,
  sheetTdClass,
  sheetThClass,
  sheetToolbarClass,
} from "../_components/finance-sheet-frame";
import { formatMoney } from "../_lib/types";
import { apiErrorMessage } from "./expense-api";
import {
  ConfirmDialog,
  EditRecurringDialog,
  ExpenseFormDialog,
  MarkPaidDialog,
  RecurringFormDialog,
  type ConfirmRequest,
} from "./expense-dialogs";

function formatPaidDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function changeText(sheet: ExpenseSheetView): string {
  if (!sheet.change) return "No earlier month to compare";
  const { amount, percent } = sheet.change;
  if (amount === 0) return "Same as last month";
  const sign = amount > 0 ? "+" : "-";
  const percentText = percent === null ? "" : ` (${sign}${Math.abs(percent)}%)`;
  return `${sign}${formatMoney(Math.abs(amount))}${percentText} vs last month`;
}

export default function ExpenseSheetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams?.toString() ?? "";

  const [sheet, setSheet] = useState<ExpenseSheetView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenseFilters>({ search: "", category: "all", status: "all" });
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState<{ editing: ExpenseLine | null } | null>(null);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<ExpenseLine | null>(null);
  const [paying, setPaying] = useState<ExpenseLine | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const currentMonth = currentPayrollMonth();
  const earliestMonth = earliestPayrollMonth();
  const latestMonth = latestOpenPayrollMonth();
  const requested = parsePayrollMonth(searchParams?.get("month") ?? "");
  const month =
    requested &&
    comparePayrollMonths(requested, earliestMonth) >= 0 &&
    comparePayrollMonths(requested, latestMonth) <= 0
      ? requested
      : currentMonth;
  const monthLabel = payrollMonthLabel(month);
  const atEarliest = comparePayrollMonths(month, earliestMonth) === 0;
  const atLatest = comparePayrollMonths(month, latestMonth) === 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ success: boolean; data: ExpenseSheetView; message?: string }>(
        "/api/finance/expense-sheet",
        { params: { month: month.key } },
      );
      if (!response.data.success) {
        setError(response.data.message ?? "Failed to load the expense sheet");
        setSheet(null);
        return;
      }
      setSheet(response.data.data);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Failed to load the expense sheet"));
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [month.key]);

  useEffect(() => {
    void load();
  }, [load, queryKey]);

  const goToMonth = (key: string) => router.push(`/dashboard/finance/expense-sheet?month=${key}`);

  /** Runs a change, then reloads the sheet so totals stay correct. */
  const mutate = async (id: string | null, run: () => Promise<void>) => {
    setActionError(null);
    setNotice(null);
    setBusyId(id);
    try {
      await run();
      await load();
    } catch (mutationError) {
      setActionError(apiErrorMessage(mutationError, "Could not save that change"));
    } finally {
      setBusyId(null);
    }
  };

  const markPending = (line: ExpenseLine) =>
    void mutate(line.id, async () => {
      if (line.source === "recurring") {
        await axios.put(`/api/finance/recurring-expenses/${line.id}/months/${month.key}`, { status: "pending" });
      } else {
        await axios.patch(`/api/finance/expenses/${line.id}`, { status: "pending" });
      }
    });

  const toggleSkip = (line: ExpenseLine) =>
    void mutate(line.id, async () => {
      await axios.put(`/api/finance/recurring-expenses/${line.id}/months/${month.key}`, {
        skipped: !line.skipped,
      });
    });

  const askStopRecurring = (line: ExpenseLine) =>
    setConfirmRequest({
      title: `Stop "${line.title}"?`,
      description: `It will no longer appear from ${monthLabel} onward. Earlier months keep it.`,
      confirmLabel: "Stop recurring",
      run: async () => {
        await axios.patch(`/api/finance/recurring-expenses/${line.id}`, {
          action: "stop",
          lastMonth: previousMonthKey(month.key),
        });
        await load();
      },
    });

  const askDelete = (line: ExpenseLine) =>
    setConfirmRequest(
      line.source === "recurring"
        ? {
            title: `Delete "${line.title}"?`,
            description: "This removes it from every month, including past ones. To keep earlier months, stop it instead.",
            confirmLabel: "Delete everywhere",
            run: async () => {
              await axios.delete(`/api/finance/recurring-expenses/${line.id}`);
              await load();
            },
          }
        : {
            title: `Delete "${line.title}"?`,
            description: `This removes the expense from ${monthLabel}.`,
            confirmLabel: "Delete expense",
            run: async () => {
              await axios.delete(`/api/finance/expenses/${line.id}`);
              await load();
            },
          },
    );

  const copyPrevious = async () => {
    setCopying(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await axios.post<{ success: boolean; data?: { copied: number } }>(
        "/api/finance/expense-sheet/copy-previous",
        { month: month.key },
      );
      const copied = response.data.data?.copied ?? 0;
      setNotice(
        copied > 0
          ? `Copied ${copied} one-off expense${copied === 1 ? "" : "s"} from last month. They are pending.`
          : "Nothing new to copy. Last month's items are already here.",
      );
      await load();
    } catch (copyError) {
      setActionError(apiErrorMessage(copyError, "Could not copy last month's expenses"));
    } finally {
      setCopying(false);
    }
  };

  const download = () => {
    if (!sheet) return;
    const csv = expenseSheetCsv({ monthLabel: sheet.monthLabel, salary: sheet.salary, lines: sheet.lines });
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-sheet-${sheet.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const visibleLines = useMemo(
    () => (sheet ? filterExpenseLines(sheet.lines, filters) : []),
    [sheet, filters],
  );
  const filtersActive = filters.search.trim() !== "" || filters.category !== "all" || filters.status !== "all";
  const showSalary =
    sheet !== null &&
    filters.category === "all" &&
    filters.status === "all" &&
    (filters.search.trim() === "" || "salaries salary payroll".includes(filters.search.trim().toLowerCase()));
  const nothingToShow = sheet !== null && !showSalary && visibleLines.length === 0;

  const totals = sheet?.totals;

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading="Expense sheet"
            subheading={`Everything the company spends in ${monthLabel}: salaries, fixed recurring costs, and one-off expenses.`}
          />
          <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
            <Link href="/dashboard/finance">Overview</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Month</p>
            <p className="text-lg font-semibold">{monthLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={atEarliest} onClick={() => goToMonth(addPayrollMonths(month, -1).key)}>
              Previous month
            </Button>
            <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={month.key === currentMonth.key} onClick={() => goToMonth(currentMonth.key)}>
              This month
            </Button>
            <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={atLatest} onClick={() => goToMonth(addPayrollMonths(month, 1).key)}>
              Next month
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <SheetStat label="Total expense" value={totals ? formatMoney(totals.total) : "—"} hint={sheet ? changeText(sheet) : undefined} />
          <SheetStat label="Salaries" value={totals ? formatMoney(totals.salaries) : "—"} hint={sheet ? `${sheet.salary.employeeCount} active employees` : undefined} />
          <SheetStat label="Recurring" value={totals ? formatMoney(totals.recurring) : "—"} hint="Fixed costs due this month" />
          <SheetStat label="One-off" value={totals ? formatMoney(totals.oneOff) : "—"} hint="Added for this month" />
          <SheetStat label="Paid" value={totals ? formatMoney(totals.paid) : "—"} hint="Recurring and one-off" />
          <SheetStat label="Pending" value={totals ? formatMoney(totals.pending) : "—"} hint="Still to pay" tone={totals && totals.pending > 0 ? "warning" : "default"} />
        </div>

        {totals && totals.categories.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Spend by category">
            {totals.categories.map((entry) => (
              <li key={entry.category} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                <span className="text-muted-foreground">{entry.category}</span>{" "}
                <span className="font-semibold tabular-nums">{formatMoney(entry.amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="h-10 cursor-pointer" onClick={() => setExpenseDialog({ editing: null })}>
            Add expense
          </Button>
          <Button type="button" variant="secondary" className="h-10 cursor-pointer" onClick={() => setRecurringDialogOpen(true)}>
            Add recurring expense
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 cursor-pointer"
            disabled={copying || !sheet || sheet.previousOneOffCount === 0}
            onClick={() => void copyPrevious()}
            title={sheet && sheet.previousOneOffCount === 0 ? "Last month has no one-off expenses" : undefined}
          >
            {copying ? "Copying…" : "Copy last month's one-off"}
          </Button>
          <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={!sheet} onClick={download}>
            Export CSV
          </Button>
        </div>

        {actionError ? (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}
        {notice ? (
          <p className="text-sm text-foreground" role="status">
            {notice}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[14rem] flex-1 space-y-1.5 sm:max-w-sm">
            <label htmlFor="expense-search" className="text-xs font-medium text-foreground">
              Search
            </label>
            <Input
              id="expense-search"
              placeholder="Name, vendor, notes, or category"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              className="h-10 text-base"
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-52">
            <label htmlFor="expense-category-filter" className="text-xs font-medium text-foreground">
              Category
            </label>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters((current) => ({ ...current, category: value as ExpenseCategory | "all" }))}
            >
              <SelectTrigger id="expense-category-filter" className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <label htmlFor="expense-status-filter" className="text-xs font-medium text-foreground">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters((current) => ({ ...current, status: value as ExpenseStatus | "all" }))}
            >
              <SelectTrigger id="expense-status-filter" className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtersActive ? (
            <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={() => setFilters({ search: "", category: "all", status: "all" })}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <FinanceSheetSkeleton />
      ) : error ? (
        <FinanceSheetError message={error} onRetry={() => void load()} />
      ) : nothingToShow ? (
        <FinanceSheetEmpty title="No expenses match" description="Try a different search, category, or status." />
      ) : sheet ? (
        <div className={sheetScrollClass}>
          <table className={sheetTableClass}>
            <thead>
              <tr>
                <th className={sheetThClass}>Item</th>
                <th className={sheetThClass}>Type</th>
                <th className={sheetThClass}>Category</th>
                <th className={cn(sheetThClass, "text-right")}>Amount</th>
                <th className={sheetThClass}>Status</th>
                <th className={sheetThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {showSalary ? (
                <Fragment>
                  <tr className={sheetRowClass(0, "bg-muted/50")}>
                    <td className={sheetTdClass}>
                      <div className="font-medium">Salaries</div>
                      <div className="text-xs text-muted-foreground">
                        Payable salary of {sheet.salary.employeeCount} active employees for {sheet.monthLabel}
                      </div>
                    </td>
                    <td className={sheetTdClass}>Recurring · locked</td>
                    <td className={sheetTdClass}>Salaries</td>
                    <td className={cn(sheetTdClass, "text-right font-medium tabular-nums")}>{formatMoney(sheet.salary.total)}</td>
                    <td className={cn(sheetTdClass, "text-xs text-muted-foreground")}>Paid from the salary sheet</td>
                    <td className={sheetTdClass}>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-10 cursor-pointer" aria-expanded={salaryOpen} aria-controls="expense-salary-panel" onClick={() => setSalaryOpen((open) => !open)}>
                          {salaryOpen ? "Hide employees" : "Show employees"}
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
                          <Link href={`/dashboard/finance/salary-sheet?month=${sheet.month}`}>Salary sheet</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {salaryOpen ? (
                    <tr>
                      <td id="expense-salary-panel" colSpan={6} className="border-b border-border bg-muted/20 p-3">
                        {sheet.salary.employees.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No active employees are on payroll for this month.</p>
                        ) : (
                          <table className="w-full min-w-[32rem] border-collapse text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-2 py-1.5 font-semibold">Employee</th>
                                <th className="px-2 py-1.5 font-semibold">Role</th>
                                <th className="px-2 py-1.5 text-right font-semibold">Monthly (annual / 12)</th>
                                <th className="px-2 py-1.5 text-right font-semibold">Payable</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sheet.salary.employees.map((employee) => (
                                <tr key={employee.id} className="border-t border-border">
                                  <td className="px-2 py-1.5">
                                    {employee.name}
                                    {employee.employeeCode ? <span className="text-xs text-muted-foreground"> · {employee.employeeCode}</span> : null}
                                  </td>
                                  <td className="px-2 py-1.5">{employee.role || "—"}</td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(employee.monthlyGross)}</td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(employee.payable)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ) : null}

              {visibleLines.map((line, index) => {
                const busy = busyId === line.id;
                const recurring = line.source === "recurring";
                return (
                  <tr key={`${line.source}-${line.id}`} className={sheetRowClass(index + 1)}>
                    <td className={sheetTdClass}>
                      <div className={cn("font-medium", line.skipped && "text-muted-foreground line-through")}>{line.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {[line.vendor, line.notes].filter(Boolean).join(" · ") || "No vendor or notes"}
                      </div>
                    </td>
                    <td className={sheetTdClass}>
                      {recurring && line.frequency ? FREQUENCY_LABELS[line.frequency] : "One-off"}
                      {line.skipped ? <div className="text-xs text-muted-foreground">Skipped this month</div> : null}
                    </td>
                    <td className={sheetTdClass}>{line.category}</td>
                    <td className={cn(sheetTdClass, "text-right tabular-nums", line.skipped && "text-muted-foreground line-through")}>
                      {formatMoney(line.amount)}
                      {line.overridden && !line.skipped ? (
                        <div className="text-xs font-normal text-muted-foreground no-underline">Standard {formatMoney(line.baseAmount)}</div>
                      ) : null}
                    </td>
                    <td className={sheetTdClass}>
                      {line.skipped ? (
                        <span className="text-xs text-muted-foreground">Not counted</span>
                      ) : (
                        <>
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", line.status === "paid" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100")}>
                            {line.status === "paid" ? `Paid${line.paidOn ? ` · ${formatPaidDate(line.paidOn)}` : ""}` : "Pending"}
                          </span>
                          {line.status === "paid" && line.invoiceUrl ? (
                            <a href={line.invoiceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-medium text-primary underline-offset-2 hover:underline">
                              {line.invoiceName || "Invoice"}
                            </a>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className={sheetTdClass}>
                      <div className="flex flex-wrap gap-2">
                        {!line.skipped ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-10 cursor-pointer"
                            disabled={busy}
                            onClick={() => (line.status === "paid" ? markPending(line) : setPaying(line))}
                          >
                            {line.status === "paid" ? "Mark pending" : "Mark paid"}
                          </Button>
                        ) : null}
                        <Button type="button" size="sm" variant="outline" className="h-10 cursor-pointer" disabled={busy} onClick={() => (recurring ? setEditingRecurring(line) : setExpenseDialog({ editing: line }))}>
                          Edit
                        </Button>
                        {recurring ? (
                          <Button type="button" size="sm" variant="outline" className="h-10 cursor-pointer" disabled={busy} onClick={() => toggleSkip(line)}>
                            {line.skipped ? "Include" : "Skip month"}
                          </Button>
                        ) : null}
                        {recurring && line.startMonth !== sheet.month ? (
                          <Button type="button" size="sm" variant="outline" className="h-10 cursor-pointer" disabled={busy} onClick={() => askStopRecurring(line)}>
                            Stop
                          </Button>
                        ) : null}
                        <Button type="button" size="sm" variant="ghost" className="h-10 cursor-pointer text-destructive" disabled={busy} onClick={() => askDelete(line)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sheet.lines.length === 0 && !filtersActive ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-sm text-muted-foreground">
                    No recurring or one-off expenses yet for {sheet.monthLabel}. Add a recurring expense for fixed costs like rent, or a one-off expense for this month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className={sheetFooterClass}>
        <p className="text-sm text-muted-foreground">
          Salaries follow attendance and annual salary / 12. Marking an expense paid needs its invoice. Skipped items are not counted.
        </p>
        <p className="text-sm font-medium tabular-nums">Total {totals && !loading ? formatMoney(totals.total) : "—"}</p>
      </div>

      <ExpenseFormDialog
        open={expenseDialog !== null}
        onOpenChange={(open) => {
          if (!open) setExpenseDialog(null);
        }}
        month={month.key}
        monthLabel={monthLabel}
        editing={expenseDialog?.editing ?? null}
        onSaved={() => void load()}
      />
      <RecurringFormDialog
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        month={month.key}
        minMonth={earliestMonth.key}
        maxMonth={latestMonth.key}
        onSaved={() => void load()}
      />
      <MarkPaidDialog
        line={paying}
        month={month.key}
        onClose={() => setPaying(null)}
        onSaved={() => void load()}
      />
      <EditRecurringDialog
        line={editingRecurring}
        month={month.key}
        monthLabel={monthLabel}
        onClose={() => setEditingRecurring(null)}
        onSaved={() => void load()}
      />
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  );
}
