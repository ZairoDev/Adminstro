import axios from "@/util/axios";
import { cn } from "@/lib/utils";
import type { LeaveRequestStatus } from "@/modules/attendance/leave/types";
import type { LeaveCategory } from "@/modules/attendance/types";

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
}

/** Today's date in IST as YYYY-MM-DD, matching how the server keys attendance days. */
export function todayInIst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysToDateKey(dateKey: string, count: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const moved = new Date(Date.UTC(year, month - 1, day + count));
  return moved.toISOString().slice(0, 10);
}

const STATUS_CLASS: Record<LeaveRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-50",
  approved: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50",
  rejected: "bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-50",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_TEXT: Record<LeaveRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return (
    <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-semibold", STATUS_CLASS[status])}>
      {STATUS_TEXT[status]}
    </span>
  );
}

export function LeaveTypeBadge({ type }: { type: LeaveCategory }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
        type === "unplanned"
          ? "bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-50"
          : "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-50",
      )}
    >
      {type === "unplanned" ? "Unplanned" : "Planned"}
    </span>
  );
}

export function formatDayCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
}
