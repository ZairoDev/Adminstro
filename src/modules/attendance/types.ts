export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "half_day",
  "on_leave",
  "holiday",
  "weekly_off",
  "work_from_home",
  "not_joined",
  "pending_verification",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const LEAVE_PAYS = ["paid", "unpaid"] as const;

export type LeavePay = (typeof LEAVE_PAYS)[number];

export const ANOMALY_FLAGS = [
  "missing_login",
  "duplicate_source_events",
  "login_outside_shift",
  "significantly_late",
  "login_on_non_working_day",
  "login_before_joining",
  "leave_with_login",
] as const;

export type AnomalyFlag = (typeof ANOMALY_FLAGS)[number];

/**
 * Continuous every-other-Saturday offs (not 1st/3rd of the month).
 * cycle_a and cycle_b are the two opposite calendars; flip if the wrong Saturdays are off.
 * Full Saturday off still uses weeklyOffDays including 6.
 */
export const ALTERNATE_SATURDAY_OFF_PATTERNS = ["none", "cycle_a", "cycle_b"] as const;

export type AlternateSaturdayOffPattern = (typeof ALTERNATE_SATURDAY_OFF_PATTERNS)[number];

export type AttendancePolicyRules = {
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  weeklyOffDays: number[];
  /** When set, every other Saturday is a weekly off even if Saturday is not in weeklyOffDays. */
  alternateSaturdayOff: AlternateSaturdayOffPattern;
  halfDayLopFactor: number;
  /** When true: N grace-late days in a month add lateLopFactor LOP, and severe late becomes half day. */
  lateCreatesLop: boolean;
  /** LOP days added once when grace-late count reaches lateGraceThresholdCount. */
  lateLopFactor: number;
  /** Mild grace-late present days in a month before lateLopFactor applies. */
  lateGraceThresholdCount: number;
  /** Minutes after shift start that auto-mark the day as half day (when lateCreatesLop). */
  severeLateMinutes: number;
  cutoffTime: string;
  confirmed: boolean;
};

export type ShiftChoice = {
  startTime: string;
  endTime: string;
  weeklyOffDays: number[];
};

export type ShiftAssignmentRange = ShiftChoice & {
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type HolidayMark = {
  date: string;
  departmentId: string | null;
};

export type ResolveDayInput = {
  attendanceDate: string;
  now: Date;
  policy: AttendancePolicyRules;
  joiningDate: string | null;
  exitDate: string | null;
  departmentId: string | null;
  holidays: HolidayMark[];
  shift: ShiftChoice;
  firstLoginAt: Date | null;
  qualifyingLoginCount: number;
};

export type ResolvedAttendance = {
  persist: true;
  status: AttendanceStatus;
  isLate: boolean;
  lateByMinutes: number;
  leavePay: null;
  firstLoginAt: Date | null;
  shiftStartAt: Date;
  shiftEndAt: Date;
  source: "login" | "system";
  anomalyFlags: AnomalyFlag[];
};

export type ResolveDayResult =
  | ResolvedAttendance
  | { persist: false; reason: "after_exit" | "future_working_day" };

export type DayContribution = {
  status: AttendanceStatus;
  leavePay: LeavePay | null;
  isLate: boolean;
};

export type AttendanceSummary = {
  scheduledWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  holidays: number;
  weeklyOffs: number;
  lateArrivals: number;
  pendingVerification: number;
  workFromHomeDays: number;
  notJoinedDays: number;
  lopDays: number;
  presentEquivalents: number;
  attendancePercentage: number;
};

export type StoredAttendanceGuard = {
  isManuallyAdjusted: boolean;
  periodFinalized: boolean;
};

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicyRules & {
  policyName: string;
  timezone: "Asia/Kolkata";
} = {
  policyName: "Company default",
  timezone: "Asia/Kolkata",
  shiftStart: "10:00",
  shiftEnd: "18:30",
  graceMinutes: 15,
  weeklyOffDays: [0],
  alternateSaturdayOff: "cycle_a",
  halfDayLopFactor: 0.5,
  lateCreatesLop: false,
  lateLopFactor: 0.25,
  lateGraceThresholdCount: 10,
  severeLateMinutes: 30,
  cutoffTime: "18:30",
  confirmed: false,
};
