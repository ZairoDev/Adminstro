import mongoose, { type AnyBulkWriteOperation } from "mongoose";
import AttendanceAuditLog from "@/models/attendanceAuditLog";
import AttendancePayrollSnapshot from "@/models/attendancePayrollSnapshot";
import AttendancePeriod from "@/models/attendancePeriod";
import AttendanceRecord from "@/models/attendanceRecord";
import CompanyHoliday from "@/models/companyHoliday";
import EmployeeShiftAssignment from "@/models/employeeShiftAssignment";
import Employees from "@/models/employee";
import LeaveRequest from "@/models/leaveRequest";
import { canCorrectAttendance, type AttendanceActor } from "@/modules/attendance/access";
import { resolveWorkShift, roundLop } from "@/modules/attendance/calculate";
import { formatAttendanceDate, istDateKey, shiftWindow } from "@/modules/attendance/dates";
import { AttendanceError } from "@/modules/attendance/errors";
import {
  classifyLeaveDay,
  enumerateLeaveDates,
  lopForLeaveDays,
  monthKeyOf,
  rangesOverlap,
  splitLeaveDays,
  validateLeaveWindow,
} from "@/modules/attendance/leave/calculate";
import {
  ensureAccruals,
  getLedgerBalance,
  listLedgerEntries,
  postBalanceAdjustment,
  postLeaveConsumption,
  reverseLeaveConsumption,
  syncManualLeaveConsumption,
} from "@/modules/attendance/leave/ledger";
import type {
  LeaveApplyInput,
  LeaveBalanceAdjustInput,
  LeaveDecisionInput,
  LeaveListQuery,
  LeaveRangeInput,
} from "@/modules/attendance/leave/schema";
import {
  MAX_LEAVE_RANGE_DAYS,
  type LeaveBalanceView,
  type LeaveDay,
  type LeaveListPayload,
  type LeavePreview,
  type LeaveRequestStatus,
  type LeaveRequestView,
  type SkippedLeaveDay,
} from "@/modules/attendance/leave/types";
import {
  employeeOrThrow,
  employeeView,
  getOrCreatePolicy,
  loadWorkShiftContext,
  orgIdsForEmployee,
  reconcileRange,
  toRules,
  type EmployeeLean,
  type RecordLean,
} from "@/modules/attendance/service";
import type {
  AttendancePolicyRules,
  LeaveCategory,
  ShiftAssignmentRange,
  ShiftChoice,
} from "@/modules/attendance/types";
import { notifyLeaveEvent } from "@/modules/attendance/notices/service";
import { currentPayrollMonth } from "@/modules/finance/salary-month";
import { connectDb } from "@/util/db";
import { TEST_SUPERADMIN_EMAIL } from "@/util/employeeConstants";

type LeaveRequestLean = {
  _id: mongoose.Types.ObjectId;
  employeeId: string;
  leaveType: LeaveCategory;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveRequestStatus;
  workingDayCount: number;
  days: LeaveDay[];
  paidDays: number;
  unpaidDays: number;
  lopDays: number;
  requestedBy: string;
  requestedByName?: string;
  decidedBy?: string | null;
  decidedByName?: string | null;
  decidedAt?: Date | null;
  decisionNote?: string;
  createdAt?: Date;
};

type RangeClassification = {
  workingDays: string[];
  skippedDays: SkippedLeaveDay[];
  shiftByDate: Map<string, ShiftChoice>;
};

function isLeaveManager(actor: AttendanceActor): boolean {
  return canCorrectAttendance(actor.role);
}

function isSuperAdmin(actor: AttendanceActor): boolean {
  return actor.role === "SuperAdmin";
}

function ledgerActor(actor: AttendanceActor): { id: string; name: string } {
  return { id: actor.id, name: actor.name };
}

function requireObjectId(value: string, label: string): void {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new AttendanceError(400, `Invalid ${label}`);
}

function monthsInRange(from: string, to: string): string[] {
  return [...new Set(enumerateLeaveDates(from, to).map(monthKeyOf))];
}

/** Anything that touches a finalized month is reserved for a super admin. */
async function assertMonthsOpen(monthKeys: string[], actor: AttendanceActor): Promise<void> {
  if (isSuperAdmin(actor) || monthKeys.length === 0) return;
  const finalized = await AttendancePeriod.findOne({
    monthKey: { $in: monthKeys },
    status: "finalized",
  })
    .select("monthKey")
    .lean<{ monthKey: string } | null>();
  if (finalized) {
    throw new AttendanceError(
      403,
      "This month is finalized. Only a super admin can change leave in it",
    );
  }
}

async function markPayrollStale(employeeId: string, monthKeys: string[]): Promise<void> {
  if (monthKeys.length === 0) return;
  await AttendancePayrollSnapshot.updateMany(
    { employeeId, monthKey: { $in: monthKeys } },
    { $set: { payrollStale: true } },
  );
}

function datesUsable(input: { fromDate: string; toDate: string }): boolean {
  if (input.fromDate > input.toDate) return false;
  return enumerateLeaveDates(input.fromDate, input.toDate).length <= MAX_LEAVE_RANGE_DAYS;
}

/** Splits a date range into days that can carry leave and days that cannot. */
async function classifyRange(
  employee: EmployeeLean,
  from: string,
  to: string,
  rules: AttendancePolicyRules,
): Promise<RangeClassification> {
  const employeeId = String(employee._id);
  const profile = employeeView(employee);
  const [holidays, personalShifts, workShifts] = await Promise.all([
    CompanyHoliday.find({ date: { $gte: from, $lte: to } })
      .select("date departmentId")
      .lean<{ date: string; departmentId?: string | null }[]>(),
    EmployeeShiftAssignment.find({ employeeId })
      .select("startTime endTime weeklyOffDays effectiveFrom effectiveTo")
      .lean<ShiftAssignmentRange[]>(),
    loadWorkShiftContext(),
  ]);
  const holidayMarks = holidays.map((holiday) => ({
    date: holiday.date,
    departmentId: holiday.departmentId ?? null,
  }));
  const org = orgIdsForEmployee(profile, workShifts);
  const now = new Date();
  const workingDays: string[] = [];
  const skippedDays: SkippedLeaveDay[] = [];
  const shiftByDate = new Map<string, ShiftChoice>();
  for (const date of enumerateLeaveDates(from, to)) {
    const shift = resolveWorkShift({
      date,
      policy: rules,
      personalShifts,
      departmentId: org.departmentId,
      jobPositionId: org.jobPositionId,
      departmentShifts: workShifts.departmentShifts,
      positionShifts: workShifts.positionShifts,
    });
    shiftByDate.set(date, shift);
    const kind = classifyLeaveDay({
      attendanceDate: date,
      now,
      policy: rules,
      joiningDate: profile.joiningDate,
      exitDate: profile.exitDate,
      departmentId: profile.departmentId,
      holidays: holidayMarks,
      shift,
    });
    if (kind === "working") workingDays.push(date);
    else skippedDays.push({ date, reason: kind });
  }
  return { workingDays, skippedDays, shiftByDate };
}

async function paidBalanceFor(
  employee: EmployeeLean,
  rules: AttendancePolicyRules,
): Promise<number> {
  const employeeId = String(employee._id);
  await ensureAccruals({
    employeeId,
    joiningDate: employeeView(employee).joiningDate,
    policy: rules,
    throughMonth: currentPayrollMonth().key,
  });
  return getLedgerBalance(employeeId);
}

function resolveTargetEmployeeId(
  requested: string | undefined,
  actor: AttendanceActor,
): string {
  const targetId = requested ?? actor.id;
  if (targetId !== actor.id && !isLeaveManager(actor)) {
    throw new AttendanceError(403, "You can only manage your own leave");
  }
  return targetId;
}

export async function previewLeave(
  input: LeaveRangeInput,
  actor: AttendanceActor,
): Promise<LeavePreview> {
  await connectDb();
  const employeeId = resolveTargetEmployeeId(input.employeeId, actor);
  const employee = await employeeOrThrow(employeeId);
  const policy = await getOrCreatePolicy();
  const rules = toRules(policy);
  const balance = await paidBalanceFor(employee, rules);
  const window = validateLeaveWindow({
    leaveType: input.leaveType,
    fromDate: input.fromDate,
    toDate: input.toDate,
    today: istDateKey(new Date()),
    exempt: isLeaveManager(actor),
    policy: rules,
  });
  const base: LeavePreview = {
    leaveType: input.leaveType,
    fromDate: input.fromDate,
    toDate: input.toDate,
    workingDays: [],
    skippedDays: [],
    paidDays: 0,
    unpaidDays: 0,
    lopDays: 0,
    balance,
    noticeOk: window.ok,
    message: window.ok ? null : window.message,
  };
  if (!datesUsable(input)) return base;
  const classified = await classifyRange(employee, input.fromDate, input.toDate, rules);
  const split = splitLeaveDays({
    workingDays: classified.workingDays,
    category: input.leaveType,
    balance,
    unplannedLopDays: rules.unplannedLeaveLopDays,
  });
  return {
    ...base,
    workingDays: classified.workingDays,
    skippedDays: classified.skippedDays,
    paidDays: split.paidDays,
    unpaidDays: split.unpaidDays,
    lopDays: split.lopDays,
    message:
      base.message ?? (classified.workingDays.length === 0 ? "No working days fall in this range" : null),
  };
}

async function employeeSummaries(
  ids: string[],
): Promise<Map<string, { name: string; employeeCode: string | null; department: string }>> {
  const valid = [...new Set(ids)].filter((id) => mongoose.Types.ObjectId.isValid(id));
  const rows = valid.length
    ? await Employees.find({ _id: { $in: valid } })
        .select("name employeeCode department")
        .lean<{ _id: mongoose.Types.ObjectId; name?: string; employeeCode?: string | null; department?: string }[]>()
    : [];
  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        name: row.name?.trim() || "Unnamed employee",
        employeeCode: row.employeeCode?.trim() || null,
        department: row.department?.trim() || "",
      },
    ]),
  );
}

function canCancelRequest(request: LeaveRequestLean, actor: AttendanceActor, today: string): boolean {
  if (request.status === "pending") {
    return isLeaveManager(actor) || request.employeeId === actor.id || request.requestedBy === actor.id;
  }
  if (request.status !== "approved") return false;
  if (isLeaveManager(actor)) return request.toDate >= today;
  return request.employeeId === actor.id && request.fromDate > today;
}

function toRequestView(
  request: LeaveRequestLean,
  people: Map<string, { name: string; employeeCode: string | null; department: string }>,
  actor: AttendanceActor,
  today: string,
): LeaveRequestView {
  const person = people.get(request.employeeId) ?? {
    name: "Unknown employee",
    employeeCode: null,
    department: "",
  };
  return {
    id: String(request._id),
    employee: { id: request.employeeId, ...person },
    leaveType: request.leaveType,
    fromDate: request.fromDate,
    toDate: request.toDate,
    fromLabel: formatAttendanceDate(request.fromDate),
    toLabel: formatAttendanceDate(request.toDate),
    reason: request.reason,
    status: request.status,
    workingDayCount: request.workingDayCount,
    paidDays: request.paidDays,
    unpaidDays: request.unpaidDays,
    lopDays: request.lopDays,
    days: request.days ?? [],
    requestedByName: request.requestedByName || "Unknown user",
    decidedByName: request.decidedByName ?? null,
    decidedAt: request.decidedAt ? new Date(request.decidedAt).toISOString() : null,
    decisionNote: request.decisionNote ?? "",
    createdAt: request.createdAt ? new Date(request.createdAt).toISOString() : "",
    canCancel: canCancelRequest(request, actor, today),
    canDecide:
      request.status === "pending" &&
      isLeaveManager(actor) &&
      (request.employeeId !== actor.id || isSuperAdmin(actor)),
  };
}

async function viewFor(request: LeaveRequestLean, actor: AttendanceActor): Promise<LeaveRequestView> {
  const people = await employeeSummaries([request.employeeId]);
  return toRequestView(request, people, actor, istDateKey(new Date()));
}

async function loadRequest(id: string): Promise<LeaveRequestLean> {
  requireObjectId(id, "leave request");
  await connectDb();
  const request = await LeaveRequest.findById(id).lean<LeaveRequestLean | null>();
  if (!request) throw new AttendanceError(404, "Leave request not found");
  return request;
}

function assertCanView(request: LeaveRequestLean, actor: AttendanceActor): void {
  if (request.employeeId !== actor.id && !isLeaveManager(actor)) {
    throw new AttendanceError(403, "You can only view your own leave");
  }
}

export async function getLeaveRequest(id: string, actor: AttendanceActor): Promise<LeaveRequestView> {
  const request = await loadRequest(id);
  assertCanView(request, actor);
  return viewFor(request, actor);
}

export async function applyLeave(
  input: LeaveApplyInput,
  actor: AttendanceActor,
): Promise<LeaveRequestView> {
  await connectDb();
  const employeeId = resolveTargetEmployeeId(input.employeeId, actor);
  const onBehalf = employeeId !== actor.id;
  if (input.approveNow && !(onBehalf && isLeaveManager(actor))) {
    throw new AttendanceError(403, "Only HR or an admin can approve leave they file for someone else");
  }
  const employee = await employeeOrThrow(employeeId);
  const policy = await getOrCreatePolicy();
  const rules = toRules(policy);
  const window = validateLeaveWindow({
    leaveType: input.leaveType,
    fromDate: input.fromDate,
    toDate: input.toDate,
    today: istDateKey(new Date()),
    exempt: isLeaveManager(actor),
    policy: rules,
  });
  if (!window.ok) throw new AttendanceError(400, window.message);
  await assertMonthsOpen(monthsInRange(input.fromDate, input.toDate), actor);

  const overlapping = await LeaveRequest.find({
    employeeId,
    status: { $in: ["pending", "approved"] },
    fromDate: { $lte: input.toDate },
    toDate: { $gte: input.fromDate },
  })
    .select("fromDate toDate")
    .lean<{ fromDate: string; toDate: string }[]>();
  if (overlapping.some((item) => rangesOverlap(item, input))) {
    throw new AttendanceError(409, "This employee already has leave requested for some of these dates");
  }

  const classified = await classifyRange(employee, input.fromDate, input.toDate, rules);
  if (classified.workingDays.length === 0) {
    throw new AttendanceError(400, "No working days fall in this range");
  }
  const created = await LeaveRequest.create({
    employeeId,
    leaveType: input.leaveType,
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: input.reason,
    status: "pending",
    workingDayCount: classified.workingDays.length,
    requestedBy: actor.id,
    requestedByName: actor.name,
  });
  if (input.approveNow) {
    return decideLeave(String(created._id), { decision: "approve", note: "Approved when filed" }, actor);
  }
  await notifyLeaveEvent({
    event: "requested",
    leaveId: String(created._id),
    employeeId,
    actorId: actor.id,
    fromDate: input.fromDate,
    toDate: input.toDate,
    leaveType: input.leaveType,
  });
  return viewFor(created.toObject() as LeaveRequestLean, actor);
}

type ExistingRecord = Pick<
  RecordLean,
  "_id" | "attendanceDate" | "status" | "isLate" | "lateByMinutes" | "leavePay" | "firstLoginAt" | "remarks"
> & { leaveRequestId?: string | null };

function auditSnapshot(record: ExistingRecord | null) {
  if (!record) {
    return { status: "not_recorded", isLate: false, lateByMinutes: 0, leavePay: null, firstLoginAt: null, remarks: "" };
  }
  return {
    status: record.status,
    isLate: Boolean(record.isLate),
    lateByMinutes: record.lateByMinutes ?? 0,
    leavePay: record.leavePay ?? null,
    firstLoginAt: record.firstLoginAt ? new Date(record.firstLoginAt) : null,
    remarks: record.remarks ?? "",
  };
}

/** Writes the approved days onto the attendance sheet. Existing rows for those dates are replaced. */
async function writeLeaveRecords(input: {
  request: LeaveRequestLean;
  days: LeaveDay[];
  shiftByDate: Map<string, ShiftChoice>;
  actor: AttendanceActor;
}): Promise<void> {
  const { request, days, shiftByDate, actor } = input;
  const employeeId = request.employeeId;
  const dates = days.map((day) => day.date);
  const existing = await AttendanceRecord.find({ employeeId, attendanceDate: { $in: dates } })
    .select("attendanceDate status isLate lateByMinutes leavePay firstLoginAt remarks leaveRequestId")
    .lean<ExistingRecord[]>();
  const existingByDate = new Map(existing.map((record) => [record.attendanceDate, record]));

  // A day that earlier spent paid balance by hand must give it back before the request owns it.
  for (const record of existing) {
    if (record.status === "on_leave") {
      await syncManualLeaveConsumption({
        employeeId,
        attendanceRecordId: String(record._id),
        attendanceDate: record.attendanceDate,
        wantsPaid: false,
        actor: ledgerActor(actor),
      });
    }
  }

  const remarks = request.leaveType === "unplanned" ? "Unplanned leave" : "Planned leave";
  const operations: AnyBulkWriteOperation[] = days.map((day) => {
    const shift = shiftByDate.get(day.date);
    if (!shift) throw new AttendanceError(500, "A shift could not be resolved for a leave day");
    const window = shiftWindow(day.date, shift.startTime, shift.endTime);
    const hasLogin = Boolean(existingByDate.get(day.date)?.firstLoginAt);
    return {
      updateOne: {
        filter: { employeeId, attendanceDate: day.date },
        update: {
          $set: {
            status: "on_leave",
            leavePay: day.pay,
            leaveCategory: day.category,
            leaveRequestId: String(request._id),
            isLate: false,
            lateByMinutes: 0,
            shiftStartAt: window.start,
            shiftEndAt: window.end,
            source: "leave",
            isManuallyAdjusted: false,
            remarks,
            anomalyFlags: hasLogin ? ["leave_with_login"] : [],
          },
          $setOnInsert: { employeeId, attendanceDate: day.date },
        },
        upsert: true,
      },
    };
  });
  await AttendanceRecord.bulkWrite(operations, { ordered: false });

  const written = await AttendanceRecord.find({ employeeId, attendanceDate: { $in: dates } })
    .select("attendanceDate status isLate lateByMinutes leavePay firstLoginAt remarks leaveRequestId")
    .lean<ExistingRecord[]>();
  await AttendanceAuditLog.insertMany(
    written.map((record) => ({
      attendanceRecordId: String(record._id),
      employeeId,
      attendanceDate: record.attendanceDate,
      changedBy: actor.id,
      changedByName: actor.name,
      oldValues: auditSnapshot(existingByDate.get(record.attendanceDate) ?? null),
      newValues: auditSnapshot(record),
      reason: `Leave request approved (${request.leaveType})`,
      approvedBy: actor.id,
      approvedByName: actor.name,
    })),
  );
}

async function removeLeaveRecords(input: {
  request: LeaveRequestLean;
  fromDate: string | null;
  actor: AttendanceActor;
  reason: string;
}): Promise<string[]> {
  const requestId = String(input.request._id);
  const filter: mongoose.FilterQuery<RecordLean> = { leaveRequestId: requestId };
  if (input.fromDate) filter.attendanceDate = { $gte: input.fromDate };
  const records = await AttendanceRecord.find(filter)
    .select("attendanceDate status isLate lateByMinutes leavePay firstLoginAt remarks leaveRequestId")
    .lean<ExistingRecord[]>();
  if (records.length === 0) return [];
  await AttendanceAuditLog.insertMany(
    records.map((record) => ({
      attendanceRecordId: String(record._id),
      employeeId: input.request.employeeId,
      attendanceDate: record.attendanceDate,
      changedBy: input.actor.id,
      changedByName: input.actor.name,
      oldValues: auditSnapshot(record),
      newValues: auditSnapshot(null),
      reason: input.reason,
      approvedBy: input.actor.id,
      approvedByName: input.actor.name,
    })),
  );
  await AttendanceRecord.deleteMany({ _id: { $in: records.map((record) => record._id) } });
  return records.map((record) => record.attendanceDate).sort();
}

async function approveRequest(
  claimed: LeaveRequestLean,
  actor: AttendanceActor,
): Promise<LeaveRequestLean> {
  const employee = await employeeOrThrow(claimed.employeeId);
  const policy = await getOrCreatePolicy();
  const rules = toRules(policy);
  const classified = await classifyRange(employee, claimed.fromDate, claimed.toDate, rules);
  if (classified.workingDays.length === 0) {
    throw new AttendanceError(400, "No working days fall in this range any more");
  }
  const balance =
    claimed.leaveType === "planned" ? await paidBalanceFor(employee, rules) : 0;
  const split = splitLeaveDays({
    workingDays: classified.workingDays,
    category: claimed.leaveType,
    balance,
    unplannedLopDays: rules.unplannedLeaveLopDays,
  });
  const requestId = String(claimed._id);
  for (const day of split.days) {
    if (day.pay === "paid") {
      await postLeaveConsumption({
        employeeId: claimed.employeeId,
        leaveRequestId: requestId,
        date: day.date,
        actor: ledgerActor(actor),
      });
    }
  }
  await writeLeaveRecords({ request: claimed, days: split.days, shiftByDate: classified.shiftByDate, actor });
  await markPayrollStale(claimed.employeeId, monthsInRange(claimed.fromDate, claimed.toDate));
  const updated = await LeaveRequest.findByIdAndUpdate(
    claimed._id,
    {
      $set: {
        days: split.days,
        workingDayCount: split.days.length,
        paidDays: split.paidDays,
        unpaidDays: split.unpaidDays,
        lopDays: split.lopDays,
      },
    },
    { new: true },
  ).lean<LeaveRequestLean | null>();
  if (!updated) throw new AttendanceError(404, "Leave request not found");
  return updated;
}

export async function decideLeave(
  id: string,
  input: LeaveDecisionInput,
  actor: AttendanceActor,
): Promise<LeaveRequestView> {
  if (!isLeaveManager(actor)) throw new AttendanceError(403, "Leave approval access required");
  const request = await loadRequest(id);
  if (request.status !== "pending") {
    throw new AttendanceError(409, `This request is already ${request.status}`);
  }
  if (request.employeeId === actor.id && !isSuperAdmin(actor)) {
    throw new AttendanceError(403, "You cannot decide your own leave request");
  }
  const decision = {
    decidedBy: actor.id,
    decidedByName: actor.name,
    decidedAt: new Date(),
    decisionNote: input.note,
  };

  if (input.decision === "reject") {
    const rejected = await LeaveRequest.findOneAndUpdate(
      { _id: request._id, status: "pending" },
      { $set: { status: "rejected", ...decision } },
      { new: true },
    ).lean<LeaveRequestLean | null>();
    if (!rejected) throw new AttendanceError(409, "This request was already decided");
    await notifyLeaveEvent({
      event: "rejected",
      leaveId: String(rejected._id),
      employeeId: rejected.employeeId,
      actorId: actor.id,
      fromDate: rejected.fromDate,
      toDate: rejected.toDate,
      leaveType: rejected.leaveType,
    });
    return viewFor(rejected, actor);
  }

  await assertMonthsOpen(monthsInRange(request.fromDate, request.toDate), actor);
  // The status flip is the lock. Only one approval can win it, so ledger entries post once.
  const claimed = await LeaveRequest.findOneAndUpdate(
    { _id: request._id, status: "pending" },
    { $set: { status: "approved", ...decision } },
    { new: true },
  ).lean<LeaveRequestLean | null>();
  if (!claimed) throw new AttendanceError(409, "This request was already decided");
  let view: LeaveRequestView;
  try {
    const approved = await approveRequest(claimed, actor);
    view = await viewFor(approved, actor);
  } catch (error) {
    await reverseLeaveConsumption({
      leaveRequestId: String(claimed._id),
      actor: ledgerActor(actor),
      reason: "Approval failed and was rolled back",
    });
    await removeLeaveRecords({
      request: claimed,
      fromDate: null,
      actor,
      reason: "Approval failed and was rolled back",
    });
    await LeaveRequest.updateOne(
      { _id: claimed._id },
      {
        $set: { status: "pending", days: [], paidDays: 0, unpaidDays: 0, lopDays: 0 },
        $unset: { decidedBy: "", decidedByName: "", decidedAt: "" },
      },
    );
    throw error;
  }
  await notifyLeaveEvent({
    event: "approved",
    leaveId: view.id,
    employeeId: view.employee.id,
    actorId: actor.id,
    fromDate: view.fromDate,
    toDate: view.toDate,
    leaveType: view.leaveType,
  });
  return view;
}

export async function cancelLeave(id: string, actor: AttendanceActor): Promise<LeaveRequestView> {
  const request = await loadRequest(id);
  const today = istDateKey(new Date());
  if (!canCancelRequest(request, actor, today)) {
    throw new AttendanceError(
      403,
      request.status === "approved" && request.employeeId === actor.id && !isLeaveManager(actor)
        ? "Leave that has already started can only be cancelled by HR"
        : "This request cannot be cancelled",
    );
  }
  const cancelledFields = {
    cancelledBy: actor.id,
    cancelledByName: actor.name,
    cancelledAt: new Date(),
  };
  if (request.status === "pending") {
    const cancelled = await LeaveRequest.findOneAndUpdate(
      { _id: request._id, status: "pending" },
      { $set: { status: "cancelled", ...cancelledFields } },
      { new: true },
    ).lean<LeaveRequestLean | null>();
    if (!cancelled) throw new AttendanceError(409, "This request was already decided");
    await notifyLeaveEvent({
      event: "cancelled",
      leaveId: String(cancelled._id),
      employeeId: cancelled.employeeId,
      actorId: actor.id,
      fromDate: cancelled.fromDate,
      toDate: cancelled.toDate,
      leaveType: cancelled.leaveType,
    });
    return viewFor(cancelled, actor);
  }

  // Approved leave: days up to yesterday were taken and stay. Today and later are given back.
  const kept = (request.days ?? []).filter((day) => day.date < today);
  const removed = (request.days ?? []).filter((day) => day.date >= today);
  if (removed.length === 0) {
    throw new AttendanceError(400, "Every day of this leave has already been taken");
  }
  await assertMonthsOpen(monthsInRange(removed[0].date, removed[removed.length - 1].date), actor);
  const fullCancel = kept.length === 0;
  const fromDate = fullCancel ? null : today;
  await reverseLeaveConsumption({
    leaveRequestId: String(request._id),
    fromDate: fromDate ?? undefined,
    actor: ledgerActor(actor),
    reason: "Leave cancelled",
  });
  const removedDates = await removeLeaveRecords({
    request,
    fromDate,
    actor,
    reason: "Leave cancelled",
  });

  const rules = toRules(await getOrCreatePolicy());
  const update = fullCancel
    ? { $set: { status: "cancelled", ...cancelledFields, paidDays: 0, unpaidDays: 0, lopDays: 0 } }
    : {
        $set: {
          days: kept,
          toDate: kept[kept.length - 1].date,
          workingDayCount: kept.length,
          paidDays: kept.filter((day) => day.pay === "paid").length,
          unpaidDays: kept.filter((day) => day.pay === "unpaid").length,
          lopDays: lopForLeaveDays(kept, rules.unplannedLeaveLopDays),
          decisionNote: `${request.decisionNote ?? ""} Remaining days cancelled by ${actor.name}.`.trim(),
        },
      };
  const updated = await LeaveRequest.findByIdAndUpdate(request._id, update, { new: true }).lean<LeaveRequestLean | null>();
  if (!updated) throw new AttendanceError(404, "Leave request not found");

  await notifyLeaveEvent({
    event: "cancelled",
    leaveId: String(updated._id),
    employeeId: updated.employeeId,
    actorId: actor.id,
    fromDate: request.fromDate,
    toDate: request.toDate,
    leaveType: request.leaveType,
  });
  await markPayrollStale(request.employeeId, monthsInRange(removed[0].date, removed[removed.length - 1].date));
  if (removedDates.length > 0) {
    try {
      // Rebuild the days that were just cleared from the login history.
      await reconcileRange(removedDates[0], removedDates[removedDates.length - 1]);
    } catch (error) {
      console.warn("[leave] Reconcile after cancel failed:", error);
    }
  }
  return viewFor(updated, actor);
}

/** How many leave requests still need an approve or reject. Zero for people who cannot decide. */
export async function countPendingLeaveDecisions(actor: AttendanceActor): Promise<number> {
  if (!isLeaveManager(actor)) return 0;
  await connectDb();
  return LeaveRequest.countDocuments({ status: "pending" });
}

export async function listLeaves(
  query: LeaveListQuery,
  actor: AttendanceActor,
): Promise<LeaveListPayload> {
  await connectDb();
  const manager = isLeaveManager(actor);
  if (query.scope === "all" && !manager) {
    throw new AttendanceError(403, "Leave approval access required");
  }
  const filter: mongoose.FilterQuery<LeaveRequestLean> = {};
  if (query.scope === "mine") filter.employeeId = actor.id;
  else if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.status) filter.status = query.status;
  if (query.leaveType) filter.leaveType = query.leaveType;
  if (query.month) {
    filter.fromDate = { $lte: `${query.month}-31` };
    filter.toDate = { $gte: `${query.month}-01` };
  }
  const rows = await LeaveRequest.find(filter)
    .sort({ status: 1, createdAt: -1 })
    .limit(300)
    .lean<LeaveRequestLean[]>();
  const people = await employeeSummaries(rows.map((row) => row.employeeId));
  const today = istDateKey(new Date());
  // Pending requests first, so the approval queue is on top.
  const ordered = [...rows].sort((left, right) => {
    const leftRank = left.status === "pending" ? 0 : 1;
    const rightRank = right.status === "pending" ? 0 : 1;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return (right.createdAt ? new Date(right.createdAt).getTime() : 0) - (left.createdAt ? new Date(left.createdAt).getTime() : 0);
  });
  return {
    items: ordered.map((row) => toRequestView(row, people, actor, today)),
    canManage: manager,
  };
}

export async function getLeaveBalance(
  requestedEmployeeId: string | undefined,
  actor: AttendanceActor,
): Promise<LeaveBalanceView> {
  await connectDb();
  const employeeId = resolveTargetEmployeeId(requestedEmployeeId, actor);
  const employee = await employeeOrThrow(employeeId);
  const rules = toRules(await getOrCreatePolicy());
  const balance = await paidBalanceFor(employee, rules);
  const [ledger, pending] = await Promise.all([
    listLedgerEntries(employeeId),
    LeaveRequest.find({ employeeId, status: "pending", leaveType: "planned" })
      .select("workingDayCount")
      .lean<{ workingDayCount: number }[]>(),
  ]);
  return {
    employeeId,
    employeeName: employee.name?.trim() || "Unnamed employee",
    canAdjust: actor.role === "HR" || isSuperAdmin(actor),
    balance,
    pendingPlannedDays: pending.reduce((sum, item) => sum + (item.workingDayCount ?? 0), 0),
    monthlyAccrual: rules.paidLeaveMonthlyAccrual,
    maxBalance: rules.paidLeaveMaxBalance,
    ledger,
  };
}

export async function adjustLeaveBalance(
  input: LeaveBalanceAdjustInput,
  actor: AttendanceActor,
): Promise<LeaveBalanceView> {
  if (actor.role !== "HR" && !isSuperAdmin(actor)) {
    throw new AttendanceError(403, "Only HR or a super admin can adjust leave balances");
  }
  await connectDb();
  const employee = await employeeOrThrow(input.employeeId);
  const rules = toRules(await getOrCreatePolicy());
  const balance = await paidBalanceFor(employee, rules);
  if (roundLop(balance + input.days) < 0) {
    throw new AttendanceError(400, "This adjustment would take the balance below zero");
  }
  await postBalanceAdjustment({
    employeeId: input.employeeId,
    days: input.days,
    reason: input.reason,
    monthKey: currentPayrollMonth().key,
    actor: ledgerActor(actor),
  });
  return getLeaveBalance(input.employeeId, actor);
}

/** Credits every active employee up to the current month. Run on the 1st and as a safety net. */
export async function runMonthlyLeaveAccrual(): Promise<{ employees: number }> {
  await connectDb();
  const rules = toRules(await getOrCreatePolicy());
  const employees = await Employees.find({
    role: { $ne: "Guest" },
    email: { $ne: TEST_SUPERADMIN_EMAIL },
    isActive: { $ne: false },
  })
    .select("dateOfJoining")
    .lean<{ _id: mongoose.Types.ObjectId; dateOfJoining?: Date | null }[]>();
  const throughMonth = currentPayrollMonth().key;
  for (const employee of employees) {
    await ensureAccruals({
      employeeId: String(employee._id),
      joiningDate: employee.dateOfJoining ? istDateKey(new Date(employee.dateOfJoining)) : null,
      policy: rules,
      throughMonth,
    });
  }
  return { employees: employees.length };
}