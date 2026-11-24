"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeRoles } from "@/constants/employeeRoles";
import { cn } from "@/lib/utils";
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
import { SalaryDetail, type SalaryRow } from "./salary-detail";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  daysInPayrollMonth,
  earliestPayrollMonth,
  latestOpenPayrollMonth,
  maxLossOfPayDays,
  monthPayFromAttendance,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import { describeLopBreakdown } from "@/modules/attendance/presentation";
import type { LopBreakdown } from "@/modules/attendance/types";

type SalaryPayload = {
  employees: SalaryRow[];
  totalEmployees: number;
  totalSalary: number;
  totalPayable: number;
  policyConfirmed: boolean;
};

function formatDays(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export default function SalariesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams?.toString() ?? "";

  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [summary, setSummary] = useState<Omit<SalaryPayload, "employees"> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [role, setRole] = useState(searchParams?.get("role") ?? "all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [slipFor, setSlipFor] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipDraft, setSlipDraft] = useState<SalaryRow | null>(null);
  const [lossOfPayInput, setLossOfPayInput] = useState("0");
  const [lossOfPayError, setLossOfPayError] = useState<string | null>(null);
  const [lossOfPayHint, setLossOfPayHint] = useState<string | null>(null);

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
  const atEarliestMonth = comparePayrollMonths(payrollMonth, earliestMonth) === 0;
  const atLatestMonth = comparePayrollMonths(payrollMonth, latestMonth) === 0;

  useEffect(() => {
    const current = new URLSearchParams(queryKey);
    setSearch(current.get("search") ?? "");
    setRole(current.get("role") ?? "all");
  }, [queryKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = new URLSearchParams(queryKey);
      const params: Record<string, string> = {};
      const appliedSearch = current.get("search") ?? "";
      const appliedRole = current.get("role") ?? "all";
      if (appliedSearch) params.search = appliedSearch;
      if (appliedRole !== "all") params.role = appliedRole;
      params.month = payrollMonth.key;

      const response = await axios.get<{
        success: boolean;
        data: SalaryPayload;
        message?: string;
      }>("/api/finance/salaries", { params });

      if (!response.data.success) {
        setError(response.data.message ?? "Failed to load salaries");
        setRows([]);
        setSummary(null);
        return;
      }

      const { employees, ...totals } = response.data.data;
      setRows(employees);
      setSummary(totals);
    } catch (loadError) {
      const message =
        axios.isAxiosError(loadError) &&
        typeof loadError.response?.data === "object" &&
        loadError.response.data !== null &&
        "message" in loadError.response.data &&
        typeof loadError.response.data.message === "string"
          ? loadError.response.data.message
          : "Failed to load salaries";
      setError(message);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [payrollMonth.key, queryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyUpdatedRow = (next: Omit<SalaryRow, "pay">) => {
    setRows((current) => {
      let grossDelta = 0;
      let payableDelta = 0;
      const updated = current.map((row) => {
        if (row.id !== next.id) return row;
        grossDelta = next.salary - row.salary;
        const money = monthPayFromAttendance(next.salary, row.pay.totalDays, {
          lopDays: row.pay.lopDays,
          notJoinedDays: row.pay.notJoinedDays,
        });
        payableDelta = money.payableSalary - row.pay.payableSalary;
        return { ...next, pay: { ...row.pay, ...money } };
      });
      setSummary((currentSummary) =>
        currentSummary
          ? {
              ...currentSummary,
              totalSalary: currentSummary.totalSalary + grossDelta,
              totalPayable: currentSummary.totalPayable + payableDelta,
            }
          : currentSummary,
      );
      return updated;
    });
  };

  const writeQuery = (monthKey: string, searchValue = search, roleValue = role) => {
    const params = new URLSearchParams();
    params.set("month", monthKey);
    const trimmed = searchValue.trim();
    if (trimmed) params.set("search", trimmed);
    if (roleValue !== "all") params.set("role", roleValue);
    router.push(`/dashboard/finance/salaries?${params.toString()}`);
  };

  const applyFilters = () => {
    writeQuery(payrollMonth.key);
  };

  const generateSlip = async () => {
    if (!slipDraft) return;
    const trimmed = lossOfPayInput.trim();
    const monthDays = daysInPayrollMonth(payrollMonth);
    if (trimmed && !/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      setLossOfPayError("Enter loss of pay days as a number. Use 0 if there are none.");
      return;
    }
    const days = trimmed ? Number(trimmed) : 0;
    if (days > maxLossOfPayDays(monthDays)) {
      setLossOfPayError(
        `Loss of pay cannot be more than ${maxLossOfPayDays(monthDays)} days in a ${monthDays}-day month.`,
      );
      return;
    }

    setSlipFor(slipDraft.id);
    setSlipError(null);
    setLossOfPayError(null);
    try {
      const response = await axios.get<Blob>(`/api/finance/salaries/${slipDraft.id}/slip`, {
        params: { month: payrollMonth.key, lossOfPayDays: String(days) },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const code = (slipDraft.employeeCode || slipDraft.name).replace(/\s+/g, "-");
      link.href = url;
      link.download = `salary-slip-${code}-${payrollMonth.key}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setSlipDraft(null);
    } catch (slipLoadError) {
      let message = "Could not generate the salary slip";
      if (axios.isAxiosError(slipLoadError) && slipLoadError.response?.data instanceof Blob) {
        try {
          const parsed = JSON.parse(await slipLoadError.response.data.text()) as {
            message?: string;
          };
          if (parsed.message) message = parsed.message;
        } catch {
          message = "Could not generate the salary slip";
        }
      }
      setSlipError(message);
      setLossOfPayError(message);
    } finally {
      setSlipFor(null);
    }
  };

  const filtersActive = Boolean(
    searchParams?.get("search") || searchParams?.get("role"),
  );

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading="Salaries"
            subheading={`Payable salary for ${monthLabel}, calculated from each employee's attendance.`}
          />
          <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
            <Link href="/dashboard/finance">Overview</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Payroll month</p>
            <p className="text-lg font-semibold">{monthLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer"
              disabled={atEarliestMonth}
              onClick={() => writeQuery(addPayrollMonths(payrollMonth, -1).key)}
            >
              Previous month
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer"
              disabled={atLatestMonth}
              onClick={() => writeQuery(addPayrollMonths(payrollMonth, 1).key)}
            >
              Next month
            </Button>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Per day is the monthly salary divided by the days in {monthLabel}. Weekends, holidays, and paid leave stay payable. Absence, half days, unpaid leave, and unplanned leave are loss of pay.
        </p>
        {slipError ? (
          <p className="text-sm text-destructive" role="alert">
            {slipError}
          </p>
        ) : null}

        {summary && !summary.policyConfirmed ? (
          <p className="text-sm leading-6 text-muted-foreground">
            The attendance policy is not confirmed, so days that are still pending are not loss of pay yet.
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <SheetStat
            label="Active employees"
            value={
              summary ? summary.totalEmployees.toLocaleString("en-IN") : "—"
            }
            hint="On payroll this month"
          />
          <SheetStat
            label="Monthly gross"
            value={summary ? formatMoney(summary.totalSalary) : "—"}
            hint="Before attendance"
          />
          <SheetStat
            label="Payable"
            value={summary ? formatMoney(summary.totalPayable) : "—"}
            hint={`After attendance for ${monthLabel}`}
          />
        </div>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <div className="w-full min-w-[16rem] flex-1 space-y-1.5 sm:max-w-md">
            <label htmlFor="salary-search" className="text-xs font-medium text-foreground">
              Search
            </label>
            <Input
              id="salary-search"
              placeholder="Name, email, phone, or employee code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-48">
            <label htmlFor="salary-role" className="text-xs font-medium text-foreground">
              Role
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="salary-role" className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {employeeRoles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="h-10 cursor-pointer">
            Apply
          </Button>
          {filtersActive ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer"
            onClick={() => writeQuery(currentMonth.key, "", "all")}
            >
              Clear
            </Button>
          ) : null}
        </form>
      </div>

      {loading ? (
        <FinanceSheetSkeleton />
      ) : error ? (
        <FinanceSheetError message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <FinanceSheetEmpty
          title="No employees match"
          description={
            filtersActive
              ? "Try a different name or role."
              : "No active employees are on payroll for this month."
          }
        />
      ) : (
        <div className={sheetScrollClass}>
          <table className={sheetTableClass}>
            <thead>
              <tr>
                <th className={sheetThClass}>Employee</th>
                <th className={cn(sheetThClass, "text-right")}>Present</th>
                <th className={cn(sheetThClass, "text-right")}>Half</th>
                <th className={cn(sheetThClass, "text-right")}>Uninformed</th>
                <th className={cn(sheetThClass, "text-right")}>Paid leave</th>
                <th className={cn(sheetThClass, "text-right")}>Holiday</th>
                <th className={cn(sheetThClass, "text-right")}>Off</th>
                <th className={cn(sheetThClass, "text-right")}>LOP</th>
                <th className={cn(sheetThClass, "text-right")}>Days</th>
                <th className={cn(sheetThClass, "text-right")}>Payable days</th>
                <th className={cn(sheetThClass, "text-right")}>Per day</th>
                <th className={cn(sheetThClass, "text-right")}>Monthly</th>
                <th className={cn(sheetThClass, "text-right")}>Payable</th>
                <th className={sheetThClass}>Salary slip</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const open = openId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className={sheetRowClass(index)}>
                      <td className={sheetTdClass}>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[row.employeeCode, row.role, row.organization].filter(Boolean).join(" · ") || "No code"}
                        </div>
                      </td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.presentDays)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.halfDays)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.unplannedLeaveDays)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.paidLeaveDays)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.holidays)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.weeklyOffs)}</td>
                      <td
                        className={cn(sheetTdClass, "text-right tabular-nums", row.pay.lopDays > 0 && "font-medium text-destructive")}
                        title={
                          row.pay.pendingVerification > 0
                            ? `${formatDays(row.pay.pendingVerification)} days are still pending and are not loss of pay yet`
                            : undefined
                        }
                      >
                        {formatDays(row.pay.lopDays)}
                      </td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.totalDays)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatDays(row.pay.payableDays)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatMoney(row.pay.perDaySalary)}</td>
                      <td className={cn(sheetTdClass, "text-right tabular-nums")}>{formatMoney(row.salary)}</td>
                      <td className={cn(sheetTdClass, "text-right font-medium tabular-nums")}>
                        {formatMoney(row.pay.payableSalary)}
                      </td>
                      <td className={sheetTdClass}>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-10 cursor-pointer"
                            disabled={slipFor === row.id}
                            onClick={() => {
                              setLossOfPayInput(String(row.pay.lopDays));
                              setLossOfPayError(null);
                              setLossOfPayHint(null);
                              setSlipDraft(row);
                              void axios
                                .get<{
                                  success: boolean;
                                  data?: {
                                    lossOfPayDays: number;
                                    breakdown: LopBreakdown;
                                    paidLeaveDays: number;
                                    policyConfirmed: boolean;
                                    lastSlip: { lossOfPayDays: number; payrollStale: boolean } | null;
                                  };
                                }>("/api/attendance/lop", {
                                  params: { month: payrollMonth.key, employeeId: row.id },
                                })
                                .then((lopResponse) => {
                                  const lop = lopResponse.data.data;
                                  if (!lop) return;
                                  setLossOfPayInput(String(lop.lossOfPayDays));
                                  const notes = [
                                    lop.policyConfirmed
                                      ? `Attendance calculated ${lop.lossOfPayDays} loss of pay days for this month.`
                                      : "The attendance policy is not confirmed, so missing logins are not loss of pay yet.",
                                  ];
                                  const parts = describeLopBreakdown(lop.breakdown);
                                  if (parts) notes.push(`Made up of ${parts}.`);
                                  if (lop.paidLeaveDays > 0) {
                                    notes.push(`${lop.paidLeaveDays} paid leave day(s) are not deducted.`);
                                  }
                                  if (lop.lastSlip?.payrollStale) {
                                    notes.push(
                                      `The last slip used ${lop.lastSlip.lossOfPayDays} days, and attendance has changed since then.`,
                                    );
                                  }
                                  setLossOfPayHint(notes.join(" "));
                                })
                                .catch(() => {
                                  setLossOfPayHint("Attendance loss of pay could not be loaded. You can still enter the days.");
                                });
                            }}
                          >
                            {slipFor === row.id ? "Generating…" : "Generate slip"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 cursor-pointer"
                            aria-expanded={open}
                            aria-controls={`salary-panel-${row.id}`}
                            onClick={() => setOpenId(open ? null : row.id)}
                          >
                            {open ? "Hide" : "Details"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className={sheetRowClass(index)}>
                        <td id={`salary-panel-${row.id}`} className="border-b border-border p-0" colSpan={14}>
                          <SalaryDetail
                            row={row}
                            monthLabel={monthLabel}
                            onUpdated={applyUpdatedRow}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={sheetFooterClass}>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading salaries"
            : summary
              ? `${summary.totalEmployees.toLocaleString("en-IN")} active employees`
              : "Salaries unavailable"}
        </p>
        <p className="text-sm font-medium tabular-nums">
          Payable {summary && !loading ? formatMoney(summary.totalPayable) : "—"}
        </p>
      </div>

      <Dialog
        open={slipDraft !== null}
        onOpenChange={(open) => {
          if (!open && slipFor === null) setSlipDraft(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate salary slip</DialogTitle>
            <DialogDescription>
              {slipDraft
                ? `${slipDraft.name} · ${monthLabel}. Payable is ${formatMoney(slipDraft.pay.payableSalary)} before you change the loss of pay days.`
                : "Enter loss of pay days."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void generateSlip();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="loss-of-pay-days" className="text-sm font-medium">
                Loss of pay days
              </label>
              <Input
                id="loss-of-pay-days"
                inputMode="decimal"
                value={lossOfPayInput}
                onChange={(event) => setLossOfPayInput(event.target.value)}
                className="h-10 text-base"
                aria-invalid={lossOfPayError ? true : undefined}
                aria-describedby="loss-of-pay-hint"
              />
              <p id="loss-of-pay-hint" className="text-xs leading-5 text-muted-foreground">
                {lossOfPayHint
                  ? `${lossOfPayHint} You can change the number before generating the slip. This month has ${daysInPayrollMonth(payrollMonth)} days.`
                  : slipDraft && slipDraft.pay.notJoinedDays > 0
                    ? `${formatDays(slipDraft.pay.notJoinedDays)} day(s) before joining are also deducted. This month has ${daysInPayrollMonth(payrollMonth)} days.`
                    : `Enter 0 if this employee has no loss of pay. This month has ${daysInPayrollMonth(payrollMonth)} days.`}
              </p>
              {lossOfPayError ? (
                <p className="text-sm text-destructive" role="alert">
                  {lossOfPayError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-10 cursor-pointer"
                disabled={slipFor !== null}
                onClick={() => setSlipDraft(null)}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-10 cursor-pointer" disabled={slipFor !== null}>
                {slipFor ? "Generating…" : "Generate slip"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
