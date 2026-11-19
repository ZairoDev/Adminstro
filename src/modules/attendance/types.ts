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

/** Planned leave is requested ahead of time. Unplanned leave is marked explicitly and carries extra LOP. */
export const LEAVE_CATEGORIES = ["planned", "unplanned"] as const;

export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];

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
  /** Paid leave days credited on the 1st of every month. */
  paidLeaveMonthlyAccrual: number;
  /** Balance above this value is trimmed when the new calendar year starts. */
  paidLeaveCarryForwardCap: number;
  /** Accrual never pushes the balance above this value. */
  paidLeaveMaxBalance: number;
  /** LOP days charged for every explicitly marked unplanned leave day. */
  unplannedLeaveLopDays: number;
  /** Planned leave must start at least this many days from today (HR and admins are exempt). */
  plannedLeaveMinNoticeDays: number;
  /** How many days back an unplanned leave may start. */
  unplannedBackdateDays: number;
  /** First month (YYYY-MM) that earns paid leave. Stops retroactive credit for existing staff. */
  leaveAccrualStartMonth: string;
};

export type LeavePolicyRules = Pick<
  AttendancePolicyRules,
  | "paidLeaveMonthlyAccrual"
  | "paidLeaveCarryForwardCap"
  | "paidLeaveMaxBalance"
  | "unplannedLeaveLopDays"
  | "plannedLeaveMinNoticeDays"
  | "unplannedBackdateDays"
  | "leaveAccrualStartMonth"
>;

export const DEFAULT_LEAVE_POLICY: LeavePolicyRules = {
  paidLeaveMonthlyAccrual: 1.5,
  paidLeaveCarryForwardCap: 12,
  paidLeaveMaxBalance: 24,
  unplannedLeaveLopDays: 2,
  plannedLeaveMinNoticeDays: 1,
  unplannedBackdateDays: 7,
  leaveAccrualStartMonth: "",
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
  /** Leave rows saved before categories existed have no value and count as planned. */
  leaveCategory?: LeaveCategory | null;
  isLate: boolean;
};

export type AttendanceSummary = {
  scheduledWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  /** Planned leave days that were not covered by the paid balance. */
  unpaidLeaveDays: number;
  /** Explicitly marked unplanned leave days. */
  unplannedLeaveDays: number;
  holidays: number;
  weeklyOffs: number;
  lateArrivals: number;
  pendingVerification: number;
  workFromHomeDays: number;
  notJoinedDays: number;
  lopDays: number;
  lopBreakdown: LopBreakdown;
  presentEquivalents: number;
  attendancePercentage: number;
};

/** Where the month's LOP days come from. The parts add up to the total LOP days. */
export type LopBreakdown = {
  absent: number;
  halfDay: number;
  plannedUnpaidLeave: number;
  unplannedLeave: number;
  late: number;
};

export type StoredAttendanceGuard = {
  isManuallyAdjusted: boolean;
  periodFinalized: boolean;
  /** Rows that belong to an approved leave request are never rewritten by reconcile. */
  leaveRequestId?: string | null;
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
  ...DEFAULT_LEAVE_POLICY,
};
