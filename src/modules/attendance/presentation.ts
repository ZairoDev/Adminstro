import type { AttendanceStatus, LeaveCategory, LopBreakdown } from "@/modules/attendance/types";

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half day",
  on_leave: "On leave",
  holiday: "Holiday",
  weekly_off: "Weekly off",
  work_from_home: "Work from home",
  not_joined: "Not joined",
  pending_verification: "Pending verification",
};

export const STATUS_LETTERS: Record<AttendanceStatus, string> = {
  present: "P",
  absent: "A",
  half_day: "HD",
  on_leave: "LV",
  holiday: "H",
  weekly_off: "WO",
  work_from_home: "WF",
  not_joined: "NJ",
  pending_verification: "PV",
};

export function statusLabel(
  status: AttendanceStatus,
  isLate: boolean,
  leaveCategory: LeaveCategory | null = null,
): string {
  if (isLate && status === "present") return "Late";
  if (status === "on_leave" && leaveCategory === "unplanned") return "Unplanned leave";
  return STATUS_LABELS[status];
}

export function statusLetter(
  status: AttendanceStatus,
  isLate: boolean,
  leaveCategory: LeaveCategory | null = null,
): string {
  if (isLate && status === "present") return "LT";
  if (status === "on_leave" && leaveCategory === "unplanned") return "UL";
  return STATUS_LETTERS[status];
}

/** "1 absent, 4 unplanned leave" style summary of where LOP days come from. Empty when there is none. */
export function describeLopBreakdown(breakdown: LopBreakdown): string {
  const parts: [number, string][] = [
    [breakdown.absent, "absent"],
    [breakdown.halfDay, "half day"],
    [breakdown.plannedUnpaidLeave, "unpaid planned leave"],
    [breakdown.unplannedLeave, "unplanned leave"],
    [breakdown.late, "late arrivals"],
  ];
  return parts
    .filter(([days]) => days > 0)
    .map(([days, label]) => `${days} ${label}`)
    .join(", ");
}

export const ANOMALY_LABELS: Record<string, string> = {
  missing_login: "No dashboard login on a working day",
  duplicate_source_events: "More than one login was recorded",
  login_outside_shift: "Login is outside the scheduled shift",
  significantly_late: "Login is more than three hours after shift start",
  login_on_non_working_day: "Login falls on a holiday or weekly off",
  login_before_joining: "Login is before the joining date",
  leave_with_login: "Leave was recorded on a day that also has a login",
};

export const SOURCE_LABELS: Record<string, string> = {
  login: "Dashboard login",
  manual: "Manual correction",
  leave: "Approved leave request",
  system: "Attendance rule",
};
