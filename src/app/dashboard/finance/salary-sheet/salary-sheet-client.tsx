"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FinanceSheetEmpty,
  FinanceSheetError,
  FinanceSheetSkeleton,
} from "../_components/finance-sheet-frame";
import { formatMoney } from "../_lib/types";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  earliestPayrollMonth,
  latestOpenPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import {
  salarySheetCsv,
  SHEET_ADJUSTMENT_COLUMNS,
  SHEET_BREAKUP_COLUMNS,
  SHEET_COUNT_COLUMNS,
  SHEET_PAY_COLUMNS,
  SHEET_PAYOUT_COLUMNS,
  sheetNumber,
  type PayrollAdjustmentField,
  type SalarySheetMoney,
  type SheetCountKey,
  type SheetDay,
  type SheetDayTone,
  type SheetMoneyKey,
} from "@/modules/finance/salary-sheet";

type SheetDate = {
  date: string;
  day: number;
  weekday: string;
  weekend: boolean;
  today: boolean;
};

type SheetLine = {
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

type SheetPayload = {
  month: string;
  monthLabel: string;
  dates: SheetDate[];
  rows: SheetLine[];
  totals: { employees: number; monthlySalary: number; finalSalary: number; amount: number };
  policyConfirmed: boolean;
};

const TONE_CLASS: Record<SheetDayTone, string> = {
  present: "bg-white text-[#0a0a0a]",
  half: "bg-white text-[#c4242a]",
  uninformed: "bg-[#ffedea] text-[#831c1e]",
  absent: "bg-[#ffedea] text-[#831c1e]",
  leave: "bg-white text-[#0a0a0a]",
  paid: "bg-[#f4f4f4] text-[#0a0a0a]",
  holiday: "bg-[#f4f4f4] text-[#6b6b6b]",
  off: "bg-[#f0f0f0] text-[#6b6b6b]",
  pending: "bg-white text-[#6b6b6b] border border-dashed border-[#d4d4d4]",
  notJoined: "bg-[#f8f8f8] text-[#6b6b6b]",
  empty: "bg-white text-[#6b6b6b]",
};

const LEGEND: Array<{ letter: string; label: string; tone: SheetDayTone }> = [
  { letter: "P", label: "Present", tone: "present" },
  { letter: "HD", label: "Half day", tone: "half" },
  { letter: "UL", label: "Uninformed leave", tone: "uninformed" },
  { letter: "A", label: "Absent", tone: "absent" },
  { letter: "L", label: "Unpaid leave", tone: "leave" },
  { letter: "PL", label: "Paid leave", tone: "paid" },
  { letter: "H", label: "Holiday", tone: "holiday" },
  { letter: "WO", label: "Weekly off", tone: "off" },
  { letter: "NJ", label: "Not joined", tone: "notJoined" },
  { letter: "PV", label: "Pending", tone: "pending" },
];

const BAND = {
  group: "bg-[#f2f4f7] text-[#0a0a0a]",
} as const;

const grid =
  "border-b border-r border-[#f0f0f0] px-1.5 py-1 text-right text-sm tabular-nums text-[#0a0a0a]";
const groupHead =
  "sticky top-0 z-20 h-8 border-b border-r border-[#e6e6e6] bg-[#f2f4f7] px-2 text-center text-xs font-medium text-[#0a0a0a]";
const colHead =
  "sticky top-8 z-20 h-10 whitespace-nowrap border-b border-r border-[#e6e6e6] bg-white px-1.5 text-right text-xs font-normal leading-tight text-[#6b6b6b]";

function formatCount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function readAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount > 10_000_000) return null;
  return amount;
}

function moneyTitle(row: SheetLine, key: SheetMoneyKey, hint: string): string {
  if (key === "gross" || key === "finalSalary") {
    const parts = [hint];
    if (row.money.lopAmount > 0) parts.push(`Loss of pay ${formatMoney(row.money.lopAmount)}`);
    if (row.money.joiningDeduction > 0) {
      parts.push(`Before joining ${formatMoney(row.money.joiningDeduction)}`);
    }
    return parts.join(". ");
  }
  return hint;
}

export default function SalarySheetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams?.toString() ?? "";
  const [sheet, setSheet] = useState<SheetPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentMonth = currentPayrollMonth();
  const earliestMonth = earliestPayrollMonth();
  const latestMonth = latestOpenPayrollMonth();
  const requestedMonth = parsePayrollMonth(searchParams?.get("month") ?? "");
  const payrollMonth =
    requestedMonth &&
    comparePayrollMonths(requestedMonth, earliestMonth) >= 0 &&
    comparePayrollMonths(requestedMonth, latestMonth) <= 0
      ? requestedMonth
      : currentMonth;
  const monthLabel = payrollMonthLabel(payrollMonth);

  useEffect(() => {
    setSearch(new URLSearchParams(queryKey).get("search") ?? "");
  }, [queryKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = new URLSearchParams(queryKey);
      const params: Record<string, string> = { month: payrollMonth.key };
      const appliedSearch = current.get("search") ?? "";
      if (appliedSearch) params.search = appliedSearch;
      const response = await axios.get<{ success: boolean; data: SheetPayload; message?: string }>(
        "/api/finance/salary-sheet",
        { params },
      );
      if (!response.data.success) {
        setError(response.data.message ?? "Failed to load the salary sheet");
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
          : "Failed to load the salary sheet";
      setError(message);
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [payrollMonth.key, queryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const writeQuery = (monthKey: string, searchValue = search) => {
    const params = new URLSearchParams();
    params.set("month", monthKey);
    const trimmed = searchValue.trim();
    if (trimmed) params.set("search", trimmed);
    router.push(`/dashboard/finance/salary-sheet?${params.toString()}`);
  };

  const saveAdjustment = async (row: SheetLine, field: PayrollAdjustmentField, amount: number) => {
    setSaveError(null);
    try {
      const response = await axios.patch<{
        success: boolean;
        data?: { employeeId: string; money: SalarySheetMoney };
        message?: string;
      }>("/api/finance/salary-sheet", {
        employeeId: row.id,
        month: payrollMonth.key,
        field,
        amount,
      });
      const money = response.data.data?.money;
      if (!response.data.success || !money) {
        setSaveError(response.data.message ?? "Could not save this amount");
        return;
      }
      setSheet((current) => {
        if (!current) return current;
        const rows = current.rows.map((item) => (item.id === row.id ? { ...item, money } : item));
        return {
          ...current,
          rows,
          totals: {
            employees: rows.length,
            monthlySalary: rows.reduce((sum, item) => sum + item.money.monthlySalary, 0),
            finalSalary: rows.reduce((sum, item) => sum + item.money.finalSalary, 0),
            amount: rows.reduce((sum, item) => sum + item.money.amount, 0),
          },
        };
      });
    } catch (saveLoadError) {
      const message =
        axios.isAxiosError(saveLoadError) &&
        typeof saveLoadError.response?.data === "object" &&
        saveLoadError.response.data !== null &&
        "message" in saveLoadError.response.data &&
        typeof saveLoadError.response.data.message === "string"
          ? saveLoadError.response.data.message
          : "Could not save this amount";
      setSaveError(message);
    }
  };

  const download = () => {
    if (!sheet) return;
    const csv = salarySheetCsv({
      monthLabel: sheet.monthLabel,
      dates: sheet.dates.map((date) => date.date),
      rows: sheet.rows,
    });
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `salary-sheet-${sheet.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const countTotals = useMemo(() => {
    const totals = {} as Record<SheetCountKey, number>;
    for (const column of SHEET_COUNT_COLUMNS) totals[column.key] = 0;
    for (const row of sheet?.rows ?? []) {
      for (const column of SHEET_COUNT_COLUMNS) totals[column.key] += row.counts[column.key];
    }
    return totals;
  }, [sheet]);

  const moneyTotals = useMemo(() => {
    const totals = {} as Record<SheetMoneyKey, number>;
    for (const column of [
      ...SHEET_PAY_COLUMNS,
      ...SHEET_BREAKUP_COLUMNS,
      ...SHEET_ADJUSTMENT_COLUMNS,
      ...SHEET_PAYOUT_COLUMNS,
    ]) {
      totals[column.key] = 0;
    }
    for (const row of sheet?.rows ?? []) {
      for (const key of Object.keys(totals) as SheetMoneyKey[]) totals[key] += row.money[key];
    }
    return totals;
  }, [sheet]);

  const atEarliest = comparePayrollMonths(payrollMonth, earliestMonth) === 0;
  const atLatest = comparePayrollMonths(payrollMonth, latestMonth) === 0;
  const dates = sheet?.dates ?? [];

  const released = sheet && !loading ? formatMoney(sheet.totals.amount) : "—";

  return (
    <div
      className="flex h-[calc(100dvh-4.25rem)] min-h-[36rem] flex-col bg-[#f2f4f7] text-[#0a0a0a]"
      style={{ fontFamily: '"Geist", Inter, system-ui, sans-serif' }}
    >
      <header className="flex flex-none flex-wrap items-end justify-between gap-6 px-6 pb-4 pt-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-[-0.02em]">Salary sheet</h1>
          <p className="mt-1 max-w-xl text-sm leading-5 text-[#6b6b6b]">
            {monthLabel}. Each row is one person: the month of attendance, then what that leaves to pay.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6b6b6b]">To release</p>
          <p className="mt-1 text-[30px] font-bold leading-none tabular-nums text-[#1d5fbf]">{released}</p>
        </div>
      </header>

      <div className="flex flex-none flex-wrap items-center gap-2 px-6 pb-3">
        <Button type="button" variant="outline" className="h-11 cursor-pointer border-[#d4d4d4] bg-white" disabled={atEarliest} onClick={() => writeQuery(addPayrollMonths(payrollMonth, -1).key)}>
          Previous month
        </Button>
        <Button type="button" variant="outline" className="h-11 cursor-pointer border-[#d4d4d4] bg-white" disabled={atLatest} onClick={() => writeQuery(addPayrollMonths(payrollMonth, 1).key)}>
          Next month
        </Button>
        <form
          className="flex min-w-[16rem] flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            writeQuery(payrollMonth.key);
          }}
        >
          <label htmlFor="sheet-search" className="sr-only">Search employees</label>
          <Input
            id="sheet-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, phone, or code"
            className="h-11 border-[#d4d4d4] bg-white text-sm"
          />
          <Button type="submit" variant="outline" className="h-11 cursor-pointer border-[#d4d4d4] bg-white">
            Search
          </Button>
        </form>
        <Button
          type="button"
          className="h-11 cursor-pointer bg-[#141414] text-white hover:bg-[#141414]/90"
          onClick={download}
          disabled={!sheet || sheet.rows.length === 0}
        >
          Download CSV
        </Button>
        <Button asChild variant="outline" className="h-11 cursor-pointer border-[#d4d4d4] bg-white">
          <Link href={`/dashboard/finance/salaries?month=${payrollMonth.key}`}>Salaries</Link>
        </Button>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-x-4 gap-y-1 px-6 pb-3">
        {LEGEND.map((item) => (
          <span key={item.letter} className="inline-flex items-center gap-1.5 text-xs text-[#0a0a0a]">
            <span className={cn("inline-flex h-5 min-w-5 items-center justify-center border border-[#e6e6e6] px-1 text-xs font-medium", TONE_CLASS[item.tone])}>
              {item.letter}
            </span>
            {item.label}
          </span>
        ))}
      </div>

      {saveError ? (
        <p className="flex-none px-6 pb-2 text-sm text-[#c4242a]" role="alert">{saveError}</p>
      ) : null}
      {sheet && !sheet.policyConfirmed ? (
        <p className="flex-none px-6 pb-2 text-xs leading-5 text-[#92400e]">
          The attendance policy is not confirmed, so pending days are not loss of pay yet.
        </p>
      ) : null}

      {loading ? (
        <FinanceSheetSkeleton />
      ) : error ? (
        <FinanceSheetError message={error} onRetry={() => void load()} />
      ) : !sheet || sheet.rows.length === 0 ? (
        <FinanceSheetEmpty title="No employees on this sheet" description="No active employees match this month." />
      ) : (
        <div className="mx-6 min-h-0 flex-1 overflow-auto rounded-lg border border-[#e6e6e6] bg-white">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className={cn(groupHead, "left-0 z-40 h-16 w-[12.5rem] min-w-[12.5rem] max-w-[12.5rem] text-left")} rowSpan={2}>
                  Employee
                </th>
                <th className={cn(groupHead, "left-[12.5rem] z-40 h-16 w-[8rem] min-w-[8rem] max-w-[8rem] text-left")} rowSpan={2}>
                  Department
                </th>
                <th className={cn(groupHead, BAND.group)} colSpan={dates.length}>
                  {monthLabel}
                </th>
                <th className={cn(groupHead, BAND.group, "border-l border-l-[#d4d4d4]")} colSpan={SHEET_COUNT_COLUMNS.length}>Attendance</th>
                <th className={cn(groupHead, BAND.group, "border-l border-l-[#d4d4d4]")} colSpan={SHEET_PAY_COLUMNS.length}>Salary</th>
                <th className={cn(groupHead, BAND.group, "border-l border-l-[#d4d4d4]")} colSpan={SHEET_BREAKUP_COLUMNS.length}>Breakup of final</th>
                <th className={cn(groupHead, BAND.group, "border-l border-l-[#d4d4d4]")} colSpan={SHEET_ADJUSTMENT_COLUMNS.length}>Adjustments</th>
                <th className={cn(groupHead, BAND.group, "border-l border-l-[#d4d4d4]")} colSpan={SHEET_PAYOUT_COLUMNS.length}>Payout</th>
              </tr>
              <tr>
                {dates.map((date) => (
                  <th
                    key={date.date}
                    title={`${date.weekday} ${date.date}`}
                    className={cn(
                      colHead,
                      "w-16 min-w-16 px-1 text-center",
                      date.weekend && "bg-[#f4f4f4]",
                      date.today && "border-b-2 border-b-[#1d5fbf] text-[#1d5fbf]",
                    )}
                  >
                    <span className="block leading-4 text-[#0a0a0a]">{date.day}</span>
                    <span className="block font-normal leading-4 text-[#6b6b6b]">{date.weekday}</span>
                  </th>
                ))}
                {SHEET_COUNT_COLUMNS.map((column, index) => (
                  <th key={column.key} className={cn(colHead, "min-w-[5rem]", index === 0 && "border-l border-l-[#d4d4d4]")}>
                    {column.label}
                  </th>
                ))}
                {SHEET_PAY_COLUMNS.map((column, index) => (
                  <th key={column.key} title={column.hint} className={cn(colHead, "min-w-[5.5rem]", index === 0 && "border-l border-l-[#d4d4d4]")}>
                    {column.label}
                  </th>
                ))}
                {SHEET_BREAKUP_COLUMNS.map((column, index) => (
                  <th key={column.key} title={column.hint} className={cn(colHead, "min-w-[5.5rem]", index === 0 && "border-l border-l-[#d4d4d4]")}>
                    {column.label}
                  </th>
                ))}
                {SHEET_ADJUSTMENT_COLUMNS.map((column, index) => (
                  <th key={column.key} title={column.hint} className={cn(colHead, "min-w-[5.5rem]", index === 0 && "border-l border-l-[#d4d4d4]")}>
                    {column.label}
                  </th>
                ))}
                {SHEET_PAYOUT_COLUMNS.map((column, index) => (
                  <th key={column.key} title={column.hint} className={cn(colHead, "min-w-[5.5rem]", index === 0 && "border-l border-l-[#d4d4d4]")}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <th className="sticky left-0 z-10 h-14 w-[12.5rem] min-w-[12.5rem] max-w-[12.5rem] border-b border-r border-[#f0f0f0] bg-white px-3 text-left align-middle">
                    <div className="truncate text-sm font-medium leading-5">{row.name}</div>
                    <div className="truncate text-xs leading-4 text-[#6b6b6b]">
                      {[row.employeeCode, row.role].filter(Boolean).join(" · ") || row.email || "—"}
                    </div>
                  </th>
                  <td className="sticky left-[12.5rem] z-10 h-14 w-[8rem] min-w-[8rem] max-w-[8rem] truncate border-b border-r border-[#f0f0f0] bg-white px-3 text-left text-sm align-middle text-[#6b6b6b]">
                    {row.organization || "—"}
                  </td>
                  {row.days.map((day) => (
                    <td
                      key={day.date}
                      title={day.label ? `${day.label}, ${day.date}` : day.date}
                      className={cn(
                        "h-14 w-16 min-w-16 border-b border-r border-[#f0f0f0] px-1 text-center align-middle text-sm font-medium",
                        TONE_CLASS[day.tone],
                      )}
                    >
                      {day.letter || "–"}
                    </td>
                  ))}
                  {SHEET_COUNT_COLUMNS.map((column, columnIndex) => (
                    <td key={column.key} className={cn(grid, "h-14", columnIndex === 0 && "border-l border-l-[#d4d4d4]", row.counts[column.key] === 0 && "text-[#6b6b6b]")}>
                      {formatCount(row.counts[column.key])}
                    </td>
                  ))}
                  {SHEET_PAY_COLUMNS.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      title={moneyTitle(row, column.key, column.hint)}
                      className={cn(
                        grid,
                        "h-14",
                        columnIndex === 0 && "border-l border-l-[#d4d4d4]",
                        column.key === "finalSalary" && "font-medium",
                        row.money[column.key] === 0 && "text-[#6b6b6b]",
                      )}
                    >
                      {sheetNumber(column.key, row.money[column.key])}
                    </td>
                  ))}
                  {SHEET_BREAKUP_COLUMNS.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      title={column.hint}
                      className={cn(grid, "h-14", columnIndex === 0 && "border-l border-l-[#d4d4d4]", row.money[column.key] === 0 && "text-[#6b6b6b]")}
                    >
                      {sheetNumber(column.key, row.money[column.key])}
                    </td>
                  ))}
                  {SHEET_ADJUSTMENT_COLUMNS.map((column, columnIndex) => (
                    <td key={column.key} className={cn(grid, "h-14 bg-white", columnIndex === 0 && "border-l border-l-[#d4d4d4]")}>
                      <AmountField
                        label={`${column.label} for ${row.name}`}
                        value={row.money[column.key]}
                        onCommit={(amount) => saveAdjustment(row, column.key, amount)}
                      />
                    </td>
                  ))}
                  {SHEET_PAYOUT_COLUMNS.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      title={column.hint}
                      className={cn(
                        grid,
                        "h-14",
                        columnIndex === 0 && "border-l border-l-[#d4d4d4]",
                        column.key === "amount" && "font-bold text-[#1d5fbf]",
                        column.key !== "amount" && row.money[column.key] === 0 && "text-[#6b6b6b]",
                        row.money[column.key] < 0 && "text-[#c4242a]",
                      )}
                    >
                      {column.editable ? (
                        <AmountField
                          label={`${column.label} for ${row.name}`}
                          value={row.money[column.editable]}
                          onCommit={(amount) => saveAdjustment(row, column.editable as PayrollAdjustmentField, amount)}
                        />
                      ) : (
                        sheetNumber(column.key, row.money[column.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="sticky bottom-0 left-0 z-30 border-t border-r border-[#e6e6e6] bg-[#f2f4f7] px-3 py-2 text-left text-sm font-medium text-[#0a0a0a]">
                  Total
                </th>
                <td className="sticky bottom-0 left-[12.5rem] z-30 border-t border-r border-[#e6e6e6] bg-[#f2f4f7]" />
                {dates.map((date) => (
                  <td key={date.date} className="sticky bottom-0 border-t border-r border-[#e6e6e6] bg-[#f2f4f7]" />
                ))}
                {SHEET_COUNT_COLUMNS.map((column) => (
                  <td key={column.key} className={cn(grid, "sticky bottom-0 border-t border-[#e6e6e6] bg-[#f2f4f7] font-medium")}>
                    {formatCount(countTotals[column.key])}
                  </td>
                ))}
                {[...SHEET_PAY_COLUMNS, ...SHEET_BREAKUP_COLUMNS, ...SHEET_ADJUSTMENT_COLUMNS, ...SHEET_PAYOUT_COLUMNS].map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      grid,
                      "sticky bottom-0 border-t border-[#e6e6e6] bg-[#f2f4f7] font-medium",
                      column.key === "amount" && "font-bold text-[#1d5fbf]",
                      moneyTotals[column.key] < 0 && "text-[#c4242a]",
                    )}
                  >
                    {column.key === "perDaySalary" ? "—" : sheetNumber(column.key, moneyTotals[column.key])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex flex-none items-center justify-between gap-6 px-6 py-3">
        <p className="max-w-3xl text-xs leading-5 text-[#6b6b6b]">
          Final is the monthly salary after loss of pay. Its breakup is basic 50%, HRA 20%, conveyance 4%, medical 2%, special allowance 24%. Amount is final, minus PF, plus incentive and casual, then minus cash, advance and hold.
        </p>
        <p className="text-sm tabular-nums text-[#6b6b6b]">
          {loading ? "Loading" : sheet ? `${sheet.totals.employees.toLocaleString("en-IN")} people` : "Unavailable"}
        </p>
      </div>
    </div>
  );
}

function AmountField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (amount: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value === 0 ? "" : String(value));
    setInvalid(false);
  }, [value]);

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={draft}
      placeholder="0"
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        setDraft(event.target.value);
        setInvalid(false);
      }}
      onBlur={() => {
        const amount = readAmount(draft);
        if (amount === null) {
          setInvalid(true);
          return;
        }
        if (amount === value) return;
        void onCommit(amount);
      }}
      className={cn(
        "h-8 w-full min-w-[4.5rem] rounded-md border border-[#d4d4d4] bg-white px-1 text-right text-sm tabular-nums text-[#0a0a0a] outline-none focus-visible:border-[#1d5fbf] focus-visible:ring-2 focus-visible:ring-[#1d5fbf]/30",
        value === 0 && "text-[#6b6b6b]",
        invalid && "border-[#c4242a] text-[#c4242a]",
      )}
    />
  );
}
