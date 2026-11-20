import AttendanceRecord from "@/models/attendanceRecord";
import CompanyHoliday from "@/models/companyHoliday";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import EmployeeShiftAssignment from "@/models/employeeShiftAssignment";
import Employees from "@/models/employee";
import LeaveRequest from "@/models/leaveRequest";
import {
  isHoliday,
  resolveWorkShift,
} from "@/modules/attendance/calculate";
import {
  addAttendanceDays,
  cutoffInstant,
  istDateKey,
  istDayBounds,
  isWeeklyOffDay,
  loginMatchesDate,
  shiftWindow,
} from "@/modules/attendance/dates";
import {
  loadDecisionMakerIds,
  notifyMissingLogin,
  notifyMissingLoginDigest,
  retryUnsentAttendanceNoticeEmails,
} from "@/modules/attendance/notices/service";
import { shouldNotifyMissingLogin } from "@/modules/attendance/notices/rules";
import {
  employeeView,
  getOrCreatePolicy,
  loadWorkShiftContext,
  orgIdsForEmployee,
  toRules,
  type EmployeeLean,
} from "@/modules/attendance/service";
import type { ShiftAssignmentRange } from "@/modules/attendance/types";
import { connectDb } from "@/util/db";
import { TEST_SUPERADMIN_EMAIL } from "@/util/employeeConstants";

type ScanEmployee = EmployeeLean & { reportingManagerId?: unknown };

const LOGGED_STATUSES = ["present", "half_day", "work_from_home"] as const;

/**
 * After each person's shift cutoff, tell them once if that working day has no login.
 * Their manager and HR get one list for the day, extended when more people are added.
 * Today and yesterday are scanned so an overnight shift is not missed. Older days are not backfilled.
 */
export async function scanMissingLogins(now: Date = new Date()): Promise<{ notified: number }> {
  await connectDb();
  const today = istDateKey(now);
  const yesterday = addAttendanceDays(today, -1);
  const dates = [yesterday, today];
  const rangeStart = istDayBounds(yesterday).start;
  const rangeEnd = istDayBounds(addAttendanceDays(today, 1)).end;

  const [policy, workShifts, employees, holidays, shifts, logins, records, leaves, decisionMakers] =
    await Promise.all([
      getOrCreatePolicy(),
      loadWorkShiftContext(),
      Employees.find({
        role: { $ne: "Guest" },
        email: { $ne: TEST_SUPERADMIN_EMAIL },
      })
        .select(
          "name email role department departmentId jobTitle jobPositionId dateOfJoining inactiveDate isActive reportingManagerId",
        )
        .lean<ScanEmployee[]>(),
      CompanyHoliday.find({ date: { $in: dates } })
        .select("date departmentId")
        .lean<{ date: string; departmentId?: string | null }[]>(),
      EmployeeShiftAssignment.find({})
        .select("employeeId startTime endTime weeklyOffDays effectiveFrom effectiveTo")
        .lean<
          {
            employeeId: string;
            startTime: string;
            endTime: string;
            weeklyOffDays?: number[];
            effectiveFrom: string;
            effectiveTo?: string | null;
          }[]
        >(),
      EmployeeActivityLog.find({
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
        .select("employeeId loginTime createdAt")
        .lean<{ employeeId: string; loginTime?: Date | null; createdAt?: Date }[]>(),
      AttendanceRecord.find({
        attendanceDate: { $in: dates },
        $or: [{ firstLoginAt: { $ne: null } }, { status: { $in: [...LOGGED_STATUSES] } }],
      })
        .select("employeeId attendanceDate")
        .lean<{ employeeId: string; attendanceDate: string }[]>(),
      LeaveRequest.find({
        status: "approved",
        fromDate: { $lte: today },
        toDate: { $gte: yesterday },
      })
        .select("employeeId fromDate toDate")
        .lean<{ employeeId: string; fromDate: string; toDate: string }[]>(),
      loadDecisionMakerIds(),
    ]);

  const rules = toRules(policy);
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
  const loginMoments = new Map<string, Date[]>();
  for (const login of logins) {
    const at = login.loginTime ? new Date(login.loginTime) : login.createdAt ? new Date(login.createdAt) : null;
    if (!at) continue;
    const list = loginMoments.get(login.employeeId) ?? [];
    list.push(at);
    loginMoments.set(login.employeeId, list);
  }
  const recordedLogin = new Set(records.map((row) => `${row.employeeId}:${row.attendanceDate}`));
  const approvedLeave = leaves.map((leave) => ({
    employeeId: leave.employeeId,
    fromDate: leave.fromDate,
    toDate: leave.toDate,
  }));

  const missingByDate = new Map<string, { id: string; name: string; managerId: string | null }[]>();
  let notified = 0;

  for (const employee of employees) {
    const profile = employeeView(employee, today);
    const managerId =
      employee.reportingManagerId != null ? String(employee.reportingManagerId) : null;
    const org = orgIdsForEmployee(profile, workShifts);
    const personal = shiftsByEmployee.get(profile.id) ?? [];
    const moments = loginMoments.get(profile.id) ?? [];

    for (const date of dates) {
      const shift = resolveWorkShift({
        date,
        policy: rules,
        personalShifts: personal,
        departmentId: org.departmentId,
        jobPositionId: org.jobPositionId,
        departmentShifts: workShifts.departmentShifts,
        positionShifts: workShifts.positionShifts,
      });
      const window = shiftWindow(date, shift.startTime, shift.endTime);
      const hasLogin =
        recordedLogin.has(`${profile.id}:${date}`) ||
        moments.some((at) => loginMatchesDate(at, date, shift.startTime, shift.endTime));
      const onApprovedLeave = approvedLeave.some(
        (leave) => leave.employeeId === profile.id && leave.fromDate <= date && leave.toDate >= date,
      );
      const due = shouldNotifyMissingLogin({
        now,
        attendanceDate: date,
        cutoff: cutoffInstant(window, rules.cutoffTime, date),
        holiday: isHoliday(date, org.departmentId, holidayMarks),
        weeklyOff: isWeeklyOffDay(date, shift.weeklyOffDays, rules.alternateSaturdayOff),
        joiningDate: profile.joiningDate,
        exitDate: profile.exitDate,
        hasLogin,
        onApprovedLeave,
      });
      if (!due) continue;
      const created = await notifyMissingLogin({
        employeeId: profile.id,
        date,
      });
      if (created) notified += 1;
      const list = missingByDate.get(date) ?? [];
      list.push({
        id: profile.id,
        name: profile.name,
        managerId: managerId && managerId !== profile.id ? managerId : null,
      });
      missingByDate.set(date, list);
    }
  }

  for (const [date, people] of missingByDate) {
    const namesById = new Map(people.map((person) => [person.id, person.name]));
    const byManager = new Map<string, string[]>();
    for (const person of people) {
      if (!person.managerId) continue;
      const team = byManager.get(person.managerId) ?? [];
      team.push(person.id);
      byManager.set(person.managerId, team);
    }
    for (const [managerId, subjectIds] of byManager) {
      await notifyMissingLoginDigest({
        recipientId: managerId,
        audience: "manager",
        date,
        subjectIds,
        namesById,
      });
    }
    for (const recipientId of decisionMakers) {
      await notifyMissingLoginDigest({
        recipientId,
        audience: "hr",
        date,
        subjectIds: people.map((person) => person.id),
        namesById,
      });
    }
  }

  await retryUnsentAttendanceNoticeEmails();
  if (notified > 0) {
    console.log(`[attendance-notice] Missing-login scan notified ${notified} employee-day(s)`);
  }
  return { notified };
}
