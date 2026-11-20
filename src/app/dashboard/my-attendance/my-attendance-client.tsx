"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import { describeLopBreakdown } from "@/modules/attendance/presentation";
import type { AttendanceGuide } from "@/modules/attendance/view";
import type {
  AttendanceDayCell,
  EmployeeAttendancePayload,
} from "@/modules/attendance/view";
import { AttendanceCheckTime } from "@/components/attendance/AttendanceCheckTime";
import { AttendanceDayActionsList } from "@/components/attendance/AttendanceDayActionsList";
import { formatDayCount } from "../attendance/leave-shared";
import LeavePanel from "../attendance/leave-panel";
import { MyAttendanceSkeleton } from "./my-attendance-skeleton";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const OFF_STATUSES = new Set(["holiday", "weekly_off", "not_joined"]);
const SYSTEM_CHECKOUT_LABEL = "23:59";
const LOGIN_PREVIEW_LIMIT = 8;

const CHART_HUE = "#1d5fbf";
const AMBER = "#9a6700";
const PAY_SIGNAL = "#9f1239";
const PLANNED = "#3d6fbf";
const HATCH_STYLE = {
  backgroundColor: "#fff6e8",
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='7' height='7'><path d='M-1 7 L7 -1 M-1 1 L1 -1 M5 7 L7 5' stroke='%239a6700' stroke-opacity='0.55' stroke-width='1'/></svg>",
  )}")`,
} as const;

const distributionConfig = {
  present: { label: "Present", color: CHART_HUE },
  half: { label: "Half day", color: AMBER },
  planned: { label: "Planned leave", color: PLANNED },
  unplanned: { label: "Unplanned leave", color: PAY_SIGNAL },
  unapproved: { label: "Unapproved", color: "#4a4a4a" },
  off: { label: "Off", color: "#d0d0d0" },
} satisfies ChartConfig;

type DayKind =
  | "grace"
  | "half"
  | "planned"
  | "unplanned"
  | "present"
  | "unapproved"
  | "off"
  | "other"
  | "empty";

const KIND_WORD: Record<DayKind, string> = {
  grace: "Grace day",
  half: "Half day",
  planned: "Planned leave",
  unplanned: "Unplanned leave",
  present: "Present",
  unapproved: "Unapproved",
  off: "Off",
  other: "",
  empty: "",
};

const KIND_CLASS: Record<DayKind, string> = {
  grace: "font-medium text-[#9a6700] underline decoration-[#9a6700] decoration-2 underline-offset-2 dark:text-amber-300",
  half: "font-medium text-[#9a6700] dark:text-amber-200",
  planned: "bg-[#e7f0fb] font-medium text-[#1d5fbf] dark:bg-sky-950/50 dark:text-sky-200",
  unplanned: "font-medium text-[#9f1239] dark:text-rose-300",
  present: "text-muted-foreground",
  unapproved: "text-muted-foreground",
  off: "text-muted-foreground",
  other: "text-muted-foreground",
  empty: "",
};

export default function MyAttendanceClient({
  employeeId,
}: {
  /** When set, show this employee’s attendance. HR/Admin/SuperAdmin, or their reporting manager. */
  employeeId?: string;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewingOther = Boolean(employeeId);
  const pageBase = viewingOther
    ? `/dashboard/attendance/${employeeId}`
    : "/dashboard/my-attendance";
  const apiPath = viewingOther
    ? `/api/attendance/employee/${employeeId}`
    : "/api/attendance/me";
  const current = currentPayrollMonth();
  const requested = parsePayrollMonth(searchParams?.get("month") ?? "");
  const month =
    requested && comparePayrollMonths(requested, current) <= 0 ? requested : current;
  const [data, setData] = useState<EmployeeAttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<AttendanceDayCell | null>(null);
  const [logFilter, setLogFilter] = useState<"all" | "login" | "logout">("all");
  const [logExpanded, setLogExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{
        success: boolean;
        data: EmployeeAttendancePayload;
        message?: string;
      }>(apiPath, { params: { month: month.key } });
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
  }, [apiPath, month.key]);

  const refreshAttendance = useCallback(async () => {
    try {
      const response = await axios.get<{
        success: boolean;
        data: EmployeeAttendancePayload;
      }>(apiPath, { params: { month: month.key } });
      if (response.data.success) setData(response.data.data);
    } catch {
      // The leave panel reports its own errors. Keep the calendar as it is.
    }
  }, [apiPath, month.key]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setLogFilter("all");
    setLogExpanded(false);
  }, [month.key]);

  const writeMonth = (key: string) => {
    router.replace(`${pageBase}?month=${key}`);
  };

  const todayKey = istTodayKey();
  const canGoNext = comparePayrollMonths(month, current) < 0;
  const padCount = useMemo(() => weekdayOffset(data?.dates[0] ?? ""), [data?.dates]);
  const plannedDays = (data?.summary.paidLeaveDays ?? 0) + (data?.summary.unpaidLeaveDays ?? 0);
  const distribution = useMemo(() => {
    if (!data) return [];
    return [
      { key: "present", label: "Present", count: data.summary.presentDays, fill: "var(--color-present)", color: CHART_HUE },
      { key: "half", label: "Half day", count: data.summary.halfDays, fill: "var(--color-half)", color: AMBER },
      { key: "planned", label: "Planned leave", count: plannedDays, fill: "var(--color-planned)", color: PLANNED },
      { key: "unplanned", label: "Unplanned leave", count: data.summary.unplannedLeaveDays, fill: "var(--color-unplanned)", color: PAY_SIGNAL },
      { key: "unapproved", label: "Unapproved", count: data.summary.absentDays, fill: "var(--color-unapproved)", color: "#4a4a4a" },
      {
        key: "off",
        label: "Off",
        count: data.summary.holidays + data.summary.weeklyOffs,
        fill: "var(--color-off)",
        color: "#d0d0d0",
      },
    ].filter((slice) => slice.count > 0);
  }, [data, plannedDays]);
  const loginRows = useMemo(
    () => buildLoginRows(data?.days ?? [], todayKey),
    [data?.days, todayKey],
  );
  const filteredLogins = useMemo(
    () => (logFilter === "all" ? loginRows : loginRows.filter((row) => row.kind === logFilter)),
    [logFilter, loginRows],
  );
  const visibleLogins = logExpanded ? filteredLogins : filteredLogins.slice(0, LOGIN_PREVIEW_LIMIT);
  const lopNote = data ? describeLopBreakdown(data.summary.lopBreakdown) : "";
  const finding = !data
    ? "How this month counts toward pay."
    : data.summary.lopDays > 0
      ? `${formatDayCount(data.summary.lopDays)} days of loss of pay this month${lopNote ? `. ${lopNote}` : ""}.`
      : `No loss of pay this month. ${data.summary.presentDays} days present.`;

  return (
    <div className="space-y-6 bg-[#f2f4f7] p-4 text-[#111] dark:bg-background dark:text-foreground md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {viewingOther ? (
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-9 cursor-pointer px-2">
              <Link href={`/dashboard/attendance?month=${month.key}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {data?.canCorrect ? "All employees" : "Team attendance"}
              </Link>
            </Button>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight">
            {viewingOther ? data?.employee.name || "Employee attendance" : "My attendance"}
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#5f6368] dark:text-muted-foreground">
            {finding}
            {data ? ` Shift ${data.shiftLabel}.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            aria-label="Previous month"
            onClick={() => writeMonth(addPayrollMonths(month, -1).key)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 cursor-pointer px-3"
            onClick={() => writeMonth(current.key)}
          >
            This month
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={() => writeMonth(addPayrollMonths(month, 1).key)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {loading ? <MyAttendanceSkeleton withHeader={false} /> : null}

      {!loading && error ? (
        <div className="rounded-md border border-border p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" className="mt-3 cursor-pointer" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <section
            aria-label="What the numbers mean"
            className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#e8e8e8] bg-[#e8e8e8] dark:border-border dark:bg-border sm:grid-cols-2 xl:grid-cols-3"
          >
            <Explain
              label="Loss of pay"
              value={formatDayCount(data.summary.lopDays)}
              text={lopNote || "Nothing has been cut from pay this month."}
              lead
              tone={data.summary.lopDays === 0 ? "muted" : "rose"}
            />
            <Explain
              label="Present"
              value={String(data.summary.presentDays)}
              text="Full days you were in for the shift, including grace days."
              tone="blue"
            />
            <Explain
              tone="amber"
              label="Grace days"
              value={
                data.guide.graceCutsPay
                  ? `${data.guide.graceDaysUsed} of ${data.guide.graceDaysAllowed}`
                  : String(data.guide.graceDaysUsed)
              }
              text={graceText(data.guide)}
            />
            <Explain
              tone="amber"
              label="Half days"
              value={String(data.summary.halfDays)}
              text={halfDayText(data.guide)}
            />
            <Explain
              tone="blue"
              label="Planned leave"
              value={String(plannedDays)}
              text={plannedText(data.summary.paidLeaveDays, data.summary.unpaidLeaveDays)}
            />
            <Explain
              tone="rose"
              label="Unplanned leave"
              value={String(data.summary.unplannedLeaveDays)}
              text={unplannedText(data.guide)}
            />
          </section>

          <section className="overflow-hidden rounded-lg border border-[#e8e8e8] bg-white dark:border-border dark:bg-card">
            <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-4">
              <h2 className="text-base font-medium">{payrollMonthLabel(month)}</h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5f6368] dark:text-muted-foreground">
                <li className="font-medium text-[#9a6700] underline decoration-[#9a6700] decoration-2 underline-offset-2 dark:text-amber-300">Grace day</li>
                <li className="px-1 font-medium text-[#9a6700] dark:text-amber-200" style={HATCH_STYLE}>Half day</li>
                <li className="bg-[#e7f0fb] px-1 font-medium text-[#1d5fbf] dark:bg-sky-950/50 dark:text-sky-200">Planned leave</li>
                <li className="font-medium text-[#9f1239] dark:text-rose-300">Unplanned leave</li>
              </ul>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-7 border-b border-border">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="px-2 py-2 text-center text-xs text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array.from({ length: padCount }, (_, index) => (
                    <div key={`pad-${index}`} className="min-h-[88px] border-b border-r border-border bg-muted/30" />
                  ))}
                  {data.days.map((day) => (
                    <DayCell
                      key={day.date}
                      day={day}
                      todayKey={todayKey}
                      onSelect={setSelectedDay}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {!viewingOther || data.canCorrect ? (
            <section className="rounded-lg border border-[#e8e8e8] bg-white p-4 dark:border-border dark:bg-card">
              <LeavePanel
                employeeId={viewingOther ? employeeId : undefined}
                selfService={!viewingOther}
                canManage={viewingOther && data.canCorrect}
                onChanged={() => {
                  void refreshAttendance();
                }}
              />
            </section>
          ) : null}

          <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
            <div className="rounded-lg border border-[#e8e8e8] bg-white p-4 dark:border-border dark:bg-card">
              <h2 className="text-base font-semibold">Attendance</h2>
              <p className="mt-1 text-sm text-muted-foreground">How this month is split.</p>
              {distribution.length === 0 ? (
                <p className="mt-8 text-sm text-muted-foreground">No attendance recorded this month yet.</p>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
                  <ChartContainer config={distributionConfig} className="aspect-square h-[180px] w-[180px]">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={distribution}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={74}
                        strokeWidth={2}
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 2} className="fill-foreground text-2xl font-medium">
                                  {data.summary.attendancePercentage}%
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 16} className="fill-muted-foreground text-xs">
                                  Attendance
                                </tspan>
                              </text>
                            );
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <ul className="min-w-[160px] space-y-2 text-sm">
                    {distribution.map((slice) => (
                      <li key={slice.key} className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                          {slice.label}
                        </span>
                        <span className="font-medium tabular-nums">{slice.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[#e8e8e8] bg-white p-4 dark:border-border dark:bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Login and logout</h2>
                <div className="flex gap-1" role="group" aria-label="Login or logout">
                  {(["all", "login", "logout"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={logFilter === value ? "default" : "outline"}
                      className="h-8 cursor-pointer capitalize"
                      aria-pressed={logFilter === value}
                      onClick={() => setLogFilter(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Event</th>
                      <th className="py-2 pr-3 font-medium">Time</th>
                      <th className="py-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLogins.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No logins or logouts in this month yet.
                        </td>
                      </tr>
                    ) : (
                      visibleLogins.map((row) => (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40"
                          onClick={() => setSelectedDay(row.day)}
                        >
                          <td className="py-2.5 pr-3 tabular-nums">{row.date}</td>
                          <td className="py-2.5 pr-3">{row.kind === "login" ? "Login" : "Logout"}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{row.timeLabel || "—"}</td>
                          <td className="py-2.5 text-muted-foreground">{row.source}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredLogins.length > LOGIN_PREVIEW_LIMIT ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 cursor-pointer px-0"
                  onClick={() => setLogExpanded((open) => !open)}
                >
                  {logExpanded ? "Show less" : `Show all ${filteredLogins.length}`}
                </Button>
              ) : null}
            </div>
          </section>

          {viewingOther && data.audits.length > 0 ? (
            <section className="rounded-lg border border-[#e8e8e8] bg-white p-4 dark:border-border dark:bg-card">
              <h2 className="text-sm font-semibold">Recent corrections</h2>
              <ul className="mt-2 space-y-2">
                {data.audits.map((audit) => (
                  <li key={audit.id} className="border-t border-border pt-2 text-sm first:border-t-0 first:pt-0">
                    <p>
                      {audit.attendanceDate}: {audit.oldStatus} → {audit.newStatus}
                    </p>
                    <p className="text-muted-foreground">{audit.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <DayDetailDialog
        day={selectedDay}
        todayKey={todayKey}
        guide={data?.guide ?? null}
        open={Boolean(selectedDay)}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
      />
    </div>
  );
}

function Explain({
  label,
  value,
  text,
  lead = false,
  tone = "ink",
}: {
  label: string;
  value: string;
  text: string;
  lead?: boolean;
  tone?: "ink" | "blue" | "amber" | "rose" | "muted";
}) {
  return (
    <article className="bg-white px-4 py-4 dark:bg-card">
      <h2 className="text-sm text-[#5f6368] dark:text-muted-foreground">{label}</h2>
      <p
        className={cn(
          "mt-1 font-medium tabular-nums tracking-tight",
          lead ? "text-[30px] leading-none" : "text-2xl",
          tone === "blue" && "text-[#1d5fbf] dark:text-sky-300",
          tone === "amber" && "text-[#9a6700] dark:text-amber-300",
          tone === "rose" && "text-[#9f1239] dark:text-rose-300",
          tone === "muted" && "font-normal text-[#6b6b6b]",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#5f6368] dark:text-muted-foreground">{text}</p>
    </article>
  );
}

function DayCell({
  day,
  todayKey,
  onSelect,
}: {
  day: AttendanceDayCell;
  todayKey: string;
  onSelect: (day: AttendanceDayCell) => void;
}) {
  const kind = dayKind(day);
  const word = kind === "off" ? day.label || "Off" : KIND_WORD[kind];
  const isToday = day.date === todayKey;
  const weekend = weekdayOffset(day.date) === 0 || weekdayOffset(day.date) === 6;

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={cn(
        "min-h-[88px] border-b border-r border-[#f0f0f0] bg-white p-2 text-left hover:bg-[#f7f7f7] dark:border-border dark:bg-card dark:hover:bg-muted/40",
        weekend && "bg-[#f6f6f6] dark:bg-muted/30",
        isToday && "border-t-2 border-t-[#1d5fbf]",
      )}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${day.date}${word ? `, ${word}` : ""}${isToday ? ", today" : ""}`}
    >
      <span
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center text-sm tabular-nums",
          isToday && "font-medium text-[#1d5fbf]",
        )}
      >
        {Number(day.date.slice(-2))}
      </span>
      {word ? (
        <span
          className={cn("mt-2 block rounded px-1.5 py-0.5 text-xs leading-snug", KIND_CLASS[kind])}
          style={kind === "half" ? HATCH_STYLE : undefined}
        >
          {word}
        </span>
      ) : null}
    </button>
  );
}

function DayDetailDialog({
  day,
  open,
  onOpenChange,
  todayKey,
  guide,
}: {
  day: AttendanceDayCell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayKey: string;
  guide: AttendanceGuide | null;
}) {
  if (!day) return null;
  const kind = dayKind(day);
  const word = kind === "off" ? day.label || "Off" : KIND_WORD[kind];
  const showTimes =
    Boolean(day.status) && !OFF_STATUSES.has(day.status ?? "") && day.status !== "not_joined";
  const checkOut = resolveCheckOutLabel(day, todayKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formatDayHeading(day.date)}</DialogTitle>
          <DialogDescription>{word || "No status yet"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {guide ? <p className="leading-relaxed text-muted-foreground">{dayMeaning(kind, guide)}</p> : null}
          {showTimes ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Check-in</p>
                <AttendanceCheckTime
                  kind="in"
                  timeLabel={day.firstLoginLabel}
                  timeIso={day.firstLoginAt}
                  device={day.checkInDevice}
                  showEmpty
                  showDevice
                />
              </div>
              <div>
                <p className="font-medium">Check-out</p>
                <AttendanceCheckTime
                  kind="out"
                  timeLabel={checkOut}
                  timeIso={checkOut ? day.lastLogoutAt : null}
                  device={checkOut ? day.checkOutDevice ?? "system" : null}
                  showEmpty
                  showDevice
                />
              </div>
            </div>
          ) : null}
          {(day.actions?.length ?? 0) > 0 ? (
            <div>
              <p className="mb-1 font-medium">Logins</p>
              <AttendanceDayActionsList actions={day.actions} />
            </div>
          ) : null}
          {day.remarks ? <p className="text-muted-foreground">{day.remarks}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function dayKind(day: AttendanceDayCell): DayKind {
  if (!day.status) return "empty";
  if (day.status === "present" && day.isLate) return "grace";
  if (day.status === "half_day") return "half";
  if (day.status === "on_leave" && day.leaveCategory === "unplanned") return "unplanned";
  if (day.status === "on_leave" && day.leaveCategory === "unapproved") return "unapproved";
  if (day.status === "on_leave" || day.status === "absent") {
    return day.leaveCategory === "unapproved" || day.status === "absent" ? "unapproved" : "planned";
  }
  if (day.status === "present" || day.status === "work_from_home") return "present";
  if (OFF_STATUSES.has(day.status)) return "off";
  return "other";
}

function graceText(guide: AttendanceGuide): string {
  const window = `Arriving within ${guide.graceMinutes} minutes of your shift start still counts as on time.`;
  if (guide.graceCutsPay) {
    return `${window} A grace day is a later arrival that still counts as present. The first ${guide.graceDaysAllowed} grace days this month do not cut pay.`;
  }
  return `${window} A grace day is a later arrival that still counts as present. It does not cut your pay.`;
}

function halfDayText(guide: AttendanceGuide): string {
  const pay =
    guide.halfDayLopFactor === 0.5
      ? "Each one cuts half a day of pay."
      : guide.halfDayLopFactor === 1
        ? "Each one cuts a full day of pay."
        : `Each one cuts ${guide.halfDayLopFactor} day of pay.`;
  const severe = guide.graceCutsPay
    ? ` Arriving ${guide.severeLateMinutes} minutes or more after the shift starts is a half day.`
    : "";
  return `A half day means only part of the shift was worked.${severe} ${pay}`;
}

function plannedText(paid: number, unpaid: number): string {
  if (unpaid > 0) {
    return `Leave asked for ahead of time. ${paid} came from the paid balance. ${unpaid} went past the balance and ${unpaid === 1 ? "is" : "are"} unpaid.`;
  }
  return "Leave asked for ahead of time. It uses the paid leave balance first. Days past the balance are unpaid.";
}

function unplannedText(guide: AttendanceGuide): string {
  const cost =
    guide.unplannedLeaveLopDays === 1
      ? "1 day of loss of pay"
      : `${guide.unplannedLeaveLopDays} days of loss of pay`;
  return `Leave that was not planned. It does not use the paid balance, and each day costs ${cost}.`;
}

function dayMeaning(kind: DayKind, guide: AttendanceGuide): string {
  if (kind === "grace") return graceText(guide);
  if (kind === "half") return halfDayText(guide);
  if (kind === "planned") return plannedText(0, 0);
  if (kind === "unplanned") return unplannedText(guide);
  if (kind === "present") return "You were in for the working day.";
  if (kind === "unapproved") return "This working day has no approved leave, so it counts as unapproved.";
  if (kind === "off") return "This day is not a working day.";
  return "";
}

type LoginRow = {
  id: string;
  date: string;
  day: AttendanceDayCell;
  kind: "login" | "logout";
  timeLabel: string;
  source: string;
};

function buildLoginRows(days: AttendanceDayCell[], todayKey: string): LoginRow[] {
  const rows: LoginRow[] = [];
  const ordered = [...days].filter((day) => day.date <= todayKey).sort((left, right) => right.date.localeCompare(left.date));
  for (const day of ordered) {
    if ((day.actions?.length ?? 0) > 0) {
      for (const action of day.actions) {
        const systemCheckout = action.kind === "logout" && (action.device === "system" || action.timeLabel === SYSTEM_CHECKOUT_LABEL);
        rows.push({
          id: `${day.date}-${action.kind}-${action.at}`,
          date: day.date,
          day,
          kind: action.kind,
          timeLabel: toDisplayTime(action.timeLabel),
          source: sourceLabel(systemCheckout ? "system" : action.device),
        });
      }
      continue;
    }
    if (day.firstLoginLabel) {
      rows.push({
        id: `${day.date}-login`,
        date: day.date,
        day,
        kind: "login",
        timeLabel: toDisplayTime(day.firstLoginLabel),
        source: sourceLabel(day.checkInDevice),
      });
    }
    const checkOut = resolveCheckOutLabel(day, todayKey);
    if (checkOut) {
      rows.push({
        id: `${day.date}-logout`,
        date: day.date,
        day,
        kind: "logout",
        timeLabel: toDisplayTime(checkOut),
        source: sourceLabel(day.checkOutDevice ?? "system"),
      });
    }
  }
  return rows;
}

function sourceLabel(device: "desktop" | "mobile" | "system" | null): string {
  if (device === "mobile") return "Mobile";
  if (device === "system") return "System";
  if (device === "desktop") return "Web";
  return "—";
}

function toDisplayTime(timeLabel: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeLabel.trim());
  if (!match) return timeLabel;
  const hour24 = Number(match[1]);
  if (!Number.isFinite(hour24)) return timeLabel;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${match[2]} ${period}`;
}

function resolveCheckOutLabel(day: AttendanceDayCell, todayKey: string): string {
  if (day.lastLogoutLabel?.trim()) return day.lastLogoutLabel.trim();
  if (day.date >= todayKey) return "";
  if (!day.firstLoginLabel && !day.firstLoginAt) return "";
  return SYSTEM_CHECKOUT_LABEL;
}

function formatDayHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function weekdayOffset(dateKey: string): number {
  if (!dateKey) return 0;
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function istTodayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
