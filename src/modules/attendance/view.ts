import type {
  AttendanceStatus,
  AttendanceSummary,
  RecordLeaveCategory,
  LeavePay,
  LopBreakdown,
} from "@/modules/attendance/types";

export const ATTENDANCE_PAGE_SIZE = 50;

export type AttendanceDayAction = {
  kind: "login" | "logout";
  at: string;
  timeLabel: string;
  device: "desktop" | "mobile" | "system" | null;
};

export type AttendanceDayCell = {
  date: string;
  recordId: string | null;
  status: AttendanceStatus | null;
  letter: string;
  label: string;
  isLate: boolean;
  lateByMinutes: number;
  leavePay: LeavePay | null;
  leaveCategory: RecordLeaveCategory | null;
  /** Set when the day came from an approved leave request. */
  leaveRequestId: string | null;
  firstLoginAt: string | null;
  firstLoginLabel: string;
  /** Check-out time (last logout of the day). */
  lastLogoutAt: string | null;
  lastLogoutLabel: string;
  /** desktop | mobile | system — device for first check-in */
  checkInDevice: "desktop" | "mobile" | "system" | null;
  /** desktop | mobile | system — device for last check-out */
  checkOutDevice: "desktop" | "mobile" | "system" | null;
  /** Every login/logout that day (display only; does not change attendance rules). */
  actions: AttendanceDayAction[];
  shiftStartLabel: string;
  shiftEndLabel: string;
  source: string;
  sourceLabel: string;
  isManuallyAdjusted: boolean;
  anomalyFlags: string[];
  anomalyLabels: string[];
  remarks: string;
};

export type AttendanceEmployeeRow = {
  id: string;
  employeeCode: string | null;
  name: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string | null;
  exitDate: string | null;
  summary: AttendanceSummary;
  days: AttendanceDayCell[];
};

export type AttendanceCards = {
  asOfDate: string;
  asOfLabel: string;
  totalEmployees: number;
  presentOnDate: number;
  absentOnDate: number;
  onLeaveOnDate: number;
  lateOnDate: number;
  pendingOnDate: number;
  monthlyAttendancePercentage: number;
  totalLopDays: number;
};

export type AttendanceMonthPayload = {
  month: string;
  monthLabel: string;
  dates: string[];
  page: number;
  pageSize: number;
  totalEmployees: number;
  totalPages: number;
  policyConfirmed: boolean;
  periodStatus: "open" | "finalized";
  departments: string[];
  /** company = HR/Admin/SuperAdmin. team = reporting manager, limited to their reports. */
  scope: "company" | "team";
  canCorrect: boolean;
  canManagePolicy: boolean;
  cards: AttendanceCards;
  employees: AttendanceEmployeeRow[];
};

export type AttendanceAuditView = {
  id: string;
  attendanceDate: string;
  reason: string;
  changedByName: string;
  approvedByName: string | null;
  oldStatus: string;
  newStatus: string;
  oldLoginLabel: string;
  newLoginLabel: string;
  createdAt: string;
};

/** The rules a person needs in order to read their own month. */
export type AttendanceGuide = {
  /** Minutes after shift start that still count as on time. */
  graceMinutes: number;
  /** Present days that started after the grace window. */
  graceDaysUsed: number;
  /** How many of those late days are allowed before extra loss of pay. */
  graceDaysAllowed: number;
  /** When true, crossing the allowance adds loss of pay, and a very late arrival becomes a half day. */
  graceCutsPay: boolean;
  /** Minutes after shift start that mark a half day, when grace cuts pay. */
  severeLateMinutes: number;
  /** Loss of pay charged for each half day. */
  halfDayLopFactor: number;
  /** Loss of pay charged for each unplanned leave day. */
  unplannedLeaveLopDays: number;
};

export type EmployeeAttendancePayload = {
  employee: {
    id: string;
    employeeCode: string | null;
    name: string;
    email: string;
    profilePic: string | null;
    department: string;
    designation: string;
    joiningDate: string | null;
    exitDate: string | null;
  };
  month: string;
  monthLabel: string;
  dates: string[];
  days: AttendanceDayCell[];
  summary: AttendanceSummary;
  guide: AttendanceGuide;
  shiftLabel: string;
  shiftChanges: boolean;
  policyConfirmed: boolean;
  periodStatus: "open" | "finalized";
  canCorrect: boolean;
  audits: AttendanceAuditView[];
};

export type LopLookup = {
  lossOfPayDays: number;
  breakdown: LopBreakdown;
  paidLeaveDays: number;
  unplannedLeaveDays: number;
  policyConfirmed: boolean;
  periodStatus: "open" | "finalized";
  lastSlip: {
    lossOfPayDays: number;
    payrollStale: boolean;
    slipNumber: string;
    createdAt: string;
  } | null;
};

export type PolicyView = {
  policyName: string;
  timezone: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  weeklyOffDays: number[];
  alternateSaturdayOff: "none" | "cycle_a" | "cycle_b";
  halfDayLopFactor: number;
  lateCreatesLop: boolean;
  lateLopFactor: number;
  lateGraceThresholdCount: number;
  severeLateMinutes: number;
  cutoffTime: string;
  confirmed: boolean;
  confirmedAt: string | null;
  paidLeaveMonthlyAccrual: number;
  paidLeaveCarryForwardCap: number;
  paidLeaveMaxBalance: number;
  unplannedLeaveLopDays: number;
  plannedLeaveMinNoticeDays: number;
  unplannedBackdateDays: number;
  leaveAccrualStartMonth: string;
};

export type HolidayView = {
  id: string;
  date: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
};

export type ShiftView = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  startTime: string;
  endTime: string;
  weeklyOffDays: number[];
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type DepartmentOption = {
  id: string;
  name: string;
};

export type DepartmentShiftPositionView = {
  jobPositionId: string;
  name: string;
  startTime: string;
  endTime: string;
  weeklyOffDays: number[];
  saved: boolean;
};

export type DepartmentShiftView = {
  departmentId: string;
  departmentName: string;
  startTime: string;
  endTime: string;
  weeklyOffDays: number[];
  saved: boolean;
  positions: DepartmentShiftPositionView[];
};
