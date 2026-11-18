"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Dancing_Script, Libre_Baskerville } from "next/font/google";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Globe,
  Info,
  Lightbulb,
  List,
  LogIn,
  LogOut,
  Plane,
  Settings2,
  Smartphone,
  Star,
  Timer,
  Umbrella,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import axios from "@/util/axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  addPayrollMonths,
  comparePayrollMonths,
  currentPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
} from "@/modules/finance/salary-month";
import type {
  AttendanceDayCell,
  EmployeeAttendancePayload,
} from "@/modules/attendance/view";
import { AttendanceCheckTime } from "@/components/attendance/AttendanceCheckTime";
import { AttendanceDayActionsList } from "@/components/attendance/AttendanceDayActionsList";
import { type AttendanceDevice } from "@/util/attendanceDevice";
import { MyAttendanceSkeleton } from "./my-attendance-skeleton";

const displaySerif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const scriptFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const STATUS_STYLE: Record<
  string,
  { soft: string; pill: string; dot: string; color: string }
> = {
  P: {
    soft: "bg-[#E1F5EB] text-[#219B68] dark:bg-emerald-950 dark:text-emerald-200",
    pill: "bg-[#E1F5EB] text-[#219B68] dark:bg-emerald-950 dark:text-emerald-200",
    dot: "bg-[#219B68] dark:bg-emerald-400",
    color: "#219B68",
  },
  LT: {
    soft: "bg-[#FFF0E4] text-[#F07832] dark:bg-orange-950 dark:text-orange-200",
    pill: "bg-[#FFF0E4] text-[#F07832] dark:bg-orange-950 dark:text-orange-200",
    dot: "bg-[#F07832] dark:bg-orange-400",
    color: "#F07832",
  },
  A: {
    soft: "bg-[#FFE7E7] text-[#E94C50] dark:bg-red-950 dark:text-red-200",
    pill: "bg-[#FFE7E7] text-[#E94C50] dark:bg-red-950 dark:text-red-200",
    dot: "bg-[#E94C50] dark:bg-red-400",
    color: "#E94C50",
  },
  HD: {
    soft: "bg-[#FFF1D9] text-[#E99A14] dark:bg-amber-950 dark:text-amber-200",
    pill: "bg-[#FFF1D9] text-[#E99A14] dark:bg-amber-950 dark:text-amber-200",
    dot: "bg-[#E99A14] dark:bg-amber-400",
    color: "#E99A14",
  },
  LV: {
    soft: "bg-[#E5F3FF] text-[#268FD0] dark:bg-sky-950 dark:text-sky-200",
    pill: "bg-[#E5F3FF] text-[#268FD0] dark:bg-sky-950 dark:text-sky-200",
    dot: "bg-[#268FD0] dark:bg-sky-400",
    color: "#268FD0",
  },
  H: {
    soft: "bg-[#EEEEEE] text-[#777777] dark:bg-neutral-800 dark:text-neutral-300",
    pill: "bg-[#EEEEEE] text-[#777777] dark:bg-neutral-800 dark:text-neutral-300",
    dot: "bg-[#777777] dark:bg-neutral-400",
    color: "#777777",
  },
  WO: {
    soft: "bg-[#EEEEEE] text-[#888888] dark:bg-neutral-800 dark:text-neutral-400",
    pill: "bg-[#EEEEEE] text-[#888888] dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-[#888888] dark:bg-neutral-500",
    color: "#888888",
  },
  WF: {
    soft: "bg-[#E5F8F6] text-[#178A79] dark:bg-teal-950 dark:text-teal-200",
    pill: "bg-[#E5F8F6] text-[#178A79] dark:bg-teal-950 dark:text-teal-200",
    dot: "bg-[#178A79] dark:bg-teal-400",
    color: "#178A79",
  },
  NJ: {
    soft: "bg-[#EEEEEE] text-[#888888] dark:bg-neutral-800 dark:text-neutral-400",
    pill: "bg-[#EEEEEE] text-[#888888] dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-[#888888] dark:bg-neutral-500",
    color: "#888888",
  },
  PV: {
    soft: "bg-[#EEEEEE] text-[#555555] dark:bg-neutral-800 dark:text-neutral-200",
    pill: "bg-[#EEEEEE] text-[#555555] dark:bg-neutral-800 dark:text-neutral-200",
    dot: "bg-[#555555] dark:bg-neutral-400",
    color: "#555555",
  },
};

const STATUS_LEGEND = [
  { letter: "P", label: "Present" },
  { letter: "LT", label: "Late" },
  { letter: "A", label: "Absent" },
  { letter: "HD", label: "Half day" },
  { letter: "LV", label: "Leave" },
  { letter: "WF", label: "WFH" },
  { letter: "WO", label: "Weekly off" },
] as const;

const OFF_STATUSES = new Set(["holiday", "weekly_off", "not_joined"]);
const DAILY_SUMMARY_PREVIEW_LIMIT = 8;
const SYSTEM_CHECKOUT_LABEL = "23:59";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type SummarySourceKey = "web" | "mobile" | "system";
type SummaryStatusKey = "success" | "applied" | "approved";
type SummaryEventKey =
  | "login"
  | "logout"
  | "half_day"
  | "leave"
  | "weekly_off"
  | "holiday"
  | "absent"
  | "present"
  | "wfh"
  | "other";

type SummaryActivityRow = {
  id: string;
  date: string;
  day: AttendanceDayCell;
  eventKey: SummaryEventKey;
  eventLabel: string;
  statusKey: SummaryStatusKey;
  statusLabel: string;
  timeLabel: string;
  sourceKey: SummarySourceKey;
  device: AttendanceDevice | null;
  details: string;
  remarks: string;
};

const SUMMARY_STATUS_STYLE: Record<
  SummaryStatusKey,
  { pill: string; icon: LucideIcon }
> = {
  success: {
    pill: "bg-[#E1F5EB] text-[#219B68] dark:bg-emerald-950 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  applied: {
    pill: "bg-[#E5F3FF] text-[#268FD0] dark:bg-sky-950 dark:text-sky-200",
    icon: Info,
  },
  approved: {
    pill: "bg-[#FFF0E4] text-[#F07832] dark:bg-orange-950 dark:text-orange-200",
    icon: CheckCircle2,
  },
};

const SUMMARY_EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
  { value: "weekly_off", label: "Weekly Off" },
  { value: "holiday", label: "Holiday" },
  { value: "absent", label: "Absent" },
  { value: "present", label: "Present" },
  { value: "wfh", label: "WFH" },
];

const SUMMARY_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "system", label: "System" },
];

const filterControlClass =
  "h-10 w-auto min-w-[140px] cursor-pointer rounded-xl border-[#E4E0DA] bg-white text-sm font-medium text-[#3A4F51] shadow-none dark:border-border dark:bg-card dark:text-foreground";
const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type CalendarView = "month" | "week" | "day";

const VIEW_OPTIONS: {
  id: CalendarView;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "month", label: "Month", icon: CalendarDays },
  { id: "week", label: "Week", icon: List },
  { id: "day", label: "Day", icon: Clock3 },
];

const QUICK_STATS: {
  key: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  badgeClass?: string;
  fillIcon?: boolean;
}[] = [
  {
    key: "joining",
    label: "Joining",
    icon: CalendarCheck,
    iconClass: "text-[#176F68] dark:text-teal-400",
  },
  {
    key: "shift",
    label: "Shift",
    icon: Copy,
    iconClass: "text-[#176F68] dark:text-teal-400",
    fillIcon: true,
  },
  {
    key: "present",
    label: "Present",
    icon: Check,
    iconClass: "text-white",
    badgeClass: "bg-[#219B68]",
  },
  {
    key: "absent",
    label: "Absent",
    icon: X,
    iconClass: "text-white",
    badgeClass: "bg-[#E94C50]",
  },
  {
    key: "halfDays",
    label: "Half days",
    icon: Timer,
    iconClass: "text-[#E99A14] dark:text-amber-400",
  },
  {
    key: "paidLeave",
    label: "Paid leave",
    icon: Plane,
    iconClass: "text-[#268FD0] dark:text-sky-400",
    fillIcon: true,
  },
];

const METRIC_CARDS: {
  key:
    | "unpaidLeaveDays"
    | "holidays"
    | "weeklyOffs"
    | "lateArrivals"
    | "lopDays"
    | "attendancePercentage";
  label: string;
  icon: LucideIcon;
  cardClass: string;
  iconClass: string;
  fillIcon?: boolean;
  suffix?: string;
}[] = [
  {
    key: "unpaidLeaveDays",
    label: "Unpaid Leave",
    icon: CalendarCheck,
    cardClass: "bg-[#E8F5F1] dark:bg-teal-950/50",
    iconClass: "text-[#178A79] dark:text-teal-300",
  },
  {
    key: "holidays",
    label: "Holidays",
    icon: Umbrella,
    cardClass: "bg-[#F0EDFA] dark:bg-violet-950/50",
    iconClass: "text-[#7562C8] dark:text-violet-300",
    fillIcon: true,
  },
  {
    key: "weeklyOffs",
    label: "Weekly Offs",
    icon: Star,
    cardClass: "bg-[#FFF0E2] dark:bg-orange-950/50",
    iconClass: "text-[#D88B37] dark:text-orange-300",
    fillIcon: true,
  },
  {
    key: "lateArrivals",
    label: "Late",
    icon: Clock3,
    cardClass: "bg-[#E8F5F1] dark:bg-teal-950/50",
    iconClass: "text-[#178A79] dark:text-teal-300",
  },
  {
    key: "lopDays",
    label: "LOP Days",
    icon: Timer,
    cardClass: "bg-[#F0EDFA] dark:bg-violet-950/50",
    iconClass: "text-[#7562C8] dark:text-violet-300",
  },
  {
    key: "attendancePercentage",
    label: "Attendance",
    icon: ChartNoAxesCombined,
    cardClass: "bg-[#FFF0DF] dark:bg-amber-950/50",
    iconClass: "text-[#D88B37] dark:text-amber-300",
    suffix: "%",
  },
];

const surfaceCard =
  "rounded-2xl border border-[#EAE5DF] bg-white shadow-sm dark:border-border dark:bg-card";
const mutedText = "text-gray-500 dark:text-muted-foreground";
const bodyText = "text-[#172B2D] dark:text-foreground";
const headingText = "text-[#192C2D] dark:text-foreground";
const accentTeal = "text-[#176F68] dark:text-teal-400";
const softHover =
  "hover:bg-gray-50 dark:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

const insightChartConfig = {
  present: { label: "Present", color: "#219B68" },
  absent: { label: "Absent", color: "#E94C50" },
  halfDay: { label: "Half Day", color: "#FFBE45" },
  others: { label: "Others", color: "#AAAAAA" },
} satisfies ChartConfig;

export default function MyAttendanceClient({
  employeeId,
}: {
  /** When set (HR/Admin/SuperAdmin), show this employee’s attendance with the same UI. */
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
    requested && comparePayrollMonths(requested, current) <= 0
      ? requested
      : current;
  const [data, setData] = useState<EmployeeAttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<AttendanceDayCell | null>(
    null,
  );
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [summaryRange, setSummaryRange] = useState<DateRange | undefined>();
  const [eventFilter, setEventFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{
        success: boolean;
        data: EmployeeAttendancePayload;
        message?: string;
      }>(apiPath, {
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
  }, [apiPath, month.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const writeMonth = (key: string) => {
    router.replace(`${pageBase}?month=${key}`);
  };

  const todayKey = istTodayKey();
  const canGoNext = comparePayrollMonths(month, current) < 0;
  const employee = data?.employee;

  const activeDate = useMemo(() => {
    if (focusDate && data?.dates.includes(focusDate)) return focusDate;
    if (data?.dates.includes(todayKey)) return todayKey;
    return data?.dates[0] ?? todayKey;
  }, [data?.dates, focusDate, todayKey]);

  const padCount = useMemo(
    () => weekdayOffset(data?.dates[0] ?? ""),
    [data?.dates],
  );

  const weekDays = useMemo(() => {
    if (!data?.days.length) return [];
    const index = data.days.findIndex((day) => day.date === activeDate);
    if (index < 0) return data.days.slice(0, 7);
    const start = Math.floor((index + padCount) / 7) * 7 - padCount;
    const from = Math.max(0, start);
    return data.days.slice(from, from + 7);
  }, [activeDate, data?.days, padCount]);

  const dayFocus = useMemo(
    () => data?.days.find((day) => day.date === activeDate) ?? null,
    [activeDate, data?.days],
  );

  const insightData = useMemo(() => {
    if (!data) return [];
    const others =
      data.summary.paidLeaveDays +
      data.summary.unpaidLeaveDays +
      data.summary.holidays +
      data.summary.weeklyOffs +
      data.summary.workFromHomeDays +
      data.summary.pendingVerification;
    return [
      {
        key: "present",
        label: "Present",
        count: data.summary.presentDays,
        fill: "var(--color-present)",
      },
      {
        key: "absent",
        label: "Absent",
        count: data.summary.absentDays,
        fill: "var(--color-absent)",
      },
      {
        key: "halfDay",
        label: "Half Day",
        count: data.summary.halfDays,
        fill: "var(--color-halfDay)",
      },
      {
        key: "others",
        label: "Others",
        count: others,
        fill: "var(--color-others)",
      },
    ].filter((item) => item.count > 0);
  }, [data]);

  const initials = useMemo(() => {
    const parts = (employee?.name ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "ME";
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [employee?.name]);

  const summaryDays = useMemo(
    () =>
      (data?.days ?? []).filter(
        (day) => Boolean(day.status) && day.date <= todayKey,
      ),
    [data?.days, todayKey],
  );

  useEffect(() => {
    if (!data?.dates.length) return;
    setSummaryRange({
      from: dateFromKey(data.dates[0]!),
      to: dateFromKey(data.dates[data.dates.length - 1]!),
    });
    setEventFilter("all");
    setSourceFilter("all");
    setSummaryExpanded(false);
  }, [data?.month, data?.dates]);

  const summaryActivityRows = useMemo(
    () => buildSummaryActivityRows(summaryDays),
    [summaryDays],
  );

  const filteredSummaryRows = useMemo(() => {
    const fromKey = summaryRange?.from
      ? keyFromDate(summaryRange.from)
      : null;
    const toKey = summaryRange?.to
      ? keyFromDate(summaryRange.to)
      : fromKey;
    return summaryActivityRows.filter((row) => {
      if (fromKey && row.date < fromKey) return false;
      if (toKey && row.date > toKey) return false;
      if (eventFilter !== "all" && row.eventKey !== eventFilter) return false;
      if (sourceFilter !== "all" && row.sourceKey !== sourceFilter) {
        return false;
      }
      return true;
    });
  }, [eventFilter, sourceFilter, summaryActivityRows, summaryRange]);

  const previewSummaryRows = useMemo(
    () =>
      summaryExpanded
        ? filteredSummaryRows
        : filteredSummaryRows.slice(0, DAILY_SUMMARY_PREVIEW_LIMIT),
    [filteredSummaryRows, summaryExpanded],
  );

  const downloadReport = () => {
    if (!data) return;
    const monthLabel = payrollMonthLabel(month);
    const employeeName = employee?.name || "Employee";
    const headers = [
      "Date",
      "Day",
      "Event",
      "Status",
      "Time",
      "Source",
      "Remarks",
    ];
    const bodyRows = filteredSummaryRows
      .map((row) => {
        const weekday = WEEKDAYS[weekdayOffset(row.date)] ?? "";
        const cells = [
          row.date,
          weekday,
          row.eventLabel,
          row.statusLabel,
          row.timeLabel || "—",
          sourceLabelForKey(row.sourceKey),
          summaryRemarksText(row),
        ];
        return `<tr>${cells
          .map(
            (cell) =>
              `<td style="border:1px solid #D7E5E2;padding:10px 12px;text-align:center;font-size:12px;color:#172B2D;">${escapeHtml(String(cell))}</td>`,
          )
          .join("")}</tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<table style="border-collapse:collapse;width:100%;font-family:Segoe UI,Arial,sans-serif;">
  <tr>
    <td colspan="7" style="background:#176F68;color:#ffffff;font-size:20px;font-weight:700;text-align:center;padding:16px 12px;letter-spacing:0.02em;">
      Attendance Report
    </td>
  </tr>
  <tr>
    <td colspan="7" style="background:#E8F4F1;color:#175F5A;font-size:13px;font-weight:600;text-align:center;padding:10px 12px;">
      ${escapeHtml(employeeName)} · ${escapeHtml(monthLabel)}
    </td>
  </tr>
  <tr>
    ${headers
      .map(
        (head) =>
          `<th style="background:#0F4F4A;color:#ffffff;font-size:12px;font-weight:700;text-align:center;padding:11px 12px;border:1px solid #0B3F3B;">${head}</th>`,
      )
      .join("")}
  </tr>
  ${bodyRows}
</table>
</body>
</html>`;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `attendance-report-${data.month}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)] space-y-5 rounded-2xl bg-[#FAF8F5] p-4 md:p-6",
        bodyText,
        "dark:bg-background",
      )}
    >
      <header
        className={cn(
          "grid items-center gap-4",
          viewingOther ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3",
        )}
      >
        <div className="max-w-xl space-y-1.5 justify-self-start text-left">
          {viewingOther ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1 h-8 cursor-pointer px-2 text-[#17615D] hover:bg-[#E5F1ED] dark:text-teal-300 dark:hover:bg-teal-950"
            >
              <Link href={`/dashboard/attendance?month=${month.key}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                All employees
              </Link>
            </Button>
          ) : null}
          <h1
            className={cn(
              displaySerif.className,
              "text-3xl tracking-tight sm:text-4xl",
              headingText,
            )}
          >
            {viewingOther ? "Employee attendance" : "My Attendance"}
          </h1>
          {!viewingOther ? (
            <p className={cn("text-sm sm:text-base", mutedText)}>
              Track your attendance, leaves and working days at a glance.
            </p>
          ) : null}
        </div>

        {!viewingOther ? (
          <>
            <div className="flex justify-center justify-self-center">
              <Image
                src="/attendance/plant.jpg"
                alt=""
                width={160}
                height={160}
                className="h-28 w-28 object-contain opacity-90 sm:h-36 sm:w-36 dark:opacity-80"
                aria-hidden
              />
            </div>

            <div className="flex justify-end justify-self-end">
              <p
                className={cn(
                  scriptFont.className,
                  "origin-center -rotate-[12deg] text-right text-2xl leading-tight sm:text-3xl",
                  accentTeal,
                )}
              >
                Be Present,
                <br />
                Be Productive
              </p>
            </div>
          </>
        ) : null}
      </header>

      {loading ? <MyAttendanceSkeleton withHeader={false} /> : null}

      {!loading && error ? (
        <Card className={cn(surfaceCard, "p-6")}>
          <p className="text-sm text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 cursor-pointer"
            onClick={() => void load()}
          >
            Retry
          </Button>
        </Card>
      ) : null}

      {data && employee ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-8">
            <div
              className={cn(
                surfaceCard,
                "col-span-2 flex min-w-0 items-center justify-center gap-3 px-3 py-3 sm:col-span-3 md:col-span-2",
              )}
            >
              <Avatar className="h-14 w-14 shrink-0 border border-[#E5F1ED] sm:h-16 sm:w-16 dark:border-teal-900">
                {employee.profilePic ? (
                  <AvatarImage
                    src={employee.profilePic}
                    alt={employee.name}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-[#E5F1ED] text-lg font-semibold text-[#17615D] dark:bg-teal-950 dark:text-teal-200">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 text-left">
                <h2
                  className={cn(
                    "truncate text-sm font-bold leading-tight sm:text-base",
                    headingText,
                  )}
                >
                  {employee.name}
                </h2>
                <p className={cn("mt-0.5 truncate text-xs font-medium sm:text-[13px]", accentTeal)}>
                  {employee.designation || "No role"}
                </p>
                {viewingOther ? (
                  <p className={cn("mt-0.5 truncate text-[11px]", mutedText)}>
                    {[employee.employeeCode, employee.department, employee.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>

            {QUICK_STATS.map((stat) => {
              const value =
                stat.key === "joining"
                  ? employee.joiningDate || "—"
                  : stat.key === "shift"
                    ? data.shiftLabel
                    : stat.key === "present"
                      ? String(data.summary.presentDays)
                      : stat.key === "absent"
                        ? String(data.summary.absentDays)
                        : stat.key === "halfDays"
                          ? String(data.summary.halfDays)
                          : String(data.summary.paidLeaveDays);
              const Icon = stat.icon;
              return (
                <div
                  key={stat.key}
                  className={cn(
                    surfaceCard,
                    "col-span-1 flex min-w-0 flex-col items-start justify-center gap-1.5 px-3 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md",
                  )}
                >
                  {stat.badgeClass ? (
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full",
                        stat.badgeClass,
                      )}
                    >
                      <Icon size={13} strokeWidth={2.5} className={stat.iconClass} />
                    </span>
                  ) : (
                    <Icon
                      size={18}
                      className={cn(
                        "shrink-0",
                        stat.iconClass,
                        stat.fillIcon && "fill-current",
                      )}
                    />
                  )}
                  <p className={cn("text-[11px] leading-none", mutedText)}>
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "w-full break-words text-sm font-bold leading-snug",
                      bodyText,
                    )}
                  >
                    {value}
                  </p>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {METRIC_CARDS.map((metric) => {
              const Icon = metric.icon;
              const raw =
                metric.key === "attendancePercentage"
                  ? data.summary.attendancePercentage
                  : data.summary[metric.key];
              return (
                <div
                  key={metric.key}
                  className={cn(
                    "rounded-2xl border border-white p-4 transition-all hover:-translate-y-1 hover:shadow-md dark:border-border/40",
                    metric.cardClass,
                  )}
                >
                  <div
                    className={cn(
                      "mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 dark:bg-black/25",
                      metric.iconClass,
                    )}
                  >
                    <Icon
                      size={21}
                      className={metric.fillIcon ? "fill-current" : undefined}
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-600 dark:text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className={cn("mt-1 text-2xl font-bold", bodyText)}>
                    {raw}
                    {metric.suffix ?? ""}
                  </p>
                </div>
              );
            })}
          </section>

          <section className={cn(surfaceCard, "overflow-hidden p-4 md:p-5")}>
            <div
              className="mb-5 grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-3"
              aria-label="Calendar controls"
            >
              <div className="flex flex-nowrap items-center gap-2 sm:gap-2.5">
                <CalendarDays className={cn("shrink-0", accentTeal)} size={22} />
                <h2
                  className={cn(
                    "shrink-0 whitespace-nowrap text-lg font-bold sm:text-xl",
                    bodyText,
                  )}
                >
                  {payrollMonthLabel(month)}
                </h2>
                <button
                  type="button"
                  onClick={() => writeMonth(addPayrollMonths(month, -1).key)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border border-border p-2",
                    softHover,
                  )}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => writeMonth(current.key)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2",
                    softHover,
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => writeMonth(addPayrollMonths(month, 1).key)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border border-border p-2",
                    softHover,
                  )}
                  aria-label="Next month"
                >
                  <ChevronRight size={17} />
                </button>
              </div>

              <div
                className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-center sm:gap-2"
                aria-label="Status legend"
              >
                {STATUS_LEGEND.map((item) => {
                  const style = STATUS_STYLE[item.letter];
                  return (
                    <div
                      key={item.letter}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none sm:px-3 sm:text-xs",
                        style.soft,
                      )}
                    >
                      <span
                        className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)}
                      />
                      <span className="whitespace-nowrap">
                        {item.letter} {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className="inline-flex w-fit shrink-0 rounded-full bg-[#EEF2EF] p-1 shadow-inner sm:justify-self-end dark:bg-muted"
                role="tablist"
                aria-label="Calendar view"
              >
                {VIEW_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = calendarView === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCalendarView(option.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 ease-out sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm",
                        active
                          ? "bg-[#176F68] text-white shadow-md dark:bg-teal-700"
                          : "text-gray-600 hover:bg-white/80 hover:text-[#176F68] dark:text-muted-foreground dark:hover:bg-background/60 dark:hover:text-teal-300",
                      )}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {calendarView === "month" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-7 border-b border-gray-200 dark:border-border">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="py-3.5 text-center text-sm font-bold tracking-wide text-[#315354] dark:text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-[#EAE7E3] dark:bg-border">
                    {Array.from({ length: padCount }, (_, index) => (
                      <div
                        key={`pad-${index}`}
                        className="min-h-[132px] bg-[#FAFAF8] dark:bg-muted/40"
                        aria-hidden
                      />
                    ))}
                    {data.days.map((day) => (
                      <DayCell
                        key={day.date}
                        day={day}
                        todayKey={todayKey}
                        selected={activeDate === day.date}
                        onSelect={(next) => {
                          setFocusDate(next.date);
                          setSelectedDay(next);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {calendarView === "week" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {weekDays.map((day) => (
                  <WeekDayCard
                    key={day.date}
                    day={day}
                    todayKey={todayKey}
                    onSelect={(next) => {
                      setFocusDate(next.date);
                      setSelectedDay(next);
                    }}
                  />
                ))}
              </div>
            ) : null}

            {calendarView === "day" && dayFocus ? (
              <DayFocusCard
                day={dayFocus}
                todayKey={todayKey}
                onOpen={() => setSelectedDay(dayFocus)}
              />
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.6fr]">
            <div className={cn(surfaceCard, "p-5 md:p-6")}>
              <div className="mb-6 flex items-center gap-2.5">
                <ChartNoAxesCombined size={22} className={accentTeal} />
                <h3
                  className={cn(
                    "text-lg font-bold tracking-tight",
                    bodyText,
                  )}
                >
                  Attendance Insights
                </h3>
              </div>

              <div className="flex flex-wrap items-center justify-around gap-8">
                <ChartContainer
                  config={insightChartConfig}
                  className="mx-auto aspect-square h-[190px] w-[190px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={insightData}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={54}
                      outerRadius={76}
                      strokeWidth={3}
                    >
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) - 4}
                                  className="fill-[#172B2D] text-3xl font-bold dark:fill-foreground"
                                >
                                  {data.summary.attendancePercentage}%
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 16}
                                  className="fill-gray-500 text-xs dark:fill-muted-foreground"
                                >
                                  Overall
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 30}
                                  className="fill-gray-500 text-xs dark:fill-muted-foreground"
                                >
                                  Attendance
                                </tspan>
                              </text>
                            );
                          }
                          return null;
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="space-y-4">
                  {(
                    [
                      {
                        label: "Present",
                        value: data.summary.presentDays,
                        color: "#219B68",
                      },
                      {
                        label: "Absent",
                        value: data.summary.absentDays,
                        color: "#E94C50",
                      },
                      {
                        label: "Half Day",
                        value: data.summary.halfDays,
                        color: "#FFBE45",
                      },
                      {
                        label: "Others",
                        value:
                          data.summary.paidLeaveDays +
                          data.summary.unpaidLeaveDays +
                          data.summary.holidays +
                          data.summary.weeklyOffs +
                          data.summary.workFromHomeDays,
                        color: "#AAAAAA",
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.label}
                      className="flex min-w-[140px] items-center justify-between gap-8 text-sm"
                    >
                      <span className="flex items-center gap-2.5 font-medium text-gray-700 dark:text-muted-foreground">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: item.color }}
                        />
                        {item.label}
                      </span>
                      <strong className={cn("text-base", bodyText)}>
                        {item.value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn(surfaceCard, "overflow-hidden p-4 md:p-5")}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <List size={22} className={accentTeal} />
                  <h3
                    className={cn(
                      "text-lg font-bold tracking-tight",
                      bodyText,
                    )}
                  >
                    Daily Summary
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={downloadReport}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#176F68] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#145F59] dark:bg-teal-700 dark:hover:bg-teal-600"
                >
                  <Download size={15} /> Export Report
                </button>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        filterControlClass,
                        "justify-start px-3 font-medium",
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-[#5C7375]" />
                      {summaryRange?.from ? (
                        summaryRange.to ? (
                          <>
                            {format(summaryRange.from, "MMM d")} –{" "}
                            {format(summaryRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(summaryRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "Pick dates"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={summaryRange?.from}
                      selected={summaryRange}
                      onSelect={setSummaryRange}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>

                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className={filterControlClass}>
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUMMARY_EVENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className={filterControlClass}>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUMMARY_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#EFEAE4] dark:border-border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="bg-[#F7F4EF] text-[13px] text-[#5C7375] dark:bg-muted/60 dark:text-muted-foreground">
                      {[
                        "Date",
                        "Day",
                        "Event",
                        "Status",
                        "Time",
                        "Source",
                        "Remarks",
                      ].map((head) => (
                        <th
                          key={head}
                          className="px-3 py-3 font-semibold tracking-wide"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewSummaryRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-10 text-center text-sm text-gray-500 dark:text-muted-foreground"
                        >
                          No activity matches these filters.
                        </td>
                      </tr>
                    ) : (
                      previewSummaryRows.map((row) => {
                        const weekday =
                          WEEKDAYS[weekdayOffset(row.date)] ?? "—";
                        const statusStyle =
                          SUMMARY_STATUS_STYLE[row.statusKey];
                        const StatusIcon = statusStyle.icon;
                        return (
                          <tr
                            key={row.id}
                            className="cursor-pointer border-t border-[#F0EBE5] hover:bg-[#FAFAF8] dark:border-border dark:hover:bg-muted/40"
                            onClick={() => {
                              setFocusDate(row.day.date);
                              setSelectedDay(row.day);
                            }}
                          >
                            <td
                              className={cn(
                                "whitespace-nowrap px-3 py-3.5 font-semibold",
                                bodyText,
                              )}
                            >
                              {row.date}
                            </td>
                            <td className="px-3 py-3.5 text-gray-600 dark:text-muted-foreground">
                              {weekday}
                            </td>
                            <td className="px-3 py-3.5">
                              <SummaryEventCell
                                eventKey={row.eventKey}
                                label={row.eventLabel}
                              />
                            </td>
                            <td className="px-3 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                                  statusStyle.pill,
                                )}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {row.statusLabel}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 tabular-nums text-gray-700 dark:text-muted-foreground">
                              {row.timeLabel || "—"}
                            </td>
                            <td className="px-3 py-3.5">
                              <SummarySourceCell sourceKey={row.sourceKey} />
                            </td>
                            <td className="max-w-[240px] truncate px-3 py-3.5 text-gray-600 dark:text-muted-foreground">
                              {summaryRemarksText(row)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {!viewingOther ? (
                  <div className="flex min-w-0 flex-1 items-start gap-2 rounded-xl bg-[#E8F5F1] px-3.5 py-2.5 text-sm text-[#176F68] dark:bg-teal-950/40 dark:text-teal-300">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Tip: You can filter by event, source or date to find
                      specific activity details.
                    </p>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1" />
                )}
                {filteredSummaryRows.length > DAILY_SUMMARY_PREVIEW_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setSummaryExpanded((open) => !open)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#176F68] px-4 py-2 text-sm font-semibold text-[#176F68] hover:bg-[#176F68] hover:text-white dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-700 dark:hover:text-white"
                  >
                    {summaryExpanded ? "Show less" : "View More"}
                    <ArrowRight
                      className={cn(
                        "h-4 w-4 transition",
                        summaryExpanded && "rotate-90",
                      )}
                    />
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          {viewingOther ? (
            <section className={cn(surfaceCard, "space-y-3 p-4 md:p-5")}>
              <h3
                className={cn(
                  "text-lg font-bold tracking-tight",
                  bodyText,
                )}
              >
                Recent corrections
              </h3>
              {(data.audits?.length ?? 0) === 0 ? (
                <p className={cn("text-sm", mutedText)}>
                  No corrections this month.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.audits.map((audit) => (
                    <li
                      key={audit.id}
                      className="rounded-xl border border-[#E5F1ED] px-4 py-3 text-sm dark:border-border"
                    >
                      <p className={cn("font-medium", bodyText)}>
                        {audit.attendanceDate}: {audit.oldStatus} →{" "}
                        {audit.newStatus}
                      </p>
                      <p className={mutedText}>{audit.reason}</p>
                      <p className={cn("mt-1 text-xs", mutedText)}>
                        {audit.changedByName}
                        {audit.approvedByName
                          ? ` · Approved by ${audit.approvedByName}`
                          : ""}
                        {audit.oldLoginLabel || audit.newLoginLabel
                          ? ` · Login ${audit.oldLoginLabel || "—"} to ${audit.newLoginLabel || "—"}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      <DayDetailDialog
        day={selectedDay}
        todayKey={todayKey}
        open={Boolean(selectedDay)}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
      />
    </div>
  );
}

function DayCell({
  day,
  todayKey,
  selected,
  onSelect,
}: {
  day: AttendanceDayCell;
  todayKey: string;
  selected: boolean;
  onSelect: (day: AttendanceDayCell) => void;
}) {
  const isOff = day.status != null && OFF_STATUSES.has(day.status);
  const dayNum = Number(day.date.slice(-2));
  const isToday = day.date === todayKey;
  const style = STATUS_STYLE[day.letter] ?? STATUS_STYLE.PV;
  const showTimes =
    Boolean(day.status) &&
    !OFF_STATUSES.has(day.status ?? "") &&
    day.status !== "not_joined";
  const checkOut = resolveCheckOutLabel(day, todayKey);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={cn(
        "min-h-[132px] bg-white p-2.5 text-left transition hover:bg-[#FAFCFA] dark:bg-card dark:hover:bg-muted/60",
        selected && "ring-2 ring-inset ring-[#176F68] dark:ring-teal-500",
        isOff && "bg-[#FAFAF8] dark:bg-muted/30",
      )}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${day.date}${day.label ? `, ${day.label}` : ""}${isToday ? ", today" : ""}`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
            isToday || selected
              ? "bg-[#176F68] text-white dark:bg-teal-700"
              : "text-[#273B3D] dark:text-foreground",
          )}
        >
          {dayNum}
        </span>
      </div>

      {day.status ? (
        <div
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-bold leading-snug",
            style.soft,
          )}
          title={day.label}
        >
          {day.letter} {day.label}
        </div>
      ) : null}

      {showTimes ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-muted-foreground">
          <Clock3 size={13} className="shrink-0" />
          <span className="truncate">
            {day.firstLoginLabel || "—"}
            {" → "}
            {checkOut || "—"}
          </span>
        </div>
      ) : null}
    </button>
  );
}

function WeekDayCard({
  day,
  todayKey,
  onSelect,
}: {
  day: AttendanceDayCell;
  todayKey: string;
  onSelect: (day: AttendanceDayCell) => void;
}) {
  const isToday = day.date === todayKey;
  const style = STATUS_STYLE[day.letter] ?? STATUS_STYLE.PV;
  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={cn(
        "cursor-pointer rounded-2xl border border-[#EAE5DF] bg-[#FAFAF8] p-3 text-left transition hover:bg-white dark:border-border dark:bg-muted/40 dark:hover:bg-card",
        isToday && "ring-2 ring-[#176F68]/30 dark:ring-teal-500/40",
      )}
    >
      <p className={cn("text-xs font-medium", mutedText)}>
        {WEEKDAY_FULL[weekdayOffset(day.date)]?.slice(0, 3)}
      </p>
      <p className={cn("mt-1 text-lg font-semibold", bodyText)}>
        {Number(day.date.slice(-2))}
      </p>
      {day.status ? (
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold",
            style.pill,
          )}
        >
          {day.label}
        </span>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No status</p>
      )}
    </button>
  );
}

function DayFocusCard({
  day,
  onOpen,
  todayKey,
}: {
  day: AttendanceDayCell;
  onOpen: () => void;
  todayKey: string;
}) {
  const showTimes =
    Boolean(day.status) &&
    !OFF_STATUSES.has(day.status ?? "") &&
    day.status !== "not_joined";
  const style = STATUS_STYLE[day.letter] ?? STATUS_STYLE.PV;
  const checkOut = resolveCheckOutLabel(day, todayKey);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full cursor-pointer rounded-xl bg-[#F5F8F6] p-5 text-left transition hover:bg-[#EEF4F1] dark:bg-muted/50 dark:hover:bg-muted"
    >
      <p className={cn("text-sm", mutedText)}>Selected date</p>
      <p className={cn("mt-1 text-base font-bold", bodyText)}>
        {formatDayHeading(day.date)}
      </p>
      {day.status ? (
        <span
          className={cn(
            "mt-3 inline-flex rounded-full px-3.5 py-1.5 text-sm font-semibold",
            style.pill,
          )}
        >
          {day.letter} · {day.label}
        </span>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No status yet</p>
      )}
      {showTimes ? (
        <p className={cn("mt-3 text-base font-semibold", bodyText)}>
          {day.firstLoginLabel || "—"} / {checkOut || "—"}
        </p>
      ) : null}
    </button>
  );
}

function DayDetailDialog({
  day,
  open,
  onOpenChange,
  todayKey,
}: {
  day: AttendanceDayCell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayKey: string;
}) {
  if (!day) return null;

  const showTimes =
    Boolean(day.status) &&
    !OFF_STATUSES.has(day.status ?? "") &&
    day.status !== "not_joined";
  const style = STATUS_STYLE[day.letter] ?? STATUS_STYLE.PV;
  const checkOut = resolveCheckOutLabel(day, todayKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formatDayHeading(day.date)}</DialogTitle>
          <DialogDescription>
            Attendance details for this day
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Status</p>
            {day.status ? (
              <Badge
                variant="secondary"
                className={cn("border-0 text-sm font-semibold", style.pill)}
              >
                {day.letter} · {day.label}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">No status yet</p>
            )}
          </div>

          {showTimes ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Check-in</p>
                <AttendanceCheckTime
                  kind="in"
                  timeLabel={day.firstLoginLabel}
                  timeIso={day.firstLoginAt}
                  device={day.checkInDevice}
                  showEmpty
                  showDevice
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Check-out</p>
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

          <div className="space-y-2">
            <p className="text-sm font-medium">Actions</p>
            <AttendanceDayActionsList actions={day.actions} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Shift</p>
              <p className="text-sm text-muted-foreground">
                {day.shiftStartLabel && day.shiftEndLabel
                  ? `${day.shiftStartLabel} – ${day.shiftEndLabel}`
                  : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Source</p>
              <p className="text-sm text-muted-foreground">
                {day.sourceLabel || "—"}
              </p>
            </div>
          </div>

          {day.anomalyLabels.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Flags</p>
              <div className="flex flex-wrap gap-1.5">
                {day.anomalyLabels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm font-medium">Notes</p>
            <p className="text-sm text-muted-foreground">
              {day.remarks ||
                (day.isManuallyAdjusted ? "Corrected" : "No notes")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function resolveCheckOutLabel(
  day: AttendanceDayCell,
  todayKey: string,
): string {
  if (day.lastLogoutLabel?.trim()) return day.lastLogoutLabel.trim();
  // Today / future: leave open until real logout or 23:59 cron.
  if (day.date >= todayKey) return "";
  if (!day.firstLoginLabel && !day.firstLoginAt) return "";
  return SYSTEM_CHECKOUT_LABEL;
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function keyFromDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function sourceFromDevice(device: AttendanceDevice | null): SummarySourceKey {
  if (device === "mobile") return "mobile";
  if (device === "system") return "system";
  return "web";
}

function sourceLabelForKey(sourceKey: SummarySourceKey): string {
  if (sourceKey === "mobile") return "Mobile";
  if (sourceKey === "system") return "System";
  return "Web";
}

function toDisplayTime(timeLabel: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeLabel.trim());
  if (!match) return timeLabel;
  const hour24 = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour24)) return timeLabel;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

function formatSessionDuration(loginAt: string, logoutAt: string): string {
  const ms = new Date(logoutAt).getTime() - new Date(loginAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `Session: ${hours}h ${minutes}m`;
}

function statusOnlyEvent(day: AttendanceDayCell): {
  eventKey: SummaryEventKey;
  eventLabel: string;
  statusKey: SummaryStatusKey;
  statusLabel: string;
  sourceKey: SummarySourceKey;
  device: AttendanceDevice | null;
  details: string;
} {
  const adjusted = day.isManuallyAdjusted;
  const remarks = day.remarks?.trim() || "";
  switch (day.status) {
    case "half_day":
      return {
        eventKey: "half_day",
        eventLabel: "Half Day",
        statusKey: adjusted ? "approved" : "applied",
        statusLabel: adjusted ? "Approved" : "Applied",
        sourceKey: "system",
        device: "system",
        details: remarks || "Half day recorded",
      };
    case "on_leave":
      return {
        eventKey: "leave",
        eventLabel: "Leave",
        statusKey: adjusted ? "approved" : "applied",
        statusLabel: adjusted ? "Approved" : "Applied",
        sourceKey: "system",
        device: "system",
        details: remarks || day.label || "Leave",
      };
    case "weekly_off":
      return {
        eventKey: "weekly_off",
        eventLabel: "Weekly Off",
        statusKey: "success",
        statusLabel: "Success",
        sourceKey: "system",
        device: "system",
        details: remarks || "Weekly off",
      };
    case "holiday":
      return {
        eventKey: "holiday",
        eventLabel: "Holiday",
        statusKey: "success",
        statusLabel: "Success",
        sourceKey: "system",
        device: "system",
        details: remarks || day.label || "Holiday",
      };
    case "absent":
      return {
        eventKey: "absent",
        eventLabel: "Absent",
        statusKey: "applied",
        statusLabel: "Applied",
        sourceKey: "system",
        device: "system",
        details: remarks || "Absent",
      };
    case "work_from_home":
      return {
        eventKey: "wfh",
        eventLabel: "WFH",
        statusKey: "success",
        statusLabel: "Success",
        sourceKey: day.source === "login" ? "web" : "system",
        device: day.checkInDevice,
        details: remarks || "Work from home",
      };
    case "present":
      return {
        eventKey: "present",
        eventLabel: "Present",
        statusKey: "success",
        statusLabel: "Success",
        sourceKey: day.source === "login" ? "web" : "system",
        device: day.checkInDevice,
        details: remarks || day.label || "Present",
      };
    default:
      return {
        eventKey: "other",
        eventLabel: day.label || "Other",
        statusKey: adjusted ? "approved" : "applied",
        statusLabel: adjusted ? "Approved" : "Applied",
        sourceKey: "system",
        device: "system",
        details: remarks || day.label || "—",
      };
  }
}

function buildSummaryActivityRows(
  days: AttendanceDayCell[],
): SummaryActivityRow[] {
  const rows: SummaryActivityRow[] = [];
  const ordered = [...days].sort((a, b) => b.date.localeCompare(a.date));

  for (const day of ordered) {
    const remarks =
      day.remarks?.trim() || (day.isManuallyAdjusted ? "Corrected" : "—");

    if ((day.actions?.length ?? 0) > 0) {
      let lastLoginAt: string | null = null;
      for (const action of day.actions) {
        const isSystemCheckout =
          action.kind === "logout" &&
          (action.device === "system" ||
            action.timeLabel === SYSTEM_CHECKOUT_LABEL);
        const sourceKey = isSystemCheckout
          ? "system"
          : sourceFromDevice(action.device);
        let details = "";
        if (action.kind === "login") {
          lastLoginAt = action.at;
          details = day.anomalyLabels?.[0] ?? "";
        } else if (lastLoginAt) {
          details = formatSessionDuration(lastLoginAt, action.at);
        } else if (day.status === "weekly_off") {
          details = "Weekly off";
        } else if (day.status === "holiday") {
          details = day.label || "Holiday";
        }

        rows.push({
          id: `${day.date}-${action.kind}-${action.at}`,
          date: day.date,
          day,
          eventKey: action.kind,
          eventLabel: action.kind === "login" ? "Login" : "Logout",
          statusKey: "success",
          statusLabel: "Success",
          timeLabel: toDisplayTime(action.timeLabel),
          sourceKey,
          device: isSystemCheckout ? "system" : action.device,
          details,
          remarks,
        });
      }
      continue;
    }

    const meta = statusOnlyEvent(day);
    rows.push({
      id: `${day.date}-status`,
      date: day.date,
      day,
      eventKey: meta.eventKey,
      eventLabel: meta.eventLabel,
      statusKey: meta.statusKey,
      statusLabel: meta.statusLabel,
      timeLabel: "",
      sourceKey: meta.sourceKey,
      device: meta.device,
      details: meta.details,
      remarks,
    });
  }

  return rows;
}

function SummaryEventCell({
  eventKey,
  label,
}: {
  eventKey: SummaryEventKey;
  label: string;
}) {
  const icon =
    eventKey === "login" ? (
      <LogIn className="h-4 w-4 text-[#219B68]" />
    ) : eventKey === "logout" ? (
      <LogOut className="h-4 w-4 text-[#E94C50]" />
    ) : eventKey === "half_day" ? (
      <Clock3 className="h-4 w-4 text-[#E99A14]" />
    ) : eventKey === "leave" ? (
      <Plane className="h-4 w-4 text-[#268FD0]" />
    ) : (
      <Clock3 className="h-4 w-4 text-[#5C7375]" />
    );

  return (
    <span className={cn("inline-flex items-center gap-2 font-medium", bodyText)}>
      {icon}
      {label}
    </span>
  );
}

function SummarySourceCell({ sourceKey }: { sourceKey: SummarySourceKey }) {
  const Icon =
    sourceKey === "mobile" ? Smartphone : sourceKey === "system" ? Settings2 : Globe;
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0 text-[#5C7375]" />
      {sourceLabelForKey(sourceKey)}
    </span>
  );
}

function summaryRemarksText(row: SummaryActivityRow): string {
  const remarks = row.remarks?.trim();
  const details = row.details?.trim();
  if (details && remarks && remarks !== "—") {
    return `${details} · ${remarks}`;
  }
  if (details) return details;
  if (remarks) return remarks;
  return "—";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCDay();
}

function istTodayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
