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
  latestOpenPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";

type SalaryPayload = {
  employees: SalaryRow[];
  totalEmployees: number;
  totalSalary: number;
};

function formatJoined(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const latestMonth = latestOpenPayrollMonth();
  const requestedMonth = parsePayrollMonth(searchParams?.get("month") ?? "");
  const payrollMonth =
    requestedMonth &&
    comparePayrollMonths(requestedMonth, currentMonth) >= 0 &&
    comparePayrollMonths(requestedMonth, latestMonth) <= 0
      ? requestedMonth
      : currentMonth;
  const monthLabel = payrollMonthLabel(payrollMonth);
  const atCurrentMonth = comparePayrollMonths(payrollMonth, currentMonth) === 0;
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

  const applyUpdatedRow = (next: SalaryRow) => {
    setRows((current) => {
      const previous = current.find((row) => row.id === next.id);
      const delta = next.salary - (previous?.salary ?? next.salary);
      setSummary((currentSummary) =>
        currentSummary
          ? { ...currentSummary, totalSalary: currentSummary.totalSalary + delta }
          : currentSummary,
      );
      return current.map((row) => (row.id === next.id ? next : row));
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
    if (days > monthDays) {
      setLossOfPayError(`This month has ${monthDays} days.`);
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
            subheading={`Monthly payroll from ${payrollMonthLabel(currentMonth)}. Generate a salary slip for each employee.`}
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
              disabled={atCurrentMonth}
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
        {slipError ? (
          <p className="text-sm text-destructive" role="alert">
            {slipError}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <SheetStat
            label="Active employees"
            value={
              summary ? summary.totalEmployees.toLocaleString("en-IN") : "—"
            }
            hint="On payroll this month"
          />
          <SheetStat
            label="Gross payroll"
            value={summary ? formatMoney(summary.totalSalary) : "—"}
            hint={`Total gross for ${monthLabel}`}
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
                <th className={sheetThClass}>Code</th>
                <th className={sheetThClass}>Role</th>
                <th className={sheetThClass}>Organization</th>
                <th className={sheetThClass}>Type</th>
                <th className={sheetThClass}>Joined</th>
                <th className={cn(sheetThClass, "text-right")}>Gross</th>
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
                          {row.email || "No email"}
                          {row.phone ? ` · ${row.phone}` : ""}
                        </div>
                      </td>
                      <td className={sheetTdClass}>{row.employeeCode || "—"}</td>
                      <td className={sheetTdClass}>{row.role || "—"}</td>
                      <td className={sheetTdClass}>{row.organization || "—"}</td>
                      <td className={sheetTdClass}>{row.empType || "—"}</td>
                      <td className={sheetTdClass}>{formatJoined(row.dateOfJoining)}</td>
                      <td className={cn(sheetTdClass, "text-right font-medium tabular-nums")}>
                        {formatMoney(row.salary)}
                      </td>
                      <td className={sheetTdClass}>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-10 cursor-pointer"
                            disabled={slipFor === row.id}
                            onClick={() => {
                              setLossOfPayInput("0");
                              setLossOfPayError(null);
                              setLossOfPayHint(null);
                              setSlipDraft(row);
                              void axios
                                .get<{
                                  success: boolean;
                                  data?: {
                                    lossOfPayDays: number;
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
                        <td id={`salary-panel-${row.id}`} className="border-b border-border p-0" colSpan={8}>
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
          Total {summary && !loading ? formatMoney(summary.totalSalary) : "—"}
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
                ? `${slipDraft.name} · ${monthLabel}. Loss of pay is deducted from the gross for this month.`
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
