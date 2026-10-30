import {
  addAttendanceDays,
  cutoffInstant,
  istDateKey,
  loginMatchesDate,
  shiftWindow,
  weekdayIndex,
} from "@/modules/attendance/dates";
import type {
  AnomalyFlag,
  AttendancePolicyRules,
  AttendanceStatus,
  AttendanceSummary,
  DayContribution,
  HolidayMark,
  LeavePay,
  ResolveDayInput,
  ResolveDayResult,
  ShiftAssignmentRange,
  ShiftChoice,
  StoredAttendanceGuard,
} from "@/modules/attendance/types";

const SIGNIFICANT_LATE_MINUTES = 180;

export function roundLop(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function policyShift(
  policy: Pick<AttendancePolicyRules, "shiftStart" | "shiftEnd" | "weeklyOffDays">,
): ShiftChoice {
  return {
    startTime: policy.shiftStart,
    endTime: policy.shiftEnd,
    weeklyOffDays: policy.weeklyOffDays,
  };
}

function assignmentForDate(date: string, assignments: ShiftAssignmentRange[]): ShiftAssignmentRange | null {
  const matches = assignments.filter((item) => {
    if (item.effectiveFrom > date) return false;
    if (item.effectiveTo && item.effectiveTo < date) return false;
    return true;
  });
  matches.sort((left, right) => (left.effectiveFrom < right.effectiveFrom ? 1 : -1));
  return matches[0] ?? null;
}

function choiceFromAssignment(assignment: ShiftAssignmentRange): ShiftChoice {
  return {
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    weeklyOffDays: assignment.weeklyOffDays,
  };
}

export function shiftForDate(
  date: string,
  policy: Pick<AttendancePolicyRules, "shiftStart" | "shiftEnd" | "weeklyOffDays">,
  assignments: ShiftAssignmentRange[],
): ShiftChoice {
  const chosen = assignmentForDate(date, assignments);
  return chosen ? choiceFromAssignment(chosen) : policyShift(policy);
}

export function attendanceOrgNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Prefer stored ids. Fall back to the department and designation names already on the employee. */
export function attendanceOrgIds(input: {
  departmentId: string | null;
  jobPositionId: string | null;
  departmentName: string;
  jobTitle: string;
  departmentIdByName: ReadonlyMap<string, string>;
  positionIdByDepartmentAndTitle: ReadonlyMap<string, string>;
}): { departmentId: string | null; jobPositionId: string | null } {
  const departmentId =
    input.departmentId ??
    input.departmentIdByName.get(attendanceOrgNameKey(input.departmentName)) ??
    null;
  const jobPositionId =
    input.jobPositionId ??
    (departmentId
      ? input.positionIdByDepartmentAndTitle.get(
          `${departmentId}\n${attendanceOrgNameKey(input.jobTitle)}`,
        ) ?? null
      : null);
  return { departmentId, jobPositionId };
}

/**
 * An individual dated shift wins. Otherwise the designation shift wins over the
 * department shift, and both win over the company default.
 */
export function resolveWorkShift(input: {
  date: string;
  policy: Pick<AttendancePolicyRules, "shiftStart" | "shiftEnd" | "weeklyOffDays">;
  personalShifts: ShiftAssignmentRange[];
  departmentId: string | null;
  jobPositionId: string | null;
  departmentShifts: ReadonlyMap<string, ShiftChoice>;
  positionShifts: ReadonlyMap<string, ShiftChoice>;
}): ShiftChoice {
  const personal = assignmentForDate(input.date, input.personalShifts);
  if (personal) return choiceFromAssignment(personal);
  if (input.jobPositionId) {
    const position = input.positionShifts.get(input.jobPositionId);
    if (position) return position;
  }
  if (input.departmentId) {
    const department = input.departmentShifts.get(input.departmentId);
    if (department) return department;
  }
  return policyShift(input.policy);
}

export function isHoliday(
  date: string,
  departmentId: string | null,
  holidays: HolidayMark[],
): boolean {
  return holidays.some((holiday) => {
    if (holiday.date !== date) return false;
    if (!holiday.departmentId) return true;
    return holiday.departmentId === departmentId;
  });
}

export function lateArrival(
  loginAt: Date,
  shiftStartAt: Date,
  graceMinutes: number,
): { isLate: boolean; lateByMinutes: number } {
  const threshold = shiftStartAt.getTime() + graceMinutes * 60 * 1000;
  const delta = loginAt.getTime() - threshold;
  if (delta <= 0) return { isLate: false, lateByMinutes: 0 };
  return { isLate: true, lateByMinutes: Math.ceil(delta / 60_000) };
}

/**
 * Last IST date the employee should appear on an attendance sheet.
 * Active staff have no exit. A stored separation date is inclusive.
 * Someone marked inactive without a date stays on earlier months and drops off the current month.
 */
export function attendanceExitDate(input: {
  isActive: boolean;
  inactiveDate: string | null;
  today: string;
}): string | null {
  if (input.isActive) return null;
  if (input.inactiveDate) return input.inactiveDate;
  return addAttendanceDays(`${input.today.slice(0, 7)}-01`, -1);
}

export function overlapsAttendanceMonth(input: {
  joiningDate: string | null;
  exitDate: string | null;
  monthStart: string;
  monthEnd: string;
}): boolean {
  if (input.joiningDate && input.joiningDate > input.monthEnd) return false;
  if (input.exitDate && input.exitDate < input.monthStart) return false;
  return true;
}

function employmentState(
  date: string,
  joiningDate: string | null,
  exitDate: string | null,
): "before" | "active" | "after" {
  if (joiningDate && date < joiningDate) return "before";
  if (exitDate && date > exitDate) return "after";
  return "active";
}

function outsideShift(loginAt: Date, window: { start: Date; end: Date }): boolean {
  return (
    loginAt.getTime() < window.start.getTime() - 60 * 60 * 1000 ||
    loginAt.getTime() > window.end.getTime()
  );
}

export function resolveAttendanceDay(input: ResolveDayInput): ResolveDayResult {
  const window = shiftWindow(input.attendanceDate, input.shift.startTime, input.shift.endTime);
  const cutoff = cutoffInstant(window, input.policy.cutoffTime, input.attendanceDate);
  const today = istDateKey(input.now);
  const employment = employmentState(input.attendanceDate, input.joiningDate, input.exitDate);
  const holiday = isHoliday(input.attendanceDate, input.departmentId, input.holidays);
  const weeklyOff = input.shift.weeklyOffDays.includes(weekdayIndex(input.attendanceDate));
  const future = input.attendanceDate > today;

  if (employment === "after") {
    return { persist: false, reason: "after_exit" };
  }

  const anomalyFlags: AnomalyFlag[] = [];
  if (input.qualifyingLoginCount > 1) anomalyFlags.push("duplicate_source_events");

  const base = {
    persist: true as const,
    leavePay: null,
    firstLoginAt: input.firstLoginAt,
    isLate: false,
    lateByMinutes: 0,
    shiftStartAt: window.start,
    shiftEndAt: window.end,
    source: input.firstLoginAt ? ("login" as const) : ("system" as const),
  };

  if (employment === "before") {
    if (input.firstLoginAt) anomalyFlags.push("login_before_joining");
    return { ...base, status: "not_joined", anomalyFlags };
  }

  if (holiday || weeklyOff) {
    if (input.firstLoginAt) anomalyFlags.push("login_on_non_working_day");
    return {
      ...base,
      status: holiday ? "holiday" : "weekly_off",
      anomalyFlags,
    };
  }

  if (future) {
    return { persist: false, reason: "future_working_day" };
  }

  if (input.firstLoginAt) {
    const late = lateArrival(input.firstLoginAt, window.start, input.policy.graceMinutes);
    if (outsideShift(input.firstLoginAt, window)) anomalyFlags.push("login_outside_shift");
    if (late.lateByMinutes >= SIGNIFICANT_LATE_MINUTES) anomalyFlags.push("significantly_late");
    return {
      ...base,
      status: "present",
      isLate: late.isLate,
      lateByMinutes: late.lateByMinutes,
      anomalyFlags,
      source: "login",
    };
  }

  const inProgress = input.now.getTime() < cutoff.getTime();
  const markAbsent = input.policy.confirmed && !inProgress;
  anomalyFlags.push("missing_login");
  return {
    ...base,
    status: markAbsent ? "absent" : "pending_verification",
    anomalyFlags,
    source: "system",
  };
}

export function canAutoUpdate(record: StoredAttendanceGuard): boolean {
  return !record.isManuallyAdjusted && !record.periodFinalized;
}

export function emptySummary(): AttendanceSummary {
  return {
    scheduledWorkingDays: 0,
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    holidays: 0,
    weeklyOffs: 0,
    lateArrivals: 0,
    pendingVerification: 0,
    workFromHomeDays: 0,
    notJoinedDays: 0,
    lopDays: 0,
    presentEquivalents: 0,
    attendancePercentage: 0,
  };
}

export function summarizeAttendance(
  days: DayContribution[],
  policy: Pick<AttendancePolicyRules, "halfDayLopFactor" | "lateCreatesLop" | "lateLopFactor">,
): AttendanceSummary {
  const summary = emptySummary();
  let lop = 0;
  let presentEquivalents = 0;

  for (const day of days) {
    if (day.isLate && (day.status === "present" || day.status === "half_day")) {
      summary.lateArrivals += 1;
    }

    switch (day.status) {
      case "holiday":
        summary.holidays += 1;
        break;
      case "weekly_off":
        summary.weeklyOffs += 1;
        break;
      case "not_joined":
        summary.notJoinedDays += 1;
        break;
      case "pending_verification":
        summary.scheduledWorkingDays += 1;
        summary.pendingVerification += 1;
        break;
      case "present":
        summary.scheduledWorkingDays += 1;
        summary.presentDays += 1;
        presentEquivalents += 1;
        if (day.isLate && policy.lateCreatesLop) lop += policy.lateLopFactor;
        break;
      case "work_from_home":
        summary.scheduledWorkingDays += 1;
        summary.workFromHomeDays += 1;
        presentEquivalents += 1;
        break;
      case "half_day":
        summary.scheduledWorkingDays += 1;
        summary.halfDays += 1;
        presentEquivalents += 0.5;
        lop += policy.halfDayLopFactor;
        break;
      case "on_leave":
        summary.scheduledWorkingDays += 1;
        if (day.leavePay === "unpaid") {
          summary.unpaidLeaveDays += 1;
          lop += 1;
        } else {
          summary.paidLeaveDays += 1;
          presentEquivalents += 1;
        }
        break;
      case "absent":
        summary.scheduledWorkingDays += 1;
        summary.absentDays += 1;
        lop += 1;
        break;
      default:
        break;
    }
  }

  summary.lopDays = roundLop(lop);
  summary.presentEquivalents = roundLop(presentEquivalents);
  summary.attendancePercentage =
    summary.scheduledWorkingDays === 0
      ? 0
      : roundPercent((presentEquivalents / summary.scheduledWorkingDays) * 100);
  return summary;
}

export function correctionPermission(input: {
  periodFinalized: boolean;
  role: string;
  status: AttendanceStatus;
  attendanceDate: string;
  today: string;
}): { allowed: boolean; requiresApproval: boolean; message?: string } {
  if (input.attendanceDate > input.today && input.status === "absent") {
    return {
      allowed: false,
      requiresApproval: false,
      message: "Future dates cannot be marked absent",
    };
  }
  if (input.periodFinalized && input.role !== "SuperAdmin") {
    return {
      allowed: false,
      requiresApproval: true,
      message: "This month is finalized. Only a super admin can correct it",
    };
  }
  if (input.periodFinalized) {
    return { allowed: true, requiresApproval: true };
  }
  return { allowed: true, requiresApproval: false };
}

export function leavePayForStatus(
  status: AttendanceStatus,
  leavePay: LeavePay | null,
): LeavePay | null {
  if (status === "on_leave") return leavePay;
  return null;
}

export function qualifyingLoginCount(
  logins: Date[],
  attendanceDate: string,
  shift: ShiftChoice,
): Date[] {
  return logins.filter((login) =>
    loginMatchesDate(login, attendanceDate, shift.startTime, shift.endTime),
  );
}
