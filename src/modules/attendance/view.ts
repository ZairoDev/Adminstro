import type { AttendanceSummary } from "@/modules/attendance/types";
import type { AttendanceStatus, LeavePay } from "@/modules/attendance/types";

export const ATTENDANCE_PAGE_SIZE = 50;

export type AttendanceDayCell = {
  date: string;
  recordId: string | null;
  status: AttendanceStatus | null;
  letter: string;
  label: string;
  isLate: boolean;
  lateByMinutes: number;
  leavePay: LeavePay | null;
  firstLoginAt: string | null;
  firstLoginLabel: string;
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

export type EmployeeAttendancePayload = {
  employee: {
    id: string;
    employeeCode: string | null;
    name: string;
    email: string;
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
  shiftLabel: string;
  shiftChanges: boolean;
  policyConfirmed: boolean;
  periodStatus: "open" | "finalized";
  canCorrect: boolean;
  audits: AttendanceAuditView[];
};

export type LopLookup = {
  lossOfPayDays: number;
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
  halfDayLopFactor: number;
  lateCreatesLop: boolean;
  lateLopFactor: number;
  cutoffTime: string;
  confirmed: boolean;
  confirmedAt: string | null;
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
