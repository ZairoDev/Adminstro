"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { expenseRegisterCsv, type ExpenseRegister } from "@/modules/finance/expense-sheet";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  earliestPayrollMonth,
  latestOpenPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import { FinanceSheetEmpty, FinanceSheetError, FinanceSheetSkeleton } from "../_components/finance-sheet-frame";
import { formatMoney } from "../_lib/types";

const head =
  "sticky top-0 z-20 h-10 whitespace-nowrap border-b border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 text-right text-xs font-medium text-[#0a0a0a]";
const cell = "border-b border-r border-[#f0f0f0] px-2 py-1.5 text-right text-sm tabular-nums text-[#0a0a0a]";
const textCell = "border-b border-r border-[#f0f0f0] px-3 py-1.5 text-left text-sm text-[#0a0a0a]";

const STATUS_CLASS = {
  paid: "bg-[#e8f6ee] text-[#146c43]",
  pending: "bg-[#fff4e5] text-[#9a3412]",
  skipped: "bg-[#f4f4f4] text-[#6b6b6b]",
  made: "bg-[#e8eef8] text-[#1d4f91]",
} as const;

function formatPaidDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export default function ExpenseGridClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams?.toString() ?? "";

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

  const [sheet, setSheet] = useState<ExpenseRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ success: boolean; data: ExpenseRegister; message?: string }>(
        "/api/finance/expense-grid",
        { params: { month: month.key } },
      );
      if (!response.data.success) {
        setError(response.data.message ?? "Failed to load the expense sheet");
        setSheet(null);
        return;
      }
      setSheet(response.data.data);
    } catch (loadError) {
      const message =
        axios.isAxiosError(loadError) &&
        typeof loadError.response?.data === "object" &&
        loadError.response.data !== null &&
        "message" in loadError.response.data &&
        typeof loadError.response.data.message === "string"
          ? loadError.response.data.message
          : "Failed to load the expense sheet";
      setError(message);
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [month.key]);

  useEffect(() => {
    void load();
  }, [load, queryKey]);

  const goToMonth = (key: string) => router.push(`/dashboard/finance/expense-sheet?month=${key}`);

  const needle = search.trim().toLowerCase();
  const salaries = useMemo(
    () =>
      (sheet?.salaries ?? []).filter((salary) => {
        if (!needle) return true;
        return [salary.name, salary.employeeCode ?? "", salary.role].some((value) =>
          value.toLowerCase().includes(needle),
        );
      }),
    [sheet, needle],
  );
  const expenses = useMemo(
    () =>
      (sheet?.expenses ?? []).filter((expense) => {
        if (!needle) return true;
        return [expense.title, expense.vendor, expense.category, expense.kind].some((value) =>
          value.toLowerCase().includes(needle),
        );
      }),
    [sheet, needle],
  );

  const download = () => {
    if (!sheet) return;
    const csv = expenseRegisterCsv(sheet);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-sheet-${sheet.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totals = sheet?.totals;
  const empty = sheet !== null && salaries.length === 0 && expenses.length === 0;

  return (
    <div
      className="flex h-[calc(100dvh-4.25rem)] min-h-[36rem] flex-col bg-[#f2f4f7] text-[#0a0a0a]"
      style={{ fontFamily: '"Geist", Inter, system-ui, sans-serif' }}
    >
      <header className="flex flex-none flex-wrap items-end justify-between gap-6 px-6 pb-4 pt-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-[-0.02em]">Expense sheet</h1>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[#6b6b6b]">
            {monthLabel}. Every salary that was made, split for tax, then the other expenses and whether each one is paid.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6b6b6b]">Month total</p>
          <p className="mt-1 text-[30px] font-bold leading-none tabular-nums text-[#1d5fbf]">
            {totals && !loading ? formatMoney(totals.grandTotal) : "—"}
          </p>
          <p className="mt-1 text-xs text-[#6b6b6b]">
            {totals && !loading
              ? `${formatMoney(totals.salaries)} salaries · ${formatMoney(totals.expenses)} other`
              : "Salaries plus other expenses"}
          </p>
        </div>
      </header>

      <div className="flex flex-none flex-wrap items-center gap-2 px-6 pb-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 cursor-pointer border-[#d4d4d4] bg-white"
          disabled={atEarliest}
          onClick={() => goToMonth(addPayrollMonths(month, -1).key)}
        >
          Previous month
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 cursor-pointer border-[#d4d4d4] bg-white"
          disabled={month.key === currentMonth.key}
          onClick={() => goToMonth(currentMonth.key)}
        >
          This month
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 cursor-pointer border-[#d4d4d4] bg-white"
          disabled={atLatest}
          onClick={() => goToMonth(addPayrollMonths(month, 1).key)}
        >
          Next month
        </Button>
        <label htmlFor="expense-sheet-search" className="sr-only">
          Search the sheet
        </label>
        <Input
          id="expense-sheet-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, code, vendor, or category"
          className="h-11 min-w-[16rem] flex-1 border-[#d4d4d4] bg-white text-sm"
        />
        <Button
          type="button"
          className="h-11 cursor-pointer bg-[#141414] text-white hover:bg-[#141414]/90"
          onClick={download}
          disabled={!sheet || (sheet.salaries.length === 0 && sheet.expenses.length === 0)}
        >
          Download CSV
        </Button>
        <Button asChild variant="outline" className="h-11 cursor-pointer border-[#d4d4d4] bg-white">
          <Link href={`/dashboard/finance/expense-tracker?month=${month.key}`}>Expense tracker</Link>
        </Button>
      </div>

      <p className="flex-none px-6 pb-3 text-xs leading-5 text-[#6b6b6b]">
        Amount paid for a salary is gross minus PF, plus incentive and casual, minus cash, advance, and hold. Skipped expenses are listed and left out of the total.
      </p>

      {loading ? (
        <FinanceSheetSkeleton />
      ) : error ? (
        <FinanceSheetError message={error} onRetry={() => void load()} />
      ) : empty ? (
        <FinanceSheetEmpty
          title={needle ? "No rows match" : "Nothing on this month"}
          description={
            needle
              ? "Try another name, code, or vendor."
              : "No salaries or other expenses are recorded for this month."
          }
        />
      ) : sheet && totals ? (
        <div className="mx-6 mb-6 min-h-0 flex-1 overflow-auto rounded-lg border border-[#e6e6e6] bg-white">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className={cn(head, "left-0 z-40 min-w-[14rem] text-left")}>Particulars</th>
                <th className={cn(head, "left-[14rem] z-40 min-w-[8rem] text-left")}>Code / vendor</th>
                <th className={cn(head, "min-w-[7rem] text-left")}>Head</th>
                <th className={head}>Basic</th>
                <th className={head}>HRA</th>
                <th className={head}>Conveyance</th>
                <th className={head}>Medical</th>
                <th className={head}>Special</th>
                <th className={head}>Gross</th>
                <th className={head}>PF</th>
                <th className={head}>Additions</th>
                <th className={head}>Deductions</th>
                <th className={cn(head, "bg-[#e8eef8]")}>Amount</th>
                <th className={cn(head, "text-left")}>Status</th>
                <th className={cn(head, "text-left")}>Invoice</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th colSpan={15} className="border-b border-r border-[#e6e6e6] bg-[#f7f8fa] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#6b6b6b]">
                  Salaries · {salaries.length}
                </th>
              </tr>
              {salaries.map((salary) => (
                <tr key={salary.id} className="bg-white">
                  <th className={cn(textCell, "sticky left-0 z-10 min-w-[14rem] bg-white font-medium")}>{salary.name}</th>
                  <td className={cn(textCell, "sticky left-[14rem] z-10 min-w-[8rem] bg-white text-[#6b6b6b]")}>
                    {salary.employeeCode || "—"}
                  </td>
                  <td className={cn(textCell, "text-[#6b6b6b]")}>{salary.role || "—"}</td>
                  <td className={cell}>{formatMoney(salary.basic)}</td>
                  <td className={cell}>{formatMoney(salary.hra)}</td>
                  <td className={cell}>{formatMoney(salary.conveyance)}</td>
                  <td className={cell}>{formatMoney(salary.medical)}</td>
                  <td className={cell}>{formatMoney(salary.specialAllowance)}</td>
                  <td className={cell}>{formatMoney(salary.gross)}</td>
                  <td className={cell}>{formatMoney(salary.pf)}</td>
                  <td className={cell}>{formatMoney(salary.additions)}</td>
                  <td className={cell}>{formatMoney(salary.deductions)}</td>
                  <td className={cn(cell, "font-medium")}>{formatMoney(salary.amount)}</td>
                  <td className={textCell}>
                    <span className={cn("inline-flex rounded px-1.5 text-[11px] leading-5", STATUS_CLASS.made)}>Made</span>
                  </td>
                  <td className={textCell} />
                </tr>
              ))}
              <tr>
                <th colSpan={15} className="border-b border-r border-[#e6e6e6] bg-[#f7f8fa] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#6b6b6b]">
                  Other expenses · {expenses.length}
                </th>
              </tr>
              {expenses.map((expense) => (
                <tr key={expense.id} className="bg-white">
                  <th className={cn(textCell, "sticky left-0 z-10 min-w-[14rem] bg-white font-medium", expense.status === "skipped" && "text-[#6b6b6b] line-through")}>
                    {expense.title}
                  </th>
                  <td className={cn(textCell, "sticky left-[14rem] z-10 min-w-[8rem] bg-white text-[#6b6b6b]")}>
                    {expense.vendor || "—"}
                  </td>
                  <td className={cn(textCell, "text-[#6b6b6b]")}>
                    {expense.category}
                    <div className="text-xs">{expense.kind}</div>
                  </td>
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cn(cell, "font-medium", expense.status === "skipped" && "text-[#6b6b6b] line-through")}>
                    {formatMoney(expense.amount)}
                  </td>
                  <td className={textCell}>
                    <span className={cn("inline-flex rounded px-1.5 text-[11px] leading-5 capitalize", STATUS_CLASS[expense.status])}>
                      {expense.status === "paid" && expense.paidOn ? `Paid · ${formatPaidDate(expense.paidOn)}` : expense.status}
                    </span>
                  </td>
                  <td className={textCell}>
                    {expense.invoiceUrl ? (
                      <a href={expense.invoiceUrl} target="_blank" rel="noreferrer" className="text-[#1d5fbf] underline-offset-2 hover:underline">
                        {expense.invoiceName || "Invoice"}
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="sticky bottom-0 left-0 z-40 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-3 py-2 text-left text-sm font-medium">
                  Total
                </th>
                <td className="sticky bottom-0 left-[14rem] z-40 border-t border-r border-[#e6e6e6] bg-[#f2f4f7]" />
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7]" />
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.basic)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.hra)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.conveyance)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.medical)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.specialAllowance)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.gross)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.pf)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.additions)}</td>
                <td className="sticky bottom-0 z-20 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 py-2 text-right text-sm font-medium tabular-nums">{formatMoney(totals.deductions)}</td>
                <td className="sticky bottom-0 z-20 border-t border-[#e6e6e6] bg-[#e8eef8] px-2 py-2 text-right text-sm font-semibold tabular-nums">{formatMoney(totals.grandTotal)}</td>
                <td className="sticky bottom-0 z-20 border-t border-[#e6e6e6] bg-[#f2f4f7]" />
                <td className="sticky bottom-0 z-20 border-t border-[#e6e6e6] bg-[#f2f4f7]" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}
