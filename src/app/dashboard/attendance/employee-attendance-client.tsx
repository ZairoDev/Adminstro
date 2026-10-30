"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import type { EmployeeAttendancePayload } from "@/modules/attendance/view";
import {
  FinanceSheetError,
  FinanceSheetSkeleton,
  sheetFrameClass,
  sheetScrollClass,
  sheetToolbarClass,
} from "../finance/_components/finance-sheet-frame";

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

export default function EmployeeAttendanceClient({
  employeeId,
  selfService = false,
}: {
  employeeId?: string;
  selfService?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = currentPayrollMonth();
  const requested = parsePayrollMonth(searchParams?.get("month") ?? "");
  const month = requested && comparePayrollMonths(requested, current) <= 0 ? requested : current;
  const [data, setData] = useState<EmployeeAttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selfService ? "/api/attendance/me" : `/api/attendance/employee/${employeeId}`;
      const response = await axios.get<{ success: boolean; data: EmployeeAttendancePayload; message?: string }>(url, {
        params: { month: month.key },
      });
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
  }, [employeeId, month.key, selfService]);

  useEffect(() => {
    void load();
  }, [load]);

  const writeMonth = (key: string) => {
    const base = selfService ? "/dashboard/my-attendance" : `/dashboard/attendance/${employeeId}`;
    router.replace(`${base}?month=${key}`);
  };

  const employee = data?.employee;

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading={employee?.name ?? "Attendance"}
            subheading={
              employee
                ? `${employee.employeeCode || "No code"} · ${employee.department || "No department"} · ${employee.designation || "No designation"}`
                : "Monthly attendance"
            }
          />
          {selfService ? null : (
            <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
              <Link href={`/dashboard/attendance?month=${month.key}`}>All employees</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={() => writeMonth(addPayrollMonths(month, -1).key)}>
            Previous
          </Button>
          <p className="min-w-32 text-center text-sm font-semibold">{payrollMonthLabel(month)}</p>
          <Button
            type="button"
            variant="outline"
            className="h-10 cursor-pointer"
            disabled={comparePayrollMonths(month, current) >= 0}
            onClick={() => writeMonth(addPayrollMonths(month, 1).key)}
          >
            Next
          </Button>
          <Button type="button" variant="outline" className="h-10 cursor-pointer" onClick={() => writeMonth(current.key)}>
            This month
          </Button>
        </div>
        {data ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            <Stat label="Joining" value={data.employee.joiningDate || "—"} />
            <Stat label="Shift" value={data.shiftLabel} />
            <Stat label="Present" value={String(data.summary.presentDays)} />
            <Stat label="Absent" value={String(data.summary.absentDays)} />
            <Stat label="Half days" value={String(data.summary.halfDays)} />
            <Stat label="Paid leave" value={String(data.summary.paidLeaveDays)} />
            <Stat label="Unpaid leave" value={String(data.summary.unpaidLeaveDays)} />
            <Stat label="Holidays" value={String(data.summary.holidays)} />
            <Stat label="Weekly offs" value={String(data.summary.weeklyOffs)} />
            <Stat label="Late" value={String(data.summary.lateArrivals)} />
            <Stat label="LOP days" value={String(data.summary.lopDays)} />
            <Stat label="Attendance" value={`${data.summary.attendancePercentage}%`} />
          </div>
        ) : null}
      </div>
      <div className={cn(sheetScrollClass, "space-y-6 p-4")}>
        {loading ? <FinanceSheetSkeleton /> : null}
        {!loading && error ? <FinanceSheetError message={error} onRetry={() => void load()} /> : null}
        {data ? (
          <>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label} className="px-1 py-1 text-center text-[11px] font-medium text-muted-foreground">{label}</div>
              ))}
              {Array.from({ length: weekdayOffset(data.dates[0] ?? "") }, (_, index) => (
                <div key={`pad-${index}`} />
              ))}
              {data.days.map((day) => (
                <div key={day.date} className="min-h-16 rounded-md border border-border p-1.5">
                  <p className="text-[11px] text-muted-foreground">{Number(day.date.slice(-2))}</p>
                  {day.status ? (
                    <span className={cn("mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold", LETTER_CLASS[day.letter])}>
                      {day.letter}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {day.firstLoginLabel ? <p className="mt-1 text-[11px] tabular-nums">{day.firstLoginLabel}</p> : null}
                </div>
              ))}
            </div>
            <section>
              <h2 className="text-sm font-semibold">Daily history</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Login</th>
                      <th className="py-2 pr-3 font-medium">Source</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.filter((day) => day.status).map((day) => (
                      <tr key={day.date} className="border-b border-border">
                        <td className="py-2 pr-3">{day.date}</td>
                        <td className="py-2 pr-3">{day.label}</td>
                        <td className="py-2 pr-3 tabular-nums">{day.firstLoginLabel || "—"}</td>
                        <td className="py-2 pr-3">{day.sourceLabel || "—"}</td>
                        <td className="py-2 text-muted-foreground">{day.remarks || (day.isManuallyAdjusted ? "Corrected" : "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h2 className="text-sm font-semibold">Recent corrections</h2>
              {data.audits.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No corrections this month.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.audits.map((audit) => (
                    <li key={audit.id} className="rounded-md border border-border px-3 py-2 text-sm">
                      <p className="font-medium">{audit.attendanceDate}: {audit.oldStatus} → {audit.newStatus}</p>
                      <p className="text-muted-foreground">{audit.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {audit.changedByName}
                        {audit.approvedByName ? ` · Approved by ${audit.approvedByName}` : ""}
                        {audit.oldLoginLabel || audit.newLoginLabel
                          ? ` · Login ${audit.oldLoginLabel || "—"} to ${audit.newLoginLabel || "—"}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function weekdayOffset(dateKey: string): number {
  if (!dateKey) return 0;
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCDay();
}
