import mongoose, { type AnyBulkWriteOperation, type FilterQuery } from "mongoose";
import AttendanceAuditLog from "@/models/attendanceAuditLog";
import AttendanceOrgShift from "@/models/attendanceOrgShift";
import AttendancePayrollSnapshot from "@/models/attendancePayrollSnapshot";
import AttendancePeriod from "@/models/attendancePeriod";
import AttendancePolicy from "@/models/attendancePolicy";
import AttendanceRecord from "@/models/attendanceRecord";
import CompanyHoliday from "@/models/companyHoliday";
import Department from "@/models/department";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import EmployeeShiftAssignment from "@/models/employeeShiftAssignment";
import Employees from "@/models/employee";
import JobPosition from "@/models/jobPosition";
import {
  attendanceExitDate,
  attendanceOrgIds,
  attendanceOrgNameKey,
  canAutoUpdate,
  correctionPermission,
  emptySummary,
  isUnapprovedLeaveDay,
  lateArrival,
  leaveCategoryForStatus,
  leavePayForStatus,
  overlapsAttendanceMonth,
  resolveAttendanceDay,
  resolveWorkShift,
  roundLop,
  roundPercent,
  summarizeAttendance,
} from "@/modules/attendance/calculate";
import {
  addAttendanceDays,
  clockOnDate,
  compareDateKeys,
  cutoffInstant,
  datesInPayrollMonth,
  formatAttendanceDate,
  formatLoginIst,
  isAttendanceDateKey,
  istDateKey,
  istDayBounds,
  latestInstant,
  loginMatchesDate,
  normalizeAlternateSaturdayOff,
  shiftWindow,
} from "@/modules/attendance/dates";
import {
  toAttendanceDevice,
  type AttendanceDevice,
} from "@/util/attendanceDevice";
import { AttendanceError, isDuplicateKeyError } from "@/modules/attendance/errors";
import { ANOMALY_LABELS, SOURCE_LABELS, statusLabel, statusLetter } from "@/modules/attendance/presentation";
import {
  currentPayrollMonth,
  parsePayrollMonth,
  payrollMonthLabel,
  type PayrollMonth,
} from "@/modules/finance/salary-month";
import { escapeRegex } from "@/modules/finance/escape-regex";
import { ensureAccruals, syncManualLeaveConsumption } from "@/modules/attendance/leave/ledger";
import {
  DEFAULT_ATTENDANCE_POLICY,
  DEFAULT_LEAVE_POLICY,
  type AttendancePolicyRules,
  type AttendanceStatus,
  type DayContribution,
  type LeavePay,
  type RecordLeaveCategory,
  type ShiftAssignmentRange,
  type ShiftChoice,
} from "@/modules/attendance/types";
import { TEST_SUPERADMIN_EMAIL } from "@/util/employeeConstants";
import { connectDb } from "@/util/db";
import type { AttendanceActor } from "@/modules/attendance/access";
import { canCorrectAttendance } from "@/modules/attendance/access";
import {
  assertCanViewEmployeeAttendance,
  resolveAttendanceReadScope,
} from "@/modules/attendance/team-scope";
import {
  ATTENDANCE_PAGE_SIZE,
  type AttendanceAuditView,
  type AttendanceCards,
  type AttendanceDayCell,
  type AttendanceEmployeeRow,
  type AttendanceMonthPayload,
  type DepartmentOption,
  type AttendanceGuide,
  type EmployeeAttendancePayload,
  type DepartmentShiftView,
  type HolidayView,
  type LopLookup,
  type PolicyView,
  type ShiftView,
} from "@/modules/attendance/view";

export type EmployeeLean = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  profilePic?: string | null;
  employeeCode?: string | null;
  department?: string;
  departmentId?: mongoose.Types.ObjectId | null;
  jobTitle?: string;
  jobPositionId?: mongoose.Types.ObjectId | null;
  dateOfJoining?: Date | null;
  inactiveDate?: Date | null;
  isActive?: boolean;
  role?: string;
};

export type RecordLean = {
  _id: mongoose.Types.ObjectId;
  employeeId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  isLate?: boolean;
  lateByMinutes?: number;
  leavePay?: LeavePay | null;
  leaveCategory?: RecordLeaveCategory | null;
  leaveRequestId?: string | null;
  firstLoginAt?: Date | null;
  lastLogoutAt?: Date | null;
  checkInDevice?: AttendanceDevice | null;
  checkOutDevice?: AttendanceDevice | null;
  shiftStartAt: Date;
  shiftEndAt: Date;
  source: "login" | "manual" | "system" | "leave";
  isManuallyAdjusted?: boolean;
  anomalyFlags?: string[];
  remarks?: string;
  finalizedAt?: Date | null;
};

type LoginLean = {
  _id: mongoose.Types.ObjectId;
  employeeId: string;
  loginTime?: Date | null;
  logoutTime?: Date | null;
  deviceInfo?: string | null;
  status?: string | null;
  createdAt?: Date;
};

type SessionMoment = {
  at: Date;
  logoutAt: Date | null;
  device: AttendanceDevice | null;
  stillActive: boolean;
};

type LogoutLean = {
  employeeId: string;
  logoutTime?: Date | null;
  deviceInfo?: string | null;
  createdAt?: Date;
};

export type PolicyLean = {
  _id: mongoose.Types.ObjectId;
  policyName: string;
  timezone: string;
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  weeklyOffDays: number[];
  alternateSaturdayOff?: AttendancePolicyRules["alternateSaturdayOff"];
  halfDayLopFactor: number;
  lateCreatesLop: boolean;
  lateLopFactor: number;
  lateGraceThresholdCount?: number;
  severeLateMinutes?: number;
  cutoffTime: string;
  confirmedAt?: Date | null;
  paidLeaveMonthlyAccrual?: number;
  paidLeaveCarryForwardCap?: number;
  paidLeaveMaxBalance?: number;
  unplannedLeaveLopDays?: number;
  plannedLeaveMinNoticeDays?: number;
  unplannedBackdateDays?: number;
  leaveAccrualStartMonth?: string;
};

export function toRules(policy: PolicyLean): AttendancePolicyRules {
  return {
    shiftStart: policy.shiftStart,
    shiftEnd: policy.shiftEnd,
    graceMinutes: policy.graceMinutes,
    weeklyOffDays: policy.weeklyOffDays ?? [],
    alternateSaturdayOff: normalizeAlternateSaturdayOff(
      policy.alternateSaturdayOff ?? DEFAULT_ATTENDANCE_POLICY.alternateSaturdayOff,
    ),
    halfDayLopFactor: policy.halfDayLopFactor,
    lateCreatesLop: policy.lateCreatesLop,
    lateLopFactor: policy.lateLopFactor,
    lateGraceThresholdCount:
      policy.lateGraceThresholdCount ?? DEFAULT_ATTENDANCE_POLICY.lateGraceThresholdCount,
    severeLateMinutes: policy.severeLateMinutes ?? DEFAULT_ATTENDANCE_POLICY.severeLateMinutes,
    cutoffTime: policy.cutoffTime,
    confirmed: Boolean(policy.confirmedAt),
    paidLeaveMonthlyAccrual:
      policy.paidLeaveMonthlyAccrual ?? DEFAULT_LEAVE_POLICY.paidLeaveMonthlyAccrual,
    paidLeaveCarryForwardCap:
      policy.paidLeaveCarryForwardCap ?? DEFAULT_LEAVE_POLICY.paidLeaveCarryForwardCap,
    paidLeaveMaxBalance: policy.paidLeaveMaxBalance ?? DEFAULT_LEAVE_POLICY.paidLeaveMaxBalance,
    unplannedLeaveLopDays:
      policy.unplannedLeaveLopDays ?? DEFAULT_LEAVE_POLICY.unplannedLeaveLopDays,
    plannedLeaveMinNoticeDays:
      policy.plannedLeaveMinNoticeDays ?? DEFAULT_LEAVE_POLICY.plannedLeaveMinNoticeDays,
    unplannedBackdateDays:
      policy.unplannedBackdateDays ?? DEFAULT_LEAVE_POLICY.unplannedBackdateDays,
    leaveAccrualStartMonth: policy.leaveAccrualStartMonth ?? "",
  };
}

export function monthOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (compareDateKeys(cursor, to) <= 0) {
    dates.push(cursor);
    cursor = addAttendanceDays(cursor, 1);
    if (dates.length > 400) break;
  }
  return dates;
}

function loginMoment(row: LoginLean): Date | null {
  if (row.loginTime) return new Date(row.loginTime);
  if (row.createdAt) return new Date(row.createdAt);
  return null;
}

function logoutMoment(row: { logoutTime?: Date | null; createdAt?: Date }): Date | null {
  if (row.logoutTime) return new Date(row.logoutTime);
  return null;
}

function sameInstant(left: Date | null | undefined, right: Date | null): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return new Date(left).getTime() === right.getTime();
}

function sameDevice(
  left: AttendanceDevice | null | undefined,
  right: AttendanceDevice | null,
): boolean {
  return (left ?? null) === right;
}

/**
 * Check-in = earliest qualifying login.
 * Check-out = latest logout among those sessions (or standalone day logouts).
 * Past days with login but no logout → 23:59 IST + system device.
 */
function resolveCheckTimes(input: {
  date: string;
  now: Date;
  sessions: SessionMoment[];
  dayLogouts: { at: Date; device: AttendanceDevice | null }[];
}): {
  firstLoginAt: Date | null;
  lastLogoutAt: Date | null;
  checkInDevice: AttendanceDevice | null;
  checkOutDevice: AttendanceDevice | null;
} {
  const { date, now, sessions, dayLogouts } = input;
  if (sessions.length === 0) {
    return {
      firstLoginAt: null,
      lastLogoutAt: null,
      checkInDevice: null,
      checkOutDevice: null,
    };
  }

  const sorted = [...sessions].sort((a, b) => a.at.getTime() - b.at.getTime());
  const first = sorted[0]!;
  const firstLoginAt = first.at;
  const checkInDevice = first.device;

  const logoutCandidates: { at: Date; device: AttendanceDevice | null }[] = [];
  for (const session of sessions) {
    if (session.logoutAt) {
      logoutCandidates.push({ at: session.logoutAt, device: session.device });
    }
  }
  for (const logout of dayLogouts) {
    logoutCandidates.push(logout);
  }

  let lastLogoutAt = latestInstant(logoutCandidates.map((row) => row.at));
  let checkOutDevice: AttendanceDevice | null = null;
  if (lastLogoutAt) {
    const winner = logoutCandidates
      .filter((row) => row.at.getTime() === lastLogoutAt!.getTime())
      .at(-1);
    checkOutDevice = winner?.device ?? null;
  }

  const today = istDateKey(now);
  const stillActive = sessions.some((session) => session.stillActive && !session.logoutAt);

  // Still logged in today → check-out not final yet.
  if (stillActive && date === today) {
    return {
      firstLoginAt,
      lastLogoutAt: null,
      checkInDevice,
      checkOutDevice: null,
    };
  }

  // Past day with open session (missed auto-logout) → stamp 23:59 system.
  if (stillActive && firstLoginAt && date < today) {
    lastLogoutAt = clockOnDate(date, "23:59");
    checkOutDevice = "system";
  } else if (!lastLogoutAt && firstLoginAt && date < today) {
    lastLogoutAt = clockOnDate(date, "23:59");
    checkOutDevice = "system";
  }

  return { firstLoginAt, lastLogoutAt, checkInDevice, checkOutDevice };
}

function flagsEqual(left: string[] | undefined, right: string[]): boolean {
  const a = [...(left ?? [])].sort().join("|");
  const b = [...right].sort().join("|");
  return a === b;
}

const EMPLOYEE_FIELDS =
  "name email profilePic employeeCode department departmentId jobTitle jobPositionId dateOfJoining inactiveDate isActive role";

function objectIdText(value: unknown): string | null {
  if (value == null) return null;
  const text = typeof value === "string" ? value.trim() : String(value);
  return /^[a-f\d]{24}$/i.test(text) ? text : null;
}

export type WorkShiftContext = {
  departmentShifts: Map<string, ShiftChoice>;
  positionShifts: Map<string, ShiftChoice>;
  departmentIdByName: Map<string, string>;
  positionIdByDepartmentAndTitle: Map<string, string>;
};

export async function loadWorkShiftContext(): Promise<WorkShiftContext> {
  const [rules, departments, positions] = await Promise.all([
    AttendanceOrgShift.find()
      .select("departmentId jobPositionId startTime endTime weeklyOffDays")
      .lean<
        {
          departmentId: string;
          jobPositionId?: string | null;
          startTime: string;
          endTime: string;
          weeklyOffDays?: number[];
        }[]
      >(),
    Department.find().select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }[]>(),
    JobPosition.find()
      .select("name departmentId")
      .lean<{ _id: mongoose.Types.ObjectId; name: string; departmentId: mongoose.Types.ObjectId }[]>(),
  ]);
  const departmentShifts = new Map<string, ShiftChoice>();
  const positionShifts = new Map<string, ShiftChoice>();
  for (const rule of rules) {
    const choice: ShiftChoice = {
      startTime: rule.startTime,
      endTime: rule.endTime,
      weeklyOffDays: rule.weeklyOffDays ?? [],
    };
    const positionId = objectIdText(rule.jobPositionId);
    if (positionId) positionShifts.set(positionId, choice);
    else departmentShifts.set(rule.departmentId, choice);
  }
  const departmentIdByName = new Map<string, string>();
  for (const department of departments) {
    departmentIdByName.set(attendanceOrgNameKey(department.name), String(department._id));
  }
  const positionIdByDepartmentAndTitle = new Map<string, string>();
  for (const position of positions) {
    const departmentId = String(position.departmentId);
    positionIdByDepartmentAndTitle.set(
      `${departmentId}\n${attendanceOrgNameKey(position.name)}`,
      String(position._id),
    );
  }
  return { departmentShifts, positionShifts, departmentIdByName, positionIdByDepartmentAndTitle };
}

export function orgIdsForEmployee(
  employee: {
    departmentId: string | null;
    jobPositionId: string | null;
    department: string;
    designation: string;
  },
  context: WorkShiftContext,
): { departmentId: string | null; jobPositionId: string | null } {
  return attendanceOrgIds({
    departmentId: employee.departmentId,
    jobPositionId: employee.jobPositionId,
    departmentName: employee.department,
    jobTitle: employee.designation,
    departmentIdByName: context.departmentIdByName,
    positionIdByDepartmentAndTitle: context.positionIdByDepartmentAndTitle,
  });
}

export function employeeView(employee: EmployeeLean, today = istDateKey(new Date())) {
  const joiningDate = employee.dateOfJoining ? istDateKey(new Date(employee.dateOfJoining)) : null;
  const inactiveDate = employee.inactiveDate ? istDateKey(new Date(employee.inactiveDate)) : null;
  const profilePic = employee.profilePic?.trim() || null;
  return {
    id: String(employee._id),
    name: employee.name?.trim() || "Unnamed employee",
    email: employee.email?.trim() || "",
    profilePic,
    employeeCode: employee.employeeCode?.trim() || null,
    department: employee.department?.trim() || "",
    departmentId: objectIdText(employee.departmentId),
    designation: employee.jobTitle?.trim() || "",
    jobPositionId: objectIdText(employee.jobPositionId),
    joiningDate,
    exitDate: attendanceExitDate({
      isActive: employee.isActive !== false,
      inactiveDate,
      today,
    }),
  };
}

function emptyCell(date: string): AttendanceDayCell {
  return {
    date,
    recordId: null,
    status: null,
    letter: "",
    label: "Not recorded",
    isLate: false,
    lateByMinutes: 0,
    leavePay: null,
    leaveCategory: null,
    leaveRequestId: null,
    firstLoginAt: null,
    firstLoginLabel: "",
    lastLogoutAt: null,
    lastLogoutLabel: "",
    checkInDevice: null,
    checkOutDevice: null,
    actions: [],
    shiftStartLabel: "",
    shiftEndLabel: "",
    source: "",
    sourceLabel: "",
    isManuallyAdjusted: false,
    anomalyFlags: [],
    anomalyLabels: [],
    remarks: "",
  };
}

function cellFromRecord(date: string, record: RecordLean | undefined): AttendanceDayCell {
  if (!record) return emptyCell(date);
  const isLate = Boolean(record.isLate);
  const status = record.status;
  const flags = record.anomalyFlags ?? [];
  const leaveCategory = leaveCategoryForStatus(status, record.leaveCategory ?? null);
  const checkInDevice = record.checkInDevice
    ? toAttendanceDevice(record.checkInDevice)
    : null;
  const checkOutDevice = record.checkOutDevice
    ? toAttendanceDevice(record.checkOutDevice)
    : null;
  return {
    date,
    recordId: String(record._id),
    status,
    letter: statusLetter(status, isLate, leaveCategory),
    label: statusLabel(status, isLate, leaveCategory),
    isLate,
    lateByMinutes: record.lateByMinutes ?? 0,
    leavePay: record.leavePay ?? null,
    leaveCategory,
    leaveRequestId: record.leaveRequestId ?? null,
    firstLoginAt: record.firstLoginAt ? new Date(record.firstLoginAt).toISOString() : null,
    firstLoginLabel: record.firstLoginAt ? formatLoginIst(new Date(record.firstLoginAt)) : "",
    lastLogoutAt: record.lastLogoutAt ? new Date(record.lastLogoutAt).toISOString() : null,
    lastLogoutLabel: record.lastLogoutAt ? formatLoginIst(new Date(record.lastLogoutAt)) : "",
    checkInDevice,
    checkOutDevice,
    actions: [],
    shiftStartLabel: record.shiftStartAt ? formatLoginIst(new Date(record.shiftStartAt)) : "",
    shiftEndLabel: record.shiftEndAt ? formatLoginIst(new Date(record.shiftEndAt)) : "",
    source: record.source,
    sourceLabel: SOURCE_LABELS[record.source] ?? record.source,
    isManuallyAdjusted: Boolean(record.isManuallyAdjusted),
    anomalyFlags: flags,
    anomalyLabels: flags.map((flag) => ANOMALY_LABELS[flag] ?? flag),
    remarks: record.remarks ?? "",
  };
}

type ActivityActionLean = {
  activityType: "login" | "logout";
  loginTime?: Date | null;
  logoutTime?: Date | null;
  deviceInfo?: string | null;
  createdAt?: Date;
};

function actionMoment(row: ActivityActionLean): Date | null {
  if (row.activityType === "login") {
    if (row.loginTime) return new Date(row.loginTime);
    if (row.createdAt) return new Date(row.createdAt);
    return null;
  }
  return logoutMoment(row) ?? (row.createdAt ? new Date(row.createdAt) : null);
}

/** Display-only timeline. Does not feed attendance status rules. */
function actionsByDate(
  rows: ActivityActionLean[],
): Map<string, AttendanceDayCell["actions"]> {
  const byDate = new Map<string, AttendanceDayCell["actions"]>();
  for (const row of rows) {
    const at = actionMoment(row);
    if (!at) continue;
    const date = istDateKey(at);
    const list = byDate.get(date) ?? [];
    list.push({
      kind: row.activityType,
      at: at.toISOString(),
      timeLabel: formatLoginIst(at),
      device: row.deviceInfo ? toAttendanceDevice(row.deviceInfo) : null,
    });
    byDate.set(date, list);
  }
  for (const [date, list] of byDate) {
    list.sort((a, b) => a.at.localeCompare(b.at));
    byDate.set(date, list);
  }
  return byDate;
}

function summaryAsOfDate(month: PayrollMonth, now = new Date()): string {
  const dates = datesInPayrollMonth(month);
  const today = istDateKey(now);
  if (month.key === today.slice(0, 7)) return today;
  return dates[dates.length - 1] ?? today;
}

export function requireMonth(value: string): PayrollMonth {
  const month = parsePayrollMonth(value);
  if (!month) throw new AttendanceError(400, "Invalid month");
  return month;
}

export async function getOrCreatePolicy(): Promise<PolicyLean> {
  await connectDb();
  const existing = (await AttendancePolicy.findOne({ key: "default" }).lean()) as PolicyLean | null;
  if (existing) return withLeaveAccrualStart(existing);
  try {
    const created = await AttendancePolicy.create({
      key: "default",
      policyName: DEFAULT_ATTENDANCE_POLICY.policyName,
      timezone: DEFAULT_ATTENDANCE_POLICY.timezone,
      shiftStart: DEFAULT_ATTENDANCE_POLICY.shiftStart,
      shiftEnd: DEFAULT_ATTENDANCE_POLICY.shiftEnd,
      graceMinutes: DEFAULT_ATTENDANCE_POLICY.graceMinutes,
      weeklyOffDays: DEFAULT_ATTENDANCE_POLICY.weeklyOffDays,
      alternateSaturdayOff: DEFAULT_ATTENDANCE_POLICY.alternateSaturdayOff,
      halfDayLopFactor: DEFAULT_ATTENDANCE_POLICY.halfDayLopFactor,
      lateCreatesLop: DEFAULT_ATTENDANCE_POLICY.lateCreatesLop,
      lateLopFactor: DEFAULT_ATTENDANCE_POLICY.lateLopFactor,
      lateGraceThresholdCount: DEFAULT_ATTENDANCE_POLICY.lateGraceThresholdCount,
      severeLateMinutes: DEFAULT_ATTENDANCE_POLICY.severeLateMinutes,
      cutoffTime: DEFAULT_ATTENDANCE_POLICY.cutoffTime,
      confirmedAt: null,
      confirmedBy: null,
      paidLeaveMonthlyAccrual: DEFAULT_LEAVE_POLICY.paidLeaveMonthlyAccrual,
      paidLeaveCarryForwardCap: DEFAULT_LEAVE_POLICY.paidLeaveCarryForwardCap,
      paidLeaveMaxBalance: DEFAULT_LEAVE_POLICY.paidLeaveMaxBalance,
      unplannedLeaveLopDays: DEFAULT_LEAVE_POLICY.unplannedLeaveLopDays,
      plannedLeaveMinNoticeDays: DEFAULT_LEAVE_POLICY.plannedLeaveMinNoticeDays,
      unplannedBackdateDays: DEFAULT_LEAVE_POLICY.unplannedBackdateDays,
      leaveAccrualStartMonth: currentPayrollMonth().key,
    });
    return created.toObject() as PolicyLean;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const raced = (await AttendancePolicy.findOne({ key: "default" }).lean()) as PolicyLean | null;
    if (!raced) throw error;
    return withLeaveAccrualStart(raced);
  }
}

/**
 * Policies saved before paid leave existed have no accrual start month. The first read pins it
 * to the current month so existing staff start earning from now and get no retroactive credit.
 */
async function withLeaveAccrualStart(policy: PolicyLean): Promise<PolicyLean> {
  if (policy.leaveAccrualStartMonth) return policy;
  const startMonth = currentPayrollMonth().key;
  await AttendancePolicy.updateOne(
    { _id: policy._id, $or: [{ leaveAccrualStartMonth: "" }, { leaveAccrualStartMonth: null }, { leaveAccrualStartMonth: { $exists: false } }] },
    { $set: { leaveAccrualStartMonth: startMonth } },
  );
  const refreshed = (await AttendancePolicy.findById(policy._id).lean()) as PolicyLean | null;
  return refreshed ?? { ...policy, leaveAccrualStartMonth: startMonth };
}

function toPolicyView(policy: PolicyLean): PolicyView {
  const rules = toRules(policy);
  return {
    policyName: policy.policyName,
    timezone: policy.timezone,
    shiftStart: policy.shiftStart,
    shiftEnd: policy.shiftEnd,
    graceMinutes: policy.graceMinutes,
    weeklyOffDays: policy.weeklyOffDays ?? [],
    alternateSaturdayOff: rules.alternateSaturdayOff,
    halfDayLopFactor: policy.halfDayLopFactor,
    lateCreatesLop: policy.lateCreatesLop,
    lateLopFactor: policy.lateLopFactor,
    lateGraceThresholdCount: rules.lateGraceThresholdCount,
    severeLateMinutes: rules.severeLateMinutes,
    cutoffTime: policy.cutoffTime,
    confirmed: Boolean(policy.confirmedAt),
    confirmedAt: policy.confirmedAt ? new Date(policy.confirmedAt).toISOString() : null,
    paidLeaveMonthlyAccrual: rules.paidLeaveMonthlyAccrual,
    paidLeaveCarryForwardCap: rules.paidLeaveCarryForwardCap,
    paidLeaveMaxBalance: rules.paidLeaveMaxBalance,
    unplannedLeaveLopDays: rules.unplannedLeaveLopDays,
    plannedLeaveMinNoticeDays: rules.plannedLeaveMinNoticeDays,
    unplannedBackdateDays: rules.unplannedBackdateDays,
    leaveAccrualStartMonth: rules.leaveAccrualStartMonth,
  };
}

export async function reconcileRange(from: string, to: string): Promise<{ written: number; removed: number }> {
  if (!isAttendanceDateKey(from) || !isAttendanceDateKey(to) || from > to) {
    throw new AttendanceError(400, "Invalid date range");
  }
  await connectDb();
  const policy = await getOrCreatePolicy();
  const rules = toRules(policy);
  const dates = enumerateDates(from, to);
  const monthKeys = [...new Set(dates.map(monthOf))];
  const periods = await AttendancePeriod.find({ monthKey: { $in: monthKeys } })
    .select("monthKey status")
    .lean<{ monthKey: string; status: "open" | "finalized" }[]>();
  const finalizedMonths = new Set(
    periods.filter((period) => period.status === "finalized").map((period) => period.monthKey),
  );

  const rangeStart = new Date(istDayBounds(from).start.getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = istDayBounds(addAttendanceDays(to, 2)).end;
  const employeeFilter: FilterQuery<EmployeeLean> = {
    role: { $ne: "Guest" },
    email: { $ne: TEST_SUPERADMIN_EMAIL },
    $and: [
      {
        $or: [{ dateOfJoining: null }, { dateOfJoining: { $lte: rangeEnd } }],
      },
      {
        $or: [{ inactiveDate: null }, { inactiveDate: { $gte: rangeStart } }],
      },
    ],
  };
  const employees = (await Employees.find(employeeFilter)
    .select(EMPLOYEE_FIELDS)
    .lean()) as EmployeeLean[];
  const employeeIds = employees.map((employee) => String(employee._id));
  if (employeeIds.length === 0) return { written: 0, removed: 0 };

  const [holidays, shifts, workShifts, logins, logouts, existing] = await Promise.all([
    CompanyHoliday.find({ date: { $gte: from, $lte: to } })
      .select("date departmentId")
      .lean<{ date: string; departmentId?: string | null }[]>(),
    EmployeeShiftAssignment.find({ employeeId: { $in: employeeIds } })
      .select("employeeId startTime endTime weeklyOffDays effectiveFrom effectiveTo")
      .lean<
        {
          employeeId: string;
          startTime: string;
          endTime: string;
          weeklyOffDays: number[];
          effectiveFrom: string;
          effectiveTo?: string | null;
        }[]
      >(),
    loadWorkShiftContext(),
    EmployeeActivityLog.find({
      employeeId: { $in: employeeIds },
      activityType: "login",
      $or: [
        { loginTime: { $gte: rangeStart, $lt: rangeEnd } },
        {
          $and: [
            { $or: [{ loginTime: null }, { loginTime: { $exists: false } }] },
            { createdAt: { $gte: rangeStart, $lt: rangeEnd } },
          ],
        },
      ],
    })
      .select("employeeId loginTime logoutTime deviceInfo status createdAt")
      .lean<LoginLean[]>(),
    EmployeeActivityLog.find({
      employeeId: { $in: employeeIds },
      activityType: "logout",
      $or: [
        { logoutTime: { $gte: rangeStart, $lt: rangeEnd } },
        {
          $and: [
            { $or: [{ logoutTime: null }, { logoutTime: { $exists: false } }] },
            { createdAt: { $gte: rangeStart, $lt: rangeEnd } },
          ],
        },
      ],
    })
      .select("employeeId logoutTime deviceInfo createdAt")
      .lean<LogoutLean[]>(),
    AttendanceRecord.find({
      employeeId: { $in: employeeIds },
      attendanceDate: { $gte: from, $lte: to },
    }).lean<RecordLean[]>(),
  ]);

  const holidayMarks = holidays.map((holiday) => ({
    date: holiday.date,
    departmentId: holiday.departmentId ?? null,
  }));
  const shiftsByEmployee = new Map<string, ShiftAssignmentRange[]>();
  for (const shift of shifts) {
    const list = shiftsByEmployee.get(shift.employeeId) ?? [];
    list.push({
      startTime: shift.startTime,
      endTime: shift.endTime,
      weeklyOffDays: shift.weeklyOffDays ?? [],
      effectiveFrom: shift.effectiveFrom,
      effectiveTo: shift.effectiveTo ?? null,
    });
    shiftsByEmployee.set(shift.employeeId, list);
  }
  const loginsByEmployee = new Map<string, SessionMoment[]>();
  for (const login of logins) {
    const at = loginMoment(login);
    if (!at) continue;
    const list = loginsByEmployee.get(login.employeeId) ?? [];
    list.push({
      at,
      logoutAt: logoutMoment(login),
      device: login.deviceInfo ? toAttendanceDevice(login.deviceInfo) : null,
      stillActive: login.status === "active",
    });
    loginsByEmployee.set(login.employeeId, list);
  }
  const logoutsByEmployee = new Map<
    string,
    { at: Date; device: AttendanceDevice | null }[]
  >();
  for (const logout of logouts) {
    const at = logoutMoment(logout) ?? (logout.createdAt ? new Date(logout.createdAt) : null);
    if (!at) continue;
    const list = logoutsByEmployee.get(logout.employeeId) ?? [];
    list.push({
      at,
      device: logout.deviceInfo ? toAttendanceDevice(logout.deviceInfo) : null,
    });
    logoutsByEmployee.set(logout.employeeId, list);
  }
  const existingByKey = new Map<string, RecordLean>();
  for (const record of existing) {
    existingByKey.set(`${record.employeeId}:${record.attendanceDate}`, record);
  }

  const now = new Date();
  const ops: AnyBulkWriteOperation[] = [];
  const deleteIds: mongoose.Types.ObjectId[] = [];

  for (const employee of employees) {
    const employeeId = String(employee._id);
    const profile = employeeView(employee);
    const employeeLogins = loginsByEmployee.get(employeeId) ?? [];
    for (const date of dates) {
      if (finalizedMonths.has(monthOf(date))) continue;
      const current = existingByKey.get(`${employeeId}:${date}`);
      if (
        current &&
        !canAutoUpdate({
          isManuallyAdjusted: Boolean(current.isManuallyAdjusted),
          periodFinalized: false,
          leaveRequestId: current.leaveRequestId ?? null,
        })
      ) {
        continue;
      }
      const org = orgIdsForEmployee(profile, workShifts);
      const shift = resolveWorkShift({
        date,
        policy: rules,
        personalShifts: shiftsByEmployee.get(employeeId) ?? [],
        departmentId: org.departmentId,
        jobPositionId: org.jobPositionId,
        departmentShifts: workShifts.departmentShifts,
        positionShifts: workShifts.positionShifts,
      });
      const qualifying = employeeLogins.filter((login) =>
        loginMatchesDate(login.at, date, shift.startTime, shift.endTime),
      );
      const dayLogouts = (logoutsByEmployee.get(employeeId) ?? []).filter((logout) => {
        const bounds = istDayBounds(date);
        return (
          logout.at.getTime() >= bounds.start.getTime() &&
          logout.at.getTime() < bounds.end.getTime()
        );
      });
      const checkTimes = resolveCheckTimes({
        date,
        now,
        sessions: qualifying,
        dayLogouts,
      });
      const firstLoginAt = checkTimes.firstLoginAt;
      const resolved = resolveAttendanceDay({
        attendanceDate: date,
        now,
        policy: rules,
        joiningDate: profile.joiningDate,
        exitDate: profile.exitDate,
        departmentId: profile.departmentId,
        holidays: holidayMarks,
        shift,
        firstLoginAt,
        qualifyingLoginCount: qualifying.length,
      });
      if (!resolved.persist) {
        if (current && !current.isManuallyAdjusted) deleteIds.push(current._id);
        continue;
      }
      const window = shiftWindow(date, shift.startTime, shift.endTime);
      const cutoff = cutoffInstant(window, rules.cutoffTime, date);
      const finalizedAt = now.getTime() >= cutoff.getTime() ? cutoff : null;
      const next = {
        status: resolved.status,
        isLate: resolved.isLate,
        lateByMinutes: resolved.lateByMinutes,
        leavePay: resolved.leavePay,
        leaveCategory: resolved.leaveCategory,
        firstLoginAt: resolved.firstLoginAt,
        lastLogoutAt: checkTimes.lastLogoutAt,
        checkInDevice: checkTimes.checkInDevice,
        checkOutDevice: checkTimes.checkOutDevice,
        shiftStartAt: resolved.shiftStartAt,
        shiftEndAt: resolved.shiftEndAt,
        source: resolved.source,
        anomalyFlags: resolved.anomalyFlags,
        finalizedAt,
      };
      if (
        current &&
        current.status === next.status &&
        Boolean(current.isLate) === next.isLate &&
        (current.lateByMinutes ?? 0) === next.lateByMinutes &&
        (current.leavePay ?? null) === (next.leavePay ?? null) &&
        (current.leaveCategory ?? null) === (next.leaveCategory ?? null) &&
        sameInstant(current.firstLoginAt, next.firstLoginAt) &&
        sameInstant(current.lastLogoutAt, next.lastLogoutAt) &&
        sameDevice(current.checkInDevice, next.checkInDevice) &&
        sameDevice(current.checkOutDevice, next.checkOutDevice) &&
        sameInstant(current.shiftStartAt, next.shiftStartAt) &&
        sameInstant(current.shiftEndAt, next.shiftEndAt) &&
        current.source === next.source &&
        flagsEqual(current.anomalyFlags, next.anomalyFlags) &&
        sameInstant(current.finalizedAt, next.finalizedAt)
      ) {
        continue;
      }
      ops.push({
        updateOne: {
          filter: {
            employeeId,
            attendanceDate: date,
            isManuallyAdjusted: { $ne: true },
            leaveRequestId: null,
          },
          update: {
            $set: next,
            $setOnInsert: { employeeId, attendanceDate: date, isManuallyAdjusted: false, remarks: "" },
          },
          upsert: true,
        },
      });
    }
  }

  let removed = 0;
  if (deleteIds.length > 0) {
    const deleted = await AttendanceRecord.deleteMany({
      _id: { $in: deleteIds },
      isManuallyAdjusted: { $ne: true },
      leaveRequestId: null,
    });
    removed = deleted.deletedCount ?? 0;
  }

  let written = 0;
  for (let index = 0; index < ops.length; index += 500) {
    const chunk = ops.slice(index, index + 500);
    try {
      const result = await AttendanceRecord.bulkWrite(chunk, { ordered: false });
      written += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return { written, removed };
}

export async function reconcileMonth(month: PayrollMonth): Promise<void> {
  const dates = datesInPayrollMonth(month);
  const from = dates[0];
  const to = dates[dates.length - 1];
  if (!from || !to) return;
  await reconcileRange(from, to);
}

export async function reconcileRecentAttendance(): Promise<void> {
  const today = istDateKey(new Date());
  await reconcileRange(addAttendanceDays(today, -1), today);
  await backfillMissingCheckouts();
}

/**
 * Past days with check-in but no check-out get 23:59 IST (system).
 * Skips today and future dates.
 */
export async function backfillMissingCheckouts(
  now: Date = new Date(),
): Promise<number> {
  const today = istDateKey(now);
  // Cover open + previous payroll month without scanning all history every run.
  const from = addAttendanceDays(today, -62);
  const rows = await AttendanceRecord.find({
    attendanceDate: { $gte: from, $lt: today },
    firstLoginAt: { $ne: null },
    $or: [{ lastLogoutAt: null }, { lastLogoutAt: { $exists: false } }],
    isManuallyAdjusted: { $ne: true },
  })
    .select("_id attendanceDate")
    .lean<{ _id: mongoose.Types.ObjectId; attendanceDate: string }[]>();

  if (rows.length === 0) return 0;

  const ops = rows.map((row) => ({
    updateOne: {
      filter: { _id: row._id },
      update: {
        $set: {
          lastLogoutAt: clockOnDate(row.attendanceDate, "23:59"),
          checkOutDevice: "system" as AttendanceDevice,
        },
      },
    },
  }));

  let written = 0;
  for (let index = 0; index < ops.length; index += 500) {
    const chunk = ops.slice(index, index + 500);
    const result = await AttendanceRecord.bulkWrite(chunk, { ordered: false });
    written += result.modifiedCount ?? 0;
  }
  return written;
}

type MonthFilters = {
  month: string;
  department: string;
  search: string;
  card: "" | "present" | "absent" | "on_leave" | "late" | "pending" | "lop";
  page: number;
};

type MonthRowFilters = Omit<MonthFilters, "card" | "page"> & {
  /** When set, the grid is limited to these employees (a reporting manager's team). */
  employeeIds?: string[];
};

async function loadMonthRows(filters: MonthRowFilters): Promise<{
  month: PayrollMonth;
  dates: string[];
  rows: AttendanceEmployeeRow[];
  departments: string[];
  policyConfirmed: boolean;
  periodStatus: "open" | "finalized";
  asOfDate: string;
}> {
  const month = requireMonth(filters.month);
  await reconcileMonth(month);
  const dates = datesInPayrollMonth(month);
  const from = dates[0] ?? `${month.key}-01`;
  const to = dates[dates.length - 1] ?? from;
  const rangeStart = new Date(istDayBounds(from).start.getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = istDayBounds(to).end;
  const employeeFilter: FilterQuery<EmployeeLean> = {
    role: { $ne: "Guest" },
    email: { $ne: TEST_SUPERADMIN_EMAIL },
    $and: [
      { $or: [{ dateOfJoining: null }, { dateOfJoining: { $lte: rangeEnd } }] },
      { $or: [{ inactiveDate: null }, { inactiveDate: { $gte: rangeStart } }] },
    ],
  };
  if (filters.employeeIds) {
    employeeFilter._id = {
      $in: filters.employeeIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    };
  }
  if (filters.search) {
    const pattern = new RegExp(escapeRegex(filters.search), "i");
    employeeFilter.$and = [
      ...(Array.isArray(employeeFilter.$and) ? employeeFilter.$and : []),
      { $or: [{ name: pattern }, { email: pattern }, { employeeCode: pattern }] },
    ];
  }

  const [employees, period, policy] = await Promise.all([
    Employees.find(employeeFilter)
      .select(EMPLOYEE_FIELDS)
      .sort({ name: 1 })
      .lean<EmployeeLean[]>(),
    AttendancePeriod.findOne({ monthKey: month.key }).select("status").lean<{ status?: "open" | "finalized" } | null>(),
    getOrCreatePolicy(),
  ]);
  const ids = employees
    .filter((employee) => {
      const profile = employeeView(employee, istDateKey(new Date()));
      return overlapsAttendanceMonth({
        joiningDate: profile.joiningDate,
        exitDate: profile.exitDate,
        monthStart: from,
        monthEnd: to,
      });
    })
    .map((employee) => String(employee._id));
  const records = ids.length
    ? ((await AttendanceRecord.find({
        employeeId: { $in: ids },
        attendanceDate: { $gte: from, $lte: to },
      }).lean()) as RecordLean[])
    : [];
  const byEmployee = new Map<string, Map<string, RecordLean>>();
  for (const record of records) {
    const days = byEmployee.get(record.employeeId) ?? new Map<string, RecordLean>();
    days.set(record.attendanceDate, record);
    byEmployee.set(record.employeeId, days);
  }
  const rules = toRules(policy);
  const today = istDateKey(new Date());
  const employed = employees.filter((employee) => {
    const profile = employeeView(employee, today);
    return overlapsAttendanceMonth({
      joiningDate: profile.joiningDate,
      exitDate: profile.exitDate,
      monthStart: from,
      monthEnd: to,
    });
  });
  const visibleEmployees = filters.department
    ? employed.filter((employee) => (employee.department?.trim() || "") === filters.department)
    : employed;
  const visibleIds = visibleEmployees.map((employee) => String(employee._id));
  const monthRangeStart = istDayBounds(from).start;
  const monthRangeEnd = istDayBounds(to).end;
  const activityRows =
    visibleIds.length > 0
      ? await EmployeeActivityLog.find({
          employeeId: { $in: visibleIds },
          activityType: { $in: ["login", "logout"] },
          $or: [
            { loginTime: { $gte: monthRangeStart, $lt: monthRangeEnd } },
            { logoutTime: { $gte: monthRangeStart, $lt: monthRangeEnd } },
            {
              $and: [
                {
                  $or: [
                    { loginTime: null },
                    { loginTime: { $exists: false } },
                    { logoutTime: null },
                    { logoutTime: { $exists: false } },
                  ],
                },
                { createdAt: { $gte: monthRangeStart, $lt: monthRangeEnd } },
              ],
            },
          ],
        })
          .select("employeeId activityType loginTime logoutTime deviceInfo createdAt")
          .lean<(ActivityActionLean & { employeeId: string })[]>()
      : [];
  const actionsByEmployee = new Map<string, Map<string, AttendanceDayCell["actions"]>>();
  for (const row of activityRows) {
    const at = actionMoment(row);
    if (!at) continue;
    const date = istDateKey(at);
    const byDate = actionsByEmployee.get(row.employeeId) ?? new Map();
    const list = byDate.get(date) ?? [];
    list.push({
      kind: row.activityType,
      at: at.toISOString(),
      timeLabel: formatLoginIst(at),
      device: row.deviceInfo ? toAttendanceDevice(row.deviceInfo) : null,
    });
    byDate.set(date, list);
    actionsByEmployee.set(row.employeeId, byDate);
  }
  for (const byDate of actionsByEmployee.values()) {
    for (const [date, list] of byDate) {
      list.sort((a, b) => a.at.localeCompare(b.at));
      byDate.set(date, list);
    }
  }
  const rows = visibleEmployees.map((employee) => {
    const profile = employeeView(employee);
    const days = byEmployee.get(profile.id) ?? new Map<string, RecordLean>();
    const dayActions = actionsByEmployee.get(profile.id);
    const cells = dates.map((date) => {
      const cell = cellFromRecord(date, days.get(date));
      return { ...cell, actions: dayActions?.get(date) ?? [] };
    });
    const contributions: DayContribution[] = cells
      .filter((cell): cell is AttendanceDayCell & { status: AttendanceStatus } => cell.status !== null)
      .map((cell) => ({
        status: cell.status,
        leavePay: cell.leavePay,
        leaveCategory: cell.leaveCategory,
        isLate: cell.isLate,
      }));
    return {
      id: profile.id,
      employeeCode: profile.employeeCode,
      name: profile.name,
      email: profile.email,
      department: profile.department,
      designation: profile.designation,
      joiningDate: profile.joiningDate,
      exitDate: profile.exitDate,
      summary: contributions.length ? summarizeAttendance(contributions, rules) : emptySummary(),
      days: cells,
    };
  });
  const departments = [
    ...new Set(
      employed
        .map((employee) => employee.department?.trim() || "")
        .filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));
  return {
    month,
    dates,
    rows,
    departments,
    policyConfirmed: rules.confirmed,
    periodStatus: period?.status === "finalized" ? "finalized" : "open",
    asOfDate: summaryAsOfDate(month),
  };
}

function matchesCard(row: AttendanceEmployeeRow, card: MonthFilters["card"], asOfDate: string): boolean {
  if (!card) return true;
  if (card === "lop") return row.summary.lopDays > 0;
  const day = row.days.find((item) => item.date === asOfDate);
  if (!day?.status) return false;
  if (card === "present") return day.status === "present" || day.status === "work_from_home";
  if (card === "late") return day.isLate && (day.status === "present" || day.status === "half_day");
  if (card === "pending") return day.status === "pending_verification";
  if (card === "absent") return isUnapprovedLeaveDay(day);
  if (card === "on_leave") return day.status === "on_leave" && !isUnapprovedLeaveDay(day);
  return day.status === card;
}

function buildCards(rows: AttendanceEmployeeRow[], asOfDate: string): AttendanceCards {
  let presentOnDate = 0;
  let absentOnDate = 0;
  let onLeaveOnDate = 0;
  let lateOnDate = 0;
  let pendingOnDate = 0;
  let scheduled = 0;
  let equivalents = 0;
  let lop = 0;
  for (const row of rows) {
    scheduled += row.summary.scheduledWorkingDays;
    equivalents += row.summary.presentEquivalents;
    lop += row.summary.lopDays;
    const day = row.days.find((item) => item.date === asOfDate);
    if (!day?.status) continue;
    if (day.status === "present" || day.status === "work_from_home") presentOnDate += 1;
    if (isUnapprovedLeaveDay(day)) absentOnDate += 1;
    else if (day.status === "on_leave") onLeaveOnDate += 1;
    if (day.isLate && (day.status === "present" || day.status === "half_day")) lateOnDate += 1;
    if (day.status === "pending_verification") pendingOnDate += 1;
  }
  return {
    asOfDate,
    asOfLabel: formatAttendanceDate(asOfDate),
    totalEmployees: rows.length,
    presentOnDate,
    absentOnDate,
    onLeaveOnDate,
    lateOnDate,
    pendingOnDate,
    monthlyAttendancePercentage: scheduled === 0 ? 0 : roundPercent((equivalents / scheduled) * 100),
    totalLopDays: roundLop(lop),
  };
}

export async function getAttendanceMonth(
  filters: MonthFilters,
  actor: AttendanceActor,
): Promise<AttendanceMonthPayload> {
  const scope = await resolveAttendanceReadScope(actor);
  const loaded = await loadMonthRows({
    month: filters.month,
    department: filters.department,
    search: filters.search,
    employeeIds: scope.kind === "team" ? scope.employeeIds : undefined,
  });
  const visible = loaded.rows.filter((row) => matchesCard(row, filters.card, loaded.asOfDate));
  const pageSize = ATTENDANCE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * pageSize;
  return {
    month: loaded.month.key,
    monthLabel: payrollMonthLabel(loaded.month),
    dates: loaded.dates,
    page,
    pageSize,
    totalEmployees: visible.length,
    totalPages,
    policyConfirmed: loaded.policyConfirmed,
    periodStatus: loaded.periodStatus,
    departments: loaded.departments,
    scope: scope.kind,
    canCorrect: canCorrectAttendance(actor.role),
    canManagePolicy: actor.role === "SuperAdmin",
    cards: buildCards(loaded.rows, loaded.asOfDate),
    employees: visible.slice(start, start + pageSize),
  };
}

export async function getAttendanceSummary(
  monthValue: string,
  actor: AttendanceActor,
): Promise<AttendanceCards & {
  month: string;
  policyConfirmed: boolean;
  periodStatus: "open" | "finalized";
}> {
  const scope = await resolveAttendanceReadScope(actor);
  const loaded = await loadMonthRows({
    month: monthValue,
    department: "",
    search: "",
    employeeIds: scope.kind === "team" ? scope.employeeIds : undefined,
  });
  return {
    month: loaded.month.key,
    policyConfirmed: loaded.policyConfirmed,
    periodStatus: loaded.periodStatus,
    ...buildCards(loaded.rows, loaded.asOfDate),
  };
}

export async function employeeOrThrow(employeeId: string): Promise<EmployeeLean> {
  await connectDb();
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    throw new AttendanceError(400, "Invalid employee");
  }
  const employee = (await Employees.findById(employeeId)
    .select(EMPLOYEE_FIELDS)
    .lean()) as EmployeeLean | null;
  if (!employee || employee.role === "Guest") {
    throw new AttendanceError(404, "Employee not found");
  }
  return employee;
}

function attendanceGuide(
  rules: AttendancePolicyRules,
  contributions: DayContribution[],
): AttendanceGuide {
  return {
    graceMinutes: rules.graceMinutes,
    graceDaysUsed: contributions.filter((day) => day.status === "present" && day.isLate).length,
    graceDaysAllowed: rules.lateGraceThresholdCount,
    graceCutsPay: rules.lateCreatesLop,
    severeLateMinutes: rules.severeLateMinutes,
    halfDayLopFactor: rules.halfDayLopFactor,
    unplannedLeaveLopDays: rules.unplannedLeaveLopDays,
  };
}

export async function getEmployeeAttendance(
  employeeId: string,
  monthValue: string,
  actor: AttendanceActor,
): Promise<EmployeeAttendancePayload> {
  await assertCanViewEmployeeAttendance(actor, employeeId);
  const month = requireMonth(monthValue);
  await reconcileMonth(month);
  await backfillMissingCheckouts();
  const employee = await employeeOrThrow(employeeId);
  const profile = employeeView(employee);
  const dates = datesInPayrollMonth(month);
  const from = dates[0] ?? `${month.key}-01`;
  const to = dates[dates.length - 1] ?? from;
  const rangeStart = istDayBounds(from).start;
  const rangeEnd = istDayBounds(to).end;
  const [records, audits, shifts, policy, period, workShifts, activityRows] =
    await Promise.all([
    AttendanceRecord.find({ employeeId, attendanceDate: { $gte: from, $lte: to } }).lean<RecordLean[]>(),
    AttendanceAuditLog.find({ employeeId, attendanceDate: { $gte: from, $lte: to } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean<
        {
          _id: mongoose.Types.ObjectId;
          attendanceDate: string;
          reason: string;
          changedByName?: string;
          approvedByName?: string | null;
          oldValues: { status: string; firstLoginAt?: Date | null };
          newValues: { status: string; firstLoginAt?: Date | null };
          createdAt?: Date;
        }[]
      >(),
    EmployeeShiftAssignment.find({ employeeId })
      .select("startTime endTime weeklyOffDays effectiveFrom effectiveTo")
      .lean<ShiftAssignmentRange[]>(),
    getOrCreatePolicy(),
    AttendancePeriod.findOne({ monthKey: month.key }).select("status").lean<{ status?: "open" | "finalized" } | null>(),
    loadWorkShiftContext(),
    EmployeeActivityLog.find({
      employeeId,
      activityType: { $in: ["login", "logout"] },
      $or: [
        { loginTime: { $gte: rangeStart, $lt: rangeEnd } },
        { logoutTime: { $gte: rangeStart, $lt: rangeEnd } },
        {
          $and: [
            {
              $or: [
                { loginTime: null },
                { loginTime: { $exists: false } },
                { logoutTime: null },
                { logoutTime: { $exists: false } },
              ],
            },
            { createdAt: { $gte: rangeStart, $lt: rangeEnd } },
          ],
        },
      ],
    })
      .select("activityType loginTime logoutTime deviceInfo createdAt")
      .lean<ActivityActionLean[]>(),
  ]);
  const byDate = new Map(records.map((record) => [record.attendanceDate, record]));
  const dayActions = actionsByDate(activityRows);
  const rules = toRules(policy);
  const cells = dates.map((date) => {
    const cell = cellFromRecord(date, byDate.get(date));
    return { ...cell, actions: dayActions.get(date) ?? [] };
  });
  const contributions: DayContribution[] = cells
    .filter((cell): cell is AttendanceDayCell & { status: AttendanceStatus } => cell.status !== null)
    .map((cell) => ({
      status: cell.status,
      leavePay: cell.leavePay,
      leaveCategory: cell.leaveCategory,
      isLate: cell.isLate,
    }));
  const org = orgIdsForEmployee(profile, workShifts);
  const shiftLabels = new Set(
    dates.map((date) => {
      const shift = resolveWorkShift({
        date,
        policy: rules,
        personalShifts: shifts,
        departmentId: org.departmentId,
        jobPositionId: org.jobPositionId,
        departmentShifts: workShifts.departmentShifts,
        positionShifts: workShifts.positionShifts,
      });
      return `${shift.startTime}–${shift.endTime}`;
    }),
  );
  const shiftLabel = shiftLabels.size === 1 ? `${[...shiftLabels][0]} IST` : "Varies through the month";
  const auditViews: AttendanceAuditView[] = audits.map((audit) => ({
    id: String(audit._id),
    attendanceDate: audit.attendanceDate,
    reason: audit.reason,
    changedByName: audit.changedByName || "Unknown user",
    approvedByName: audit.approvedByName ?? null,
    oldStatus: audit.oldValues.status,
    newStatus: audit.newValues.status,
    oldLoginLabel: audit.oldValues.firstLoginAt ? formatLoginIst(new Date(audit.oldValues.firstLoginAt)) : "",
    newLoginLabel: audit.newValues.firstLoginAt ? formatLoginIst(new Date(audit.newValues.firstLoginAt)) : "",
    createdAt: audit.createdAt ? new Date(audit.createdAt).toISOString() : "",
  }));
  return {
    employee: {
      id: profile.id,
      employeeCode: profile.employeeCode,
      name: profile.name,
      email: profile.email,
      profilePic: profile.profilePic,
      department: profile.department,
      designation: profile.designation,
      joiningDate: profile.joiningDate,
      exitDate: profile.exitDate,
    },
    month: month.key,
    monthLabel: payrollMonthLabel(month),
    dates,
    days: cells,
    summary: contributions.length ? summarizeAttendance(contributions, rules) : emptySummary(),
    guide: attendanceGuide(rules, contributions),
    shiftLabel,
    shiftChanges: shiftLabels.size > 1,
    policyConfirmed: rules.confirmed,
    periodStatus: period?.status === "finalized" ? "finalized" : "open",
    canCorrect: canCorrectAttendance(actor.role),
    audits: auditViews,
  };
}

export async function getAttendanceDay(employeeId: string, date: string, actor: AttendanceActor) {
  if (!isAttendanceDateKey(date)) throw new AttendanceError(400, "Invalid date");
  const monthKey = monthOf(date);
  const detail = await getEmployeeAttendance(employeeId, monthKey, actor);
  const day = detail.days.find((item) => item.date === date) ?? emptyCell(date);
  return {
    employee: detail.employee,
    day,
    canCorrect: detail.canCorrect,
    periodStatus: detail.periodStatus,
    policyConfirmed: detail.policyConfirmed,
  };
}

function snapshotValues(record: RecordLean) {
  return {
    status: record.status,
    isLate: Boolean(record.isLate),
    lateByMinutes: record.lateByMinutes ?? 0,
    leavePay: record.leavePay ?? null,
    firstLoginAt: record.firstLoginAt ? new Date(record.firstLoginAt) : null,
    remarks: record.remarks ?? "",
  };
}

export async function correctAttendanceRecord(
  recordId: string,
  input: {
    status: AttendanceStatus;
    leavePay?: LeavePay | null;
    leaveCategory?: RecordLeaveCategory | null;
    firstLoginTime?: string | null;
    remarks: string;
    reason: string;
  },
  actor: AttendanceActor,
): Promise<AttendanceDayCell> {
  if (!canCorrectAttendance(actor.role)) {
    throw new AttendanceError(403, "Attendance access required");
  }
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new AttendanceError(400, "Invalid attendance record");
  }
  await connectDb();
  const record = (await AttendanceRecord.findById(recordId).lean()) as RecordLean | null;
  if (!record) throw new AttendanceError(404, "Attendance record not found");
  if (record.leaveRequestId) {
    throw new AttendanceError(
      409,
      "This day comes from a leave request. Cancel or change the request from the leave page instead",
    );
  }
  // A no-show is unapproved leave. Unplanned and unapproved leave are always unpaid.
  const markingUnapproved =
    input.status === "absent" ||
    (input.status === "on_leave" && input.leaveCategory === "unapproved");
  const status: AttendanceStatus = markingUnapproved ? "on_leave" : input.status;
  const requestedCategory = markingUnapproved
    ? "unapproved"
    : status === "on_leave"
      ? (input.leaveCategory ?? null)
      : null;
  const requestedPay: LeavePay | null | undefined =
    requestedCategory === "unplanned" || requestedCategory === "unapproved" ? "unpaid" : input.leavePay;
  if (status === "on_leave" && requestedPay !== "paid" && requestedPay !== "unpaid") {
    throw new AttendanceError(400, "Choose whether this leave is paid or unpaid");
  }
  const period = await AttendancePeriod.findOne({ monthKey: monthOf(record.attendanceDate) })
    .select("status")
    .lean<{ status?: string } | null>();
  const permission = correctionPermission({
    periodFinalized: period?.status === "finalized",
    role: actor.role,
    status: markingUnapproved ? "absent" : input.status,
    attendanceDate: record.attendanceDate,
    today: istDateKey(new Date()),
  });
  if (!permission.allowed) {
    throw new AttendanceError(403, permission.message ?? "This attendance record cannot be changed");
  }
  const policy = await getOrCreatePolicy();
  let firstLoginAt = record.firstLoginAt ? new Date(record.firstLoginAt) : null;
  if (input.firstLoginTime === null) firstLoginAt = null;
  if (typeof input.firstLoginTime === "string") {
    firstLoginAt = clockOnDate(record.attendanceDate, input.firstLoginTime);
  }
  const leavePay = leavePayForStatus(status, requestedPay ?? null);
  const leaveCategory = leaveCategoryForStatus(status, requestedCategory);
  // Paid planned leave spends the balance. Anything else gives a previously spent day back.
  const employee = await employeeOrThrow(record.employeeId);
  const joiningDate = employeeView(employee).joiningDate;
  const leaveRules = toRules(policy);
  if (leavePay === "paid" && leaveCategory === "planned") {
    await ensureAccruals({
      employeeId: record.employeeId,
      joiningDate,
      policy: leaveRules,
      throughMonth: currentPayrollMonth().key,
    });
  }
  await syncManualLeaveConsumption({
    employeeId: record.employeeId,
    attendanceRecordId: String(record._id),
    attendanceDate: record.attendanceDate,
    wantsPaid: leavePay === "paid" && leaveCategory === "planned",
    actor: { id: actor.id, name: actor.name },
  });
  let isLate = false;
  let lateByMinutes = 0;
  if (firstLoginAt && (status === "present" || status === "half_day")) {
    const late = lateArrival(firstLoginAt, new Date(record.shiftStartAt), policy.graceMinutes);
    isLate = late.isLate;
    lateByMinutes = late.lateByMinutes;
  }
  const anomalyFlags = new Set(record.anomalyFlags ?? []);
  if (status === "on_leave" && firstLoginAt) anomalyFlags.add("leave_with_login");
  else anomalyFlags.delete("leave_with_login");
  const next = {
    status,
    isLate,
    lateByMinutes,
    leavePay,
    leaveCategory,
    firstLoginAt,
    remarks: input.remarks,
    source: "manual" as const,
    isManuallyAdjusted: true,
    anomalyFlags: [...anomalyFlags],
  };
  const updated = (await AttendanceRecord.findByIdAndUpdate(
    record._id,
    { $set: next },
    { new: true },
  ).lean()) as RecordLean | null;
  if (!updated) throw new AttendanceError(404, "Attendance record not found");
  await AttendanceAuditLog.create({
    attendanceRecordId: String(record._id),
    employeeId: record.employeeId,
    attendanceDate: record.attendanceDate,
    changedBy: actor.id,
    changedByName: actor.name,
    oldValues: snapshotValues(record),
    newValues: snapshotValues(updated),
    reason: input.reason,
    approvedBy: permission.requiresApproval ? actor.id : null,
    approvedByName: permission.requiresApproval ? actor.name : null,
  });
  await AttendancePayrollSnapshot.updateMany(
    { employeeId: record.employeeId, monthKey: monthOf(record.attendanceDate) },
    { $set: { payrollStale: true } },
  );
  return cellFromRecord(record.attendanceDate, updated);
}

export async function finalizeAttendanceMonth(monthValue: string, actor: AttendanceActor): Promise<void> {
  const month = requireMonth(monthValue);
  const current = currentPayrollMonth();
  if (month.year * 12 + month.month > current.year * 12 + current.month) {
    throw new AttendanceError(400, "A future month cannot be finalized");
  }
  await reconcileMonth(month);
  const policy = await getOrCreatePolicy();
  const rules = toRules(policy);
  await AttendancePeriod.findOneAndUpdate(
    { monthKey: month.key },
    {
      $set: {
        status: "finalized",
        finalizedAt: new Date(),
        finalizedBy: actor.id,
        finalizedByName: actor.name,
        policySnapshot: {
          policyId: String(policy._id),
          policyName: policy.policyName,
          shiftStart: rules.shiftStart,
          shiftEnd: rules.shiftEnd,
          graceMinutes: rules.graceMinutes,
          weeklyOffDays: rules.weeklyOffDays,
          alternateSaturdayOff: rules.alternateSaturdayOff,
          halfDayLopFactor: rules.halfDayLopFactor,
          lateCreatesLop: rules.lateCreatesLop,
          lateLopFactor: rules.lateLopFactor,
          lateGraceThresholdCount: rules.lateGraceThresholdCount,
          severeLateMinutes: rules.severeLateMinutes,
          cutoffTime: rules.cutoffTime,
          confirmed: rules.confirmed,
        },
      },
    },
    { upsert: true, new: true },
  );
  const dates = datesInPayrollMonth(month);
  const from = dates[0];
  const to = dates[dates.length - 1];
  await AttendanceRecord.updateMany(
    { attendanceDate: { $gte: from, $lte: to }, finalizedAt: null },
    { $set: { finalizedAt: new Date() } },
  );
}

export async function reopenAttendanceMonth(monthValue: string, actor: AttendanceActor): Promise<void> {
  const month = requireMonth(monthValue);
  await connectDb();
  await AttendancePeriod.findOneAndUpdate(
    { monthKey: month.key },
    {
      $set: {
        status: "open",
        reopenedAt: new Date(),
        reopenedBy: actor.id,
      },
    },
    { upsert: true },
  );
}

export async function updateAttendancePolicy(
  input: {
    policyName: string;
    shiftStart: string;
    shiftEnd: string;
    graceMinutes: number;
    weeklyOffDays: number[];
    alternateSaturdayOff: AttendancePolicyRules["alternateSaturdayOff"];
    halfDayLopFactor: number;
    lateCreatesLop: boolean;
    lateLopFactor: number;
    lateGraceThresholdCount: number;
    severeLateMinutes: number;
    cutoffTime: string;
    confirmed: boolean;
    paidLeaveMonthlyAccrual: number;
    paidLeaveCarryForwardCap: number;
    paidLeaveMaxBalance: number;
    unplannedLeaveLopDays: number;
    plannedLeaveMinNoticeDays: number;
    unplannedBackdateDays: number;
  },
  actor: AttendanceActor,
): Promise<PolicyView> {
  await getOrCreatePolicy();
  const weeklyOffDays = [...new Set(input.weeklyOffDays)].sort((left, right) => left - right);
  const current = await AttendancePolicy.findOne({ key: "default" });
  if (!current) throw new AttendanceError(500, "Attendance policy could not be saved");
  current.policyName = input.policyName;
  current.shiftStart = input.shiftStart;
  current.shiftEnd = input.shiftEnd;
  current.graceMinutes = input.graceMinutes;
  current.weeklyOffDays = weeklyOffDays;
  current.alternateSaturdayOff = normalizeAlternateSaturdayOff(input.alternateSaturdayOff);
  current.halfDayLopFactor = input.halfDayLopFactor;
  current.lateCreatesLop = input.lateCreatesLop;
  current.lateLopFactor = input.lateLopFactor;
  current.lateGraceThresholdCount = input.lateGraceThresholdCount;
  current.severeLateMinutes = input.severeLateMinutes;
  current.cutoffTime = input.cutoffTime;
  current.paidLeaveMonthlyAccrual = input.paidLeaveMonthlyAccrual;
  current.paidLeaveCarryForwardCap = input.paidLeaveCarryForwardCap;
  current.paidLeaveMaxBalance = input.paidLeaveMaxBalance;
  current.unplannedLeaveLopDays = input.unplannedLeaveLopDays;
  current.plannedLeaveMinNoticeDays = input.plannedLeaveMinNoticeDays;
  current.unplannedBackdateDays = input.unplannedBackdateDays;
  if (input.confirmed && !current.confirmedAt) {
    current.confirmedAt = new Date();
    current.confirmedBy = actor.id;
  }
  if (!input.confirmed) {
    current.confirmedAt = null;
    current.confirmedBy = null;
  }
  await current.save();
  await reconcileMonth(currentPayrollMonth());
  return toPolicyView(current.toObject() as PolicyLean);
}

export async function getPolicyView(): Promise<{ policy: PolicyView; departments: DepartmentOption[] }> {
  const [policy, departments] = await Promise.all([
    getOrCreatePolicy(),
    Department.find({ isActive: true }).select("name").sort({ name: 1 }).lean<{ _id: mongoose.Types.ObjectId; name: string }[]>(),
  ]);
  return {
    policy: toPolicyView(policy),
    departments: departments.map((department) => ({
      id: String(department._id),
      name: department.name,
    })),
  };
}

export async function listHolidays(): Promise<HolidayView[]> {
  await connectDb();
  const holidays = await CompanyHoliday.find()
    .sort({ date: -1 })
    .limit(400)
    .lean<{ _id: mongoose.Types.ObjectId; date: string; name: string; departmentId?: string | null }[]>();
  const departmentIds = [
    ...new Set(holidays.map((holiday) => holiday.departmentId).filter((id): id is string => Boolean(id))),
  ];
  const departments = departmentIds.length
    ? await Department.find({ _id: { $in: departmentIds } }).select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }[]>()
    : [];
  const names = new Map(departments.map((department) => [String(department._id), department.name]));
  return holidays.map((holiday) => ({
    id: String(holiday._id),
    date: holiday.date,
    name: holiday.name,
    departmentId: holiday.departmentId ?? null,
    departmentName: holiday.departmentId ? names.get(holiday.departmentId) ?? null : null,
  }));
}

export async function createHoliday(input: {
  date: string;
  name: string;
  departmentId?: string | null;
}): Promise<void> {
  if (!isAttendanceDateKey(input.date)) throw new AttendanceError(400, "Invalid holiday date");
  await connectDb();
  const departmentId = input.departmentId?.trim() || null;
  if (departmentId) {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new AttendanceError(400, "Invalid department");
    }
    const department = await Department.findById(departmentId).select("_id");
    if (!department) throw new AttendanceError(400, "Department not found");
  }
  try {
    await CompanyHoliday.create({ date: input.date, name: input.name, departmentId });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AttendanceError(409, "That holiday is already on the calendar");
    }
    throw error;
  }
}

export async function deleteHoliday(id: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AttendanceError(400, "Invalid holiday");
  await connectDb();
  const deleted = await CompanyHoliday.findByIdAndDelete(id);
  if (!deleted) throw new AttendanceError(404, "Holiday not found");
}

export async function listDepartmentShifts(): Promise<DepartmentShiftView[]> {
  await connectDb();
  const [policy, departments, positions, rules] = await Promise.all([
    getOrCreatePolicy(),
    Department.find({ isActive: { $ne: false } }).select("name").sort({ name: 1 }).lean<{ _id: mongoose.Types.ObjectId; name: string }[]>(),
    JobPosition.find({ isActive: { $ne: false } })
      .select("name departmentId")
      .sort({ name: 1 })
      .lean<{ _id: mongoose.Types.ObjectId; name: string; departmentId: mongoose.Types.ObjectId }[]>(),
    AttendanceOrgShift.find()
      .select("departmentId jobPositionId startTime endTime weeklyOffDays")
      .lean<
        {
          departmentId: string;
          jobPositionId?: string | null;
          startTime: string;
          endTime: string;
          weeklyOffDays?: number[];
        }[]
      >(),
  ]);
  const byKey = new Map(rules.map((rule) => [`${rule.departmentId}:${objectIdText(rule.jobPositionId) ?? ""}`, rule]));
  const positionsByDepartment = new Map<string, { id: string; name: string }[]>();
  for (const position of positions) {
    const departmentId = String(position.departmentId);
    const list = positionsByDepartment.get(departmentId) ?? [];
    list.push({ id: String(position._id), name: position.name });
    positionsByDepartment.set(departmentId, list);
  }
  return departments.map((department) => {
    const departmentId = String(department._id);
    const departmentRule = byKey.get(`${departmentId}:`);
    const departmentHours = {
      startTime: departmentRule?.startTime ?? policy.shiftStart,
      endTime: departmentRule?.endTime ?? policy.shiftEnd,
      weeklyOffDays: departmentRule?.weeklyOffDays ?? policy.weeklyOffDays ?? [],
    };
    return {
      departmentId,
      departmentName: department.name,
      ...departmentHours,
      saved: Boolean(departmentRule),
      positions: (positionsByDepartment.get(departmentId) ?? []).map((position) => {
        const positionRule = byKey.get(`${departmentId}:${position.id}`);
        return {
          jobPositionId: position.id,
          name: position.name,
          startTime: positionRule?.startTime ?? departmentHours.startTime,
          endTime: positionRule?.endTime ?? departmentHours.endTime,
          weeklyOffDays: positionRule?.weeklyOffDays ?? departmentHours.weeklyOffDays,
          saved: Boolean(positionRule),
        };
      }),
    };
  });
}

async function requireDepartmentPosition(departmentId: string, jobPositionId: string | null): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(departmentId)) {
    throw new AttendanceError(400, "Invalid department");
  }
  const department = await Department.findById(departmentId).select("_id");
  if (!department) throw new AttendanceError(404, "Department not found");
  if (!jobPositionId) return;
  if (!mongoose.Types.ObjectId.isValid(jobPositionId)) {
    throw new AttendanceError(400, "Invalid designation");
  }
  const position = await JobPosition.findById(jobPositionId).select("departmentId");
  if (!position || String(position.departmentId) !== departmentId) {
    throw new AttendanceError(400, "That designation is not in this department");
  }
}

export async function saveDepartmentShift(input: {
  departmentId: string;
  jobPositionId?: string | null;
  startTime: string;
  endTime: string;
  weeklyOffDays: number[];
}): Promise<void> {
  await connectDb();
  const jobPositionId = input.jobPositionId ?? null;
  await requireDepartmentPosition(input.departmentId, jobPositionId);
  const weeklyOffDays = [...new Set(input.weeklyOffDays)].sort((left, right) => left - right);
  try {
    await AttendanceOrgShift.updateOne(
      { departmentId: input.departmentId, jobPositionId },
      {
        $set: {
          startTime: input.startTime,
          endTime: input.endTime,
          weeklyOffDays,
        },
        $setOnInsert: {
          departmentId: input.departmentId,
          jobPositionId,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AttendanceError(409, "That shift was just saved. Refresh and try again.");
    }
    throw error;
  }
}

export async function clearDepartmentShift(departmentId: string, jobPositionId: string): Promise<void> {
  await connectDb();
  const positionId = /^[a-f\d]{24}$/i.test(jobPositionId) ? jobPositionId : null;
  await requireDepartmentPosition(departmentId, positionId);
  await AttendanceOrgShift.deleteOne({ departmentId, jobPositionId: positionId });
}

export async function listShifts(): Promise<ShiftView[]> {
  await connectDb();
  const shifts = await EmployeeShiftAssignment.find()
    .sort({ effectiveFrom: -1 })
    .limit(100)
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        employeeId: string;
        startTime: string;
        endTime: string;
        weeklyOffDays: number[];
        effectiveFrom: string;
        effectiveTo?: string | null;
      }[]
    >();
  const employees = shifts.length
    ? ((await Employees.find({ _id: { $in: shifts.map((shift) => shift.employeeId) } })
        .select("name employeeCode")
        .lean()) as { _id: mongoose.Types.ObjectId; name?: string; employeeCode?: string | null }[])
    : [];
  const names = new Map(
    employees.map((employee) => [
      String(employee._id),
      { name: employee.name?.trim() || "Unnamed employee", employeeCode: employee.employeeCode?.trim() || null },
    ]),
  );
  return shifts.map((shift) => {
    const employee = names.get(shift.employeeId);
    return {
      id: String(shift._id),
      employeeId: shift.employeeId,
      employeeName: employee?.name ?? "Unknown employee",
      employeeCode: employee?.employeeCode ?? null,
      startTime: shift.startTime,
      endTime: shift.endTime,
      weeklyOffDays: shift.weeklyOffDays ?? [],
      effectiveFrom: shift.effectiveFrom,
      effectiveTo: shift.effectiveTo ?? null,
    };
  });
}

export async function createShift(input: {
  employeeCode: string;
  startTime: string;
  endTime: string;
  weeklyOffDays: number[];
  effectiveFrom: string;
  effectiveTo?: string | null;
}): Promise<void> {
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    throw new AttendanceError(400, "Shift end date is before the start date");
  }
  await connectDb();
  const needle = input.employeeCode.trim();
  const employee = (await Employees.findOne({
    $or: [
      { employeeCode: needle },
      { email: { $regex: `^${escapeRegex(needle)}$`, $options: "i" } },
    ],
  })
    .select("_id")
    .lean()) as { _id: mongoose.Types.ObjectId } | null;
  if (!employee) throw new AttendanceError(404, "Employee not found");
  await EmployeeShiftAssignment.create({
    employeeId: String(employee._id),
    startTime: input.startTime,
    endTime: input.endTime,
    weeklyOffDays: [...new Set(input.weeklyOffDays)].sort((left, right) => left - right),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
  });
}

export function attendanceCsv(rows: AttendanceEmployeeRow[], dates: string[]): string {
  const headers = [
    "Employee Code",
    "Name",
    "Email",
    "Department",
    "Designation",
    "Working Days",
    "Present",
    "Unapproved leave",
    "Half Days",
    "Paid Leave",
    "Unpaid Leave",
    "Holidays",
    "Weekly Offs",
    "Late",
    "LOP",
    "Attendance %",
    "Corrected Days",
    ...dates,
    "Check-in / Check-out",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    const corrected = row.days.filter((day) => day.isManuallyAdjusted).length;
    const logins = row.days
      .filter((day) => day.firstLoginLabel || day.lastLogoutLabel)
      .map((day) => {
        const inn = day.firstLoginLabel
          ? `in ${day.firstLoginLabel}${day.checkInDevice ? ` (${day.checkInDevice})` : ""}`
          : "in —";
        const out = day.lastLogoutLabel
          ? `out ${day.lastLogoutLabel}${day.checkOutDevice ? ` (${day.checkOutDevice})` : ""}`
          : "out —";
        return `${day.date} ${inn} / ${out}`;
      })
      .join("; ");
    const values = [
      row.employeeCode ?? "",
      row.name,
      row.email,
      row.department,
      row.designation,
      row.summary.scheduledWorkingDays,
      row.summary.presentDays,
      row.summary.absentDays,
      row.summary.halfDays,
      row.summary.paidLeaveDays,
      row.summary.unpaidLeaveDays,
      row.summary.holidays,
      row.summary.weeklyOffs,
      row.summary.lateArrivals,
      row.summary.lopDays,
      row.summary.attendancePercentage,
      corrected,
      ...dates.map((date) => row.days.find((day) => day.date === date)?.letter || "-"),
      logins,
    ];
    lines.push(values.map((value) => csvCell(value)).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function exportAttendanceCsv(
  filters: Omit<MonthFilters, "page">,
  actor: AttendanceActor,
): Promise<string> {
  const scope = await resolveAttendanceReadScope(actor);
  const loaded = await loadMonthRows({
    ...filters,
    employeeIds: scope.kind === "team" ? scope.employeeIds : undefined,
  });
  const visible = loaded.rows.filter((row) => matchesCard(row, filters.card, loaded.asOfDate));
  return attendanceCsv(visible, loaded.dates);
}

export type AttendancePayrollCounts = {
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  unplannedLeaveDays: number;
  holidays: number;
  weeklyOffs: number;
  notJoinedDays: number;
  lopDays: number;
  pendingVerification: number;
  hasRecords: boolean;
};

export async function attendancePayrollForEmployees(
  employeeIds: string[],
  month: PayrollMonth,
): Promise<{ policyConfirmed: boolean; byEmployee: Map<string, AttendancePayrollCounts> }> {
  const ids = [...new Set(employeeIds)].filter((id) => id.length > 0);
  if (ids.length === 0) {
    return { policyConfirmed: true, byEmployee: new Map() };
  }

  await connectDb();
  const period = await AttendancePeriod.findOne({ monthKey: month.key })
    .select("status")
    .lean<{ status?: string } | null>();
  if (period?.status !== "finalized") {
    try {
      await reconcileMonth(month);
    } catch (error) {
      console.error("salary attendance reconcile", error);
    }
  }

  const dates = datesInPayrollMonth(month);
  const from = dates[0] ?? `${month.key}-01`;
  const to = dates[dates.length - 1] ?? from;
  const [records, policy] = await Promise.all([
    AttendanceRecord.find({
      employeeId: { $in: ids },
      attendanceDate: { $gte: from, $lte: to },
    })
      .select("employeeId status leavePay leaveCategory isLate")
      .lean<
        {
          employeeId: string;
          status: AttendanceStatus;
          leavePay?: LeavePay | null;
          leaveCategory?: RecordLeaveCategory | null;
          isLate?: boolean;
        }[]
      >(),
    getOrCreatePolicy(),
  ]);

  const rules = toRules(policy);
  const grouped = new Map<string, DayContribution[]>();
  for (const record of records) {
    const days = grouped.get(record.employeeId) ?? [];
    days.push({
      status: record.status,
      leavePay: record.leavePay ?? null,
      leaveCategory: leaveCategoryForStatus(record.status, record.leaveCategory ?? null),
      isLate: Boolean(record.isLate),
    });
    grouped.set(record.employeeId, days);
  }

  const byEmployee = new Map<string, AttendancePayrollCounts>();
  for (const id of ids) {
    const days = grouped.get(id) ?? [];
    const summary = summarizeAttendance(days, rules);
    byEmployee.set(id, {
      presentDays: summary.presentDays + summary.workFromHomeDays,
      halfDays: summary.halfDays,
      paidLeaveDays: summary.paidLeaveDays,
      unpaidLeaveDays: summary.unpaidLeaveDays,
      unplannedLeaveDays: summary.unplannedLeaveDays,
      holidays: summary.holidays,
      weeklyOffs: summary.weeklyOffs,
      notJoinedDays: summary.notJoinedDays,
      lopDays: summary.lopDays,
      pendingVerification: summary.pendingVerification,
      hasRecords: days.length > 0,
    });
  }

  return { policyConfirmed: Boolean(policy.confirmedAt), byEmployee };
}

export async function getEmployeeLop(employeeId: string, monthValue: string): Promise<LopLookup> {
  const month = requireMonth(monthValue);
  await employeeOrThrow(employeeId);
  const period = await AttendancePeriod.findOne({ monthKey: month.key }).select("status").lean<{ status?: string } | null>();
  if (period?.status !== "finalized") await reconcileMonth(month);
  const dates = datesInPayrollMonth(month);
  const from = dates[0] ?? `${month.key}-01`;
  const to = dates[dates.length - 1] ?? from;
  const [records, policy, snapshot] = await Promise.all([
    AttendanceRecord.find({ employeeId, attendanceDate: { $gte: from, $lte: to } })
      .select("status leavePay leaveCategory isLate")
      .lean<
        {
          status: AttendanceStatus;
          leavePay?: LeavePay | null;
          leaveCategory?: RecordLeaveCategory | null;
          isLate?: boolean;
        }[]
      >(),
    getOrCreatePolicy(),
    AttendancePayrollSnapshot.findOne({ employeeId, monthKey: month.key })
      .sort({ createdAt: -1 })
      .lean<{ lossOfPayDays: number; payrollStale?: boolean; slipNumber: string; createdAt?: Date } | null>(),
  ]);
  const summary = summarizeAttendance(
    records.map((record) => ({
      status: record.status,
      leavePay: record.leavePay ?? null,
      leaveCategory: leaveCategoryForStatus(record.status, record.leaveCategory ?? null),
      isLate: Boolean(record.isLate),
    })),
    toRules(policy),
  );
  return {
    lossOfPayDays: summary.lopDays,
    breakdown: summary.lopBreakdown,
    paidLeaveDays: summary.paidLeaveDays,
    unplannedLeaveDays: summary.unplannedLeaveDays,
    policyConfirmed: Boolean(policy.confirmedAt),
    periodStatus: period?.status === "finalized" ? "finalized" : "open",
    lastSlip: snapshot
      ? {
          lossOfPayDays: snapshot.lossOfPayDays,
          payrollStale: Boolean(snapshot.payrollStale),
          slipNumber: snapshot.slipNumber,
          createdAt: snapshot.createdAt ? new Date(snapshot.createdAt).toISOString() : "",
        }
      : null,
  };
}

export async function recordPayrollSnapshot(input: {
  employeeId: string;
  monthKey: string;
  lossOfPayDays: number;
  slipNumber: string;
  generatedBy: string | null;
}): Promise<void> {
  await connectDb();
  const policy = await AttendancePolicy.findOne({ key: "default" }).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>();
  const records = await AttendanceRecord.find({
    employeeId: input.employeeId,
    attendanceDate: { $gte: `${input.monthKey}-01`, $lte: `${input.monthKey}-31` },
  })
    .select("_id")
    .lean<{ _id: mongoose.Types.ObjectId }[]>();
  await AttendancePayrollSnapshot.create({
    employeeId: input.employeeId,
    monthKey: input.monthKey,
    lossOfPayDays: input.lossOfPayDays,
    policyId: policy ? String(policy._id) : null,
    attendanceRecordIds: records.map((record) => String(record._id)),
    slipNumber: input.slipNumber,
    generatedBy: input.generatedBy,
    payrollStale: false,
  });
}
