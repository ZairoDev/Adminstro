"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
  type PayrollMonth,
} from "@/modules/finance/salary-month";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/modules/attendance/types";
import { STATUS_LABELS } from "@/modules/attendance/presentation";
import type { AttendanceDayCell, AttendanceEmployeeRow, AttendanceMonthPayload } from "@/modules/attendance/view";
import {
  FinanceSheetEmpty,
  FinanceSheetError,
  FinanceSheetSkeleton,
  sheetFrameClass,
  sheetScrollClass,
  sheetToolbarClass,
} from "../finance/_components/finance-sheet-frame";

const CARD_FILTERS = [
  { id: "", label: "Total employees", hint: "In this view", field: "totalEmployees" },
  { id: "present", label: "Present", hint: "On the selected day", field: "presentOnDate" },
  { id: "absent", label: "Absent", hint: "On the selected day", field: "absentOnDate" },
  { id: "on_leave", label: "On leave", hint: "On the selected day", field: "onLeaveOnDate" },
  { id: "late", label: "Late arrivals", hint: "On the selected day", field: "lateOnDate" },
  { id: "pending", label: "Pending", hint: "On the selected day", field: "pendingOnDate" },
  { id: "percent", label: "Attendance", hint: "Selected month", field: "monthlyAttendancePercentage" },
  { id: "lop", label: "LOP days", hint: "Selected month", field: "totalLopDays" },
] as const;

const LETTER_CLASS: Record<string, string> = {
  P: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50",
  LT: "bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-50",
  A: "bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-50",
  HD: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-50",
  LV: "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-50",
  H: "bg-muted text-muted-foreground",
  WO: "bg-muted text-muted-foreground",
  WF: "bg-teal-100 text-teal-950 dark:bg-teal-950 dark:text-teal-50",
  NJ: "bg-muted text-muted-foreground",
  PV: "border border-dashed border-foreground/40 bg-transparent text-foreground",
};

function normalizeClock(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return trimmed;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function monthOptions(): PayrollMonth[] {
  const current = currentPayrollMonth();
  const start = addPayrollMonths(current, -18);
  const months: PayrollMonth[] = [];
  let cursor = start;
  while (comparePayrollMonths(cursor, current) <= 0) {
    months.push(cursor);
    cursor = addPayrollMonths(cursor, 1);
  }
  return months.reverse();
}

function cardValue(data: AttendanceMonthPayload, field: (typeof CARD_FILTERS)[number]["field"]): string {
  const value = data.cards[field];
  if (field === "monthlyAttendancePercentage") return `${value}%`;
  return String(value);
}

export default function AttendanceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams?.toString() ?? "";
  const current = currentPayrollMonth();
  const requested = parsePayrollMonth(searchParams?.get("month") ?? "");
  const month =
    requested && comparePayrollMonths(requested, current) <= 0 ? requested : current;
  const department = searchParams?.get("department") ?? "";
  const card = searchParams?.get("card") ?? "";
  const page = Number(searchParams?.get("page") ?? "1") || 1;

  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [data, setData] = useState<AttendanceMonthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ employee: AttendanceEmployeeRow; day: AttendanceDayCell } | null>(null);

  useEffect(() => {
    setSearch(searchParams?.get("search") ?? "");
  }, [queryKey, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ success: boolean; data: AttendanceMonthPayload; message?: string }>(
        "/api/attendance/month",
        {
          params: {
            month: month.key,
            department,
            search: searchParams?.get("search") ?? "",
            card,
            page,
          },
        },
      );
      if (!response.data.success) {
        setError(response.data.message ?? "Could not load attendance");
        setData(null);
        return;
      }
      setData(response.data.data);
    } catch (loadError) {
      const message =
        axios.isAxiosError(loadError) &&
        typeof loadError.response?.data === "object" &&
        loadError.response.data !== null &&
        "message" in loadError.response.data &&
        typeof loadError.response.data.message === "string"
          ? loadError.response.data.message
          : "Could not load attendance";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [card, department, month.key, page, searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const writeQuery = (next: {
    month?: string;
    department?: string;
    search?: string;
    card?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    params.set("month", next.month ?? month.key);
    const nextDepartment = next.department ?? department;
    const nextSearch = next.search ?? (searchParams?.get("search") ?? "");
    const nextCard = next.card ?? card;
    const nextPage = next.page ?? 1;
    if (nextDepartment) params.set("department", nextDepartment);
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextCard) params.set("card", nextCard);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.replace(`/dashboard/attendance?${params.toString()}`);
  };

  const filtersActive = Boolean(department || searchParams?.get("search") || card);

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading="Attendance"
            subheading="First dashboard login of each IST day. Missing logins stay pending until the policy is confirmed."
          />
          <div className="flex gap-2">
            {data?.canManagePolicy ? (
              <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
                <Link href="/dashboard/attendance/settings">Settings</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
              <a
                href={`/api/attendance/export?month=${month.key}${department ? `&department=${encodeURIComponent(department)}` : ""}${searchParams?.get("search") ? `&search=${encodeURIComponent(searchParams.get("search") ?? "")}` : ""}${card ? `&card=${card}` : ""}`}
              >
                Export CSV
              </a>
            </Button>
          </div>
        </div>

        {data && !data.policyConfirmed ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            The attendance policy is not confirmed. Working days without a login stay pending verification and do not create loss of pay.
          </p>
        ) : null}
        {data?.periodStatus === "finalized" ? (
          <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
            {payrollMonthLabel(month)} is finalized. Automatic updates are paused. A super admin can still correct a day.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          {CARD_FILTERS.map((item) => {
            const active = item.id === "" ? card === "" : card === item.id;
            const value = data ? cardValue(data, item.field) : "—";
            return (
              <button
                key={item.id || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => writeQuery({ card: item.id === "percent" ? "" : item.id, page: 1 })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  active ? "border-foreground bg-muted" : "border-border bg-background hover:bg-muted/60",
                )}
              >
                <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums leading-6">{loading ? "—" : value}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.id === "percent" || item.id === "lop" ? payrollMonthLabel(month) : data?.cards.asOfLabel ?? item.hint}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer"
              onClick={() => writeQuery({ month: addPayrollMonths(month, -1).key })}
            >
              Previous
            </Button>
            <label className="sr-only" htmlFor="attendance-month">Month</label>
            <select
              id="attendance-month"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={month.key}
              onChange={(event) => writeQuery({ month: event.target.value })}
            >
              {monthOptions().map((option) => (
                <option key={option.key} value={option.key}>
                  {payrollMonthLabel(option)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer"
              disabled={comparePayrollMonths(month, current) >= 0}
              onClick={() => writeQuery({ month: addPayrollMonths(month, 1).key })}
            >
              Next
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 cursor-pointer"
              onClick={() => writeQuery({ month: current.key })}
            >
              This month
            </Button>
          </div>
          <label className="sr-only" htmlFor="attendance-department">Department</label>
          <select
            id="attendance-department"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={department}
            onChange={(event) => writeQuery({ department: event.target.value })}
          >
            <option value="">All departments</option>
            {(data?.departments ?? []).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              writeQuery({ search });
            }}
          >
            <label className="sr-only" htmlFor="attendance-search">Search employees</label>
            <Input
              id="attendance-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or code"
              className="h-10 w-56"
            />
            <Button type="submit" variant="outline" className="h-10 cursor-pointer">Search</Button>
          </form>
          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 cursor-pointer"
              onClick={() => {
                setSearch("");
                writeQuery({ department: "", search: "", card: "", page: 1 });
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          P present, LT late, A absent, HD half day, LV leave, H holiday, WO weekly off, WF work from home, NJ not joined, PV pending.
        </p>
      </div>

      <div className={sheetScrollClass}>
        {loading ? <FinanceSheetSkeleton /> : null}
        {!loading && error ? <FinanceSheetError message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && data && data.employees.length === 0 ? (
          <FinanceSheetEmpty
            title="No employees in this view"
            description="Try another month, department, or search. Employees appear when their joining and exit dates overlap the month."
          />
        ) : null}
        {!loading && !error && data && data.employees.length > 0 ? (
          <TooltipProvider delayDuration={200}>
            <table className="w-max min-w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 min-w-[6.5rem] border-b border-border bg-muted px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Code</th>
                  <th className="sticky left-[6.5rem] top-0 z-30 min-w-[11rem] border-b border-border bg-muted px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                  <th className="sticky top-0 z-20 border-b border-border bg-muted px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Dept</th>
                  <th className="sticky top-0 z-20 border-b border-border bg-muted px-2 py-2 text-right text-xs font-semibold text-muted-foreground">Work</th>
                  <th className="sticky top-0 z-20 border-b border-border bg-muted px-2 py-2 text-right text-xs font-semibold text-muted-foreground">P</th>
                  <th className="sticky top-0 z-20 border-b border-border bg-muted px-2 py-2 text-right text-xs font-semibold text-muted-foreground">A</th>
                  <th className="sticky top-0 z-20 border-b border-border bg-muted px-2 py-2 text-right text-xs font-semibold text-muted-foreground">Leave</th>
                  <th className="sticky top-0 z-20 border-b border-border bg-muted px-2 py-2 text-right text-xs font-semibold text-muted-foreground">LOP</th>
                  <th className="sticky top-0 z-20 border-b border-border bg-muted px-2 py-2 text-right text-xs font-semibold text-muted-foreground">%</th>
                  {data.dates.map((date) => (
                    <th key={date} className="sticky top-0 z-20 w-10 border-b border-border bg-muted px-1 py-2 text-center text-xs font-semibold text-muted-foreground" title={date}>
                      {Number(date.slice(-2))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/40">
                    <td className="sticky left-0 z-10 border-b border-border bg-background px-3 py-2 font-medium">{employee.employeeCode || "—"}</td>
                    <td className="sticky left-[6.5rem] z-10 border-b border-border bg-background px-3 py-2">
                      <Link href={`/dashboard/attendance/${employee.id}?month=${month.key}`} className="font-medium underline-offset-2 hover:underline">
                        {employee.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{employee.designation || employee.department || "—"}</p>
                    </td>
                    <td className="border-b border-border px-2 py-2 text-muted-foreground">{employee.department || "—"}</td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">{employee.summary.scheduledWorkingDays}</td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">{employee.summary.presentDays}</td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">{employee.summary.absentDays}</td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums" title={`${employee.summary.paidLeaveDays} paid, ${employee.summary.unpaidLeaveDays} unpaid`}>
                      {employee.summary.paidLeaveDays + employee.summary.unpaidLeaveDays}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">{employee.summary.lopDays}</td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">{employee.summary.attendancePercentage}</td>
                    {employee.days.map((day) => (
                      <td key={day.date} className="border-b border-border px-1 py-1 text-center">
                        {day.status ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex h-7 min-w-7 items-center justify-center rounded px-1 text-[10px] font-semibold",
                                  LETTER_CLASS[day.letter] ?? "bg-muted text-foreground",
                                )}
                                aria-label={`${day.date} ${day.label}`}
                                onClick={() => setSelected({ employee, day })}
                              >
                                {day.letter}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{day.date}</p>
                              <p>{day.label}</p>
                              <p>Login {day.firstLoginLabel || "—"}</p>
                              <p>Shift {day.shiftStartLabel && day.shiftEndLabel ? `${day.shiftStartLabel}–${day.shiftEndLabel}` : "—"}</p>
                              {day.isLate ? <p>Late by {day.lateByMinutes} min</p> : null}
                              <p>{day.sourceLabel || "No source"}</p>
                              {day.isManuallyAdjusted ? <p>Manually corrected</p> : null}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground" aria-label={`${day.date} not recorded`}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        ) : null}
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.totalEmployees} employees
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={data.page <= 1} onClick={() => writeQuery({ page: data.page - 1 })}>
              Previous page
            </Button>
            <Button type="button" variant="outline" className="h-10 cursor-pointer" disabled={data.page >= data.totalPages} onClick={() => writeQuery({ page: data.page + 1 })}>
              Next page
            </Button>
          </div>
        </div>
      ) : null}

      <DaySheet
        selected={selected}
        canCorrect={Boolean(data?.canCorrect)}
        onClose={() => setSelected(null)}
        onSaved={() => {
          setSelected(null);
          void load();
        }}
      />
    </div>
  );
}

function DaySheet({
  selected,
  canCorrect,
  onClose,
  onSaved,
}: {
  selected: { employee: AttendanceEmployeeRow; day: AttendanceDayCell } | null;
  canCorrect: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const day = selected?.day;
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [leavePay, setLeavePay] = useState<"paid" | "unpaid">("paid");
  const [loginTime, setLoginTime] = useState("");
  const [clearLogin, setClearLogin] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!day?.status) return;
    setStatus(day.status);
    setLeavePay(day.leavePay === "unpaid" ? "unpaid" : "paid");
    setLoginTime(day.firstLoginLabel);
    setClearLogin(false);
    setRemarks(day.remarks);
    setReason("");
    setFormError(null);
  }, [day]);

  const save = async () => {
    if (!day?.recordId) return;
    setSaving(true);
    setFormError(null);
    try {
      await axios.patch(`/api/attendance/records/${day.recordId}`, {
        status,
        leavePay: status === "on_leave" ? leavePay : null,
        firstLoginTime: clearLogin ? null : normalizeClock(loginTime),
        remarks,
        reason,
      });
      onSaved();
    } catch (saveError) {
      const message =
        axios.isAxiosError(saveError) &&
        typeof saveError.response?.data === "object" &&
        saveError.response.data !== null &&
        "message" in saveError.response.data &&
        typeof saveError.response.data.message === "string"
          ? saveError.response.data.message
          : "Could not save the correction";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {selected && day ? (
          <>
            <SheetHeader>
              <SheetTitle>{selected.employee.name}</SheetTitle>
              <SheetDescription>
                {day.date} · {day.label}
              </SheetDescription>
            </SheetHeader>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Employee code" value={selected.employee.employeeCode || "—"} />
              <Row label="Department" value={selected.employee.department || "—"} />
              <Row label="Designation" value={selected.employee.designation || "—"} />
              <Row label="First login" value={day.firstLoginLabel ? `${day.firstLoginLabel} IST` : "—"} />
              <Row label="Shift" value={day.shiftStartLabel ? `${day.shiftStartLabel}–${day.shiftEndLabel} IST` : "—"} />
              <Row label="Late" value={day.isLate ? `${day.lateByMinutes} min` : "No"} />
              <Row label="Source" value={day.sourceLabel || "—"} />
              <Row label="Correction" value={day.isManuallyAdjusted ? "Manual" : "Automatic"} />
              <Row label="Remarks" value={day.remarks || "—"} />
            </dl>
            {day.anomalyLabels.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {day.anomalyLabels.map((flag) => <li key={flag}>{flag}</li>)}
              </ul>
            ) : null}
            {canCorrect && day.recordId ? (
              <form
                className="mt-6 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <label className="block text-sm font-medium" htmlFor="attendance-status">Status</label>
                <select
                  id="attendance-status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
                >
                  {ATTENDANCE_STATUSES.map((item) => (
                    <option key={item} value={item}>{STATUS_LABELS[item]}</option>
                  ))}
                </select>
                {status === "on_leave" ? (
                  <select
                    aria-label="Leave pay"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={leavePay}
                    onChange={(event) => setLeavePay(event.target.value as "paid" | "unpaid")}
                  >
                    <option value="paid">Paid leave</option>
                    <option value="unpaid">Unpaid leave</option>
                  </select>
                ) : null}
                <label className="block text-sm font-medium" htmlFor="attendance-login">First login (IST)</label>
                <Input
                  id="attendance-login"
                  value={loginTime}
                  onChange={(event) => setLoginTime(event.target.value)}
                  placeholder="09:55"
                  className="h-10"
                  disabled={clearLogin}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={clearLogin} onChange={(event) => setClearLogin(event.target.checked)} />
                  Clear the login time
                </label>
                <label className="block text-sm font-medium" htmlFor="attendance-remarks">Remarks</label>
                <Textarea id="attendance-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
                <label className="block text-sm font-medium" htmlFor="attendance-reason">Reason for correction</label>
                <Textarea id="attendance-reason" value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} />
                {formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}
                <Button type="submit" className="h-10 cursor-pointer" disabled={saving}>
                  {saving ? "Saving…" : "Save correction"}
                </Button>
              </form>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
