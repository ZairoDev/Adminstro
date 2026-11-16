/**
 * Attendance test logins for a payroll month.
 *
 * Enables late LOP rules, writes ended EmployeeActivityLog rows for employees
 * on that month's sheet, then reconciles. A few days are saved as manual
 * attendance so half day, leave, and work from home can be seen.
 *
 * Personas (by roster index):
 *   0  always on time
 *   1  mild grace late every working day (hits 10× → 0.25 LOP)
 *   2  half-hour+ late every working day (half day, 0.5 LOP each)
 *   3  absences and unpaid leave
 *   4  paid leave / WFH / manual half day mix
 *   5+ rotating mix of every criterion
 *
 * Re-running replaces only rows tagged with the month tag.
 *
 * Usage:
 *   npx tsx src/scripts/seedOctoberAttendanceLogins.ts
 *   ATTENDANCE_SEED_MONTH=2026-11 npx tsx src/scripts/seedOctoberAttendanceLogins.ts
 */

import path from "path";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import {
  attendanceExitDate,
  overlapsAttendanceMonth,
  shiftForDate,
} from "@/modules/attendance/calculate";
import {
  addAttendanceDays,
  clockOnDate,
  istDateKey,
  isWeeklyOffDay,
  normalizeAlternateSaturdayOff,
  shiftWindow,
} from "@/modules/attendance/dates";
import { reconcileRange } from "@/modules/attendance/service";
import {
  DEFAULT_ATTENDANCE_POLICY,
  type AttendanceStatus,
  type LeavePay,
  type ShiftAssignmentRange,
} from "@/modules/attendance/types";
import { connectDb } from "@/util/db";
import { TEST_SUPERADMIN_EMAIL } from "@/util/employeeConstants";
import AttendancePolicy from "@/models/attendancePolicy";
import AttendanceRecord from "@/models/attendanceRecord";
import CompanyHoliday from "@/models/companyHoliday";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import EmployeeShiftAssignment from "@/models/employeeShiftAssignment";
import Employees from "@/models/employee";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const MONTH = process.env.ATTENDANCE_SEED_MONTH?.trim() || "2026-10";
const MONTH_START = `${MONTH}-01`;
const MONTH_DAY_COUNT = new Date(
  Date.UTC(Number(MONTH.slice(0, 4)), Number(MONTH.slice(5, 7)), 0),
).getUTCDate();
const MONTH_END = `${MONTH}-${String(MONTH_DAY_COUNT).padStart(2, "0")}`;
const COMPANY_HOLIDAY = MONTH === "2026-10" ? "2026-10-02" : `${MONTH}-05`;
const DEPARTMENT_HOLIDAY = MONTH === "2026-10" ? "2026-10-20" : `${MONTH}-12`;
const TAG = `attendance-${MONTH}-test`;

type EmployeeSeed = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  departmentId?: mongoose.Types.ObjectId | null;
  dateOfJoining?: Date | null;
  inactiveDate?: Date | null;
  isActive?: boolean;
};

type LoginPlan = { kind: "login"; clocks: string[]; label: string };
type ManualPlan = {
  kind: "manual";
  status: Extract<AttendanceStatus, "half_day" | "on_leave" | "work_from_home">;
  leavePay: LeavePay | null;
  label: string;
};
type DayPlan = LoginPlan | ManualPlan | { kind: "gap"; label: string };

const ON_TIME: DayPlan = { kind: "login", clocks: ["-12"], label: "on time" };
const INSIDE_GRACE: DayPlan = { kind: "login", clocks: ["+8"], label: "inside grace" };
const MILD_LATE: DayPlan = { kind: "login", clocks: ["+20"], label: "mild grace late" };
const HALF_HOUR_LATE: DayPlan = {
  kind: "login",
  clocks: ["+30"],
  label: "half-hour late → half day",
};
const SEVERE_LATE: DayPlan = {
  kind: "login",
  clocks: ["+45"],
  label: "45 min late → half day",
};
const VERY_LATE: DayPlan = {
  kind: "login",
  clocks: ["+95"],
  label: "late by about 90 minutes",
};
const SIGNIFICANT_LATE: DayPlan = {
  kind: "login",
  clocks: ["+210"],
  label: "significantly late",
};
const EARLY_OUTSIDE: DayPlan = {
  kind: "login",
  clocks: ["-110"],
  label: "early, outside shift",
};
const AFTER_END: DayPlan = {
  kind: "login",
  clocks: ["end+40"],
  label: "after shift end",
};
const ABSENT: DayPlan = { kind: "gap", label: "absent" };
const MANUAL_HALF: DayPlan = {
  kind: "manual",
  status: "half_day",
  leavePay: null,
  label: "manual half day",
};
const PAID_LEAVE: DayPlan = {
  kind: "manual",
  status: "on_leave",
  leavePay: "paid",
  label: "paid leave",
};
const UNPAID_LEAVE: DayPlan = {
  kind: "manual",
  status: "on_leave",
  leavePay: "unpaid",
  label: "unpaid leave",
};
const WFH: DayPlan = {
  kind: "manual",
  status: "work_from_home",
  leavePay: null,
  label: "work from home",
};
const TWO_LOGINS: DayPlan = {
  kind: "login",
  clocks: ["-5", "+70"],
  label: "two logins",
};

/** Rotating mix so remaining employees hit every criterion. */
const WORKING_PLANS: DayPlan[] = [
  ON_TIME,
  INSIDE_GRACE,
  MILD_LATE,
  HALF_HOUR_LATE,
  SEVERE_LATE,
  VERY_LATE,
  SIGNIFICANT_LATE,
  EARLY_OUTSIDE,
  AFTER_END,
  ABSENT,
  MANUAL_HALF,
  PAID_LEAVE,
  UNPAID_LEAVE,
  WFH,
  TWO_LOGINS,
];

const ABSENCE_MIX: DayPlan[] = [ABSENT, ABSENT, UNPAID_LEAVE, ON_TIME, ABSENT, MILD_LATE];
const LEAVE_MIX: DayPlan[] = [PAID_LEAVE, WFH, MANUAL_HALF, ON_TIME, PAID_LEAVE, INSIDE_GRACE];

function personaPlan(employeeIndex: number, workingSlot: number): DayPlan {
  const group = employeeIndex % 6;
  if (group === 0) return ON_TIME;
  if (group === 1) return MILD_LATE;
  if (group === 2) return workingSlot % 2 === 0 ? HALF_HOUR_LATE : SEVERE_LATE;
  if (group === 3) return ABSENCE_MIX[workingSlot % ABSENCE_MIX.length] ?? ABSENT;
  if (group === 4) return LEAVE_MIX[workingSlot % LEAVE_MIX.length] ?? PAID_LEAVE;
  return WORKING_PLANS[workingSlot % WORKING_PLANS.length] ?? ON_TIME;
}

function clockPlus(clock: string, deltaMinutes: number): string {
  const [hours, minutes] = clock.split(":").map((part) => Number(part));
  const total = ((hours * 60 + minutes + deltaMinutes) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function resolveClock(token: string, startTime: string, endTime: string): string {
  if (token.startsWith("end")) {
    const extra = Number(token.slice(3));
    return clockPlus(endTime, extra);
  }
  const delta = Number(token);
  return clockPlus(startTime, delta);
}

function datesThrough(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addAttendanceDays(cursor, 1);
  }
  return dates;
}

function sameCalendarDay(clock: string, date: string): boolean {
  return istDateKey(clockOnDate(date, clock)) === date;
}

async function main(): Promise<void> {
  if (!process.env.MONGO_DB_URL) {
    throw new Error("MONGO_DB_URL is not set");
  }
  await connectDb();
  const today = istDateKey(new Date());
  const lastSeedDate = today < MONTH_END ? today : MONTH_END;

  const policy = await AttendancePolicy.findOne({ key: "default" });
  if (!policy) {
    throw new Error("Attendance policy is missing. Open Attendance once, then run this again.");
  }

  policy.lateCreatesLop = true;
  policy.lateLopFactor = DEFAULT_ATTENDANCE_POLICY.lateLopFactor;
  policy.lateGraceThresholdCount = DEFAULT_ATTENDANCE_POLICY.lateGraceThresholdCount;
  policy.severeLateMinutes = DEFAULT_ATTENDANCE_POLICY.severeLateMinutes;
  policy.halfDayLopFactor = DEFAULT_ATTENDANCE_POLICY.halfDayLopFactor;
  policy.alternateSaturdayOff = DEFAULT_ATTENDANCE_POLICY.alternateSaturdayOff;
  if (!policy.confirmedAt) {
    policy.confirmedAt = new Date();
    policy.confirmedBy = TAG;
  }
  await policy.save();

  await CompanyHoliday.updateOne(
    { date: COMPANY_HOLIDAY, departmentId: null },
    {
      $setOnInsert: {
        date: COMPANY_HOLIDAY,
        name: MONTH === "2026-10" ? "Gandhi Jayanti" : "Attendance test company holiday",
        departmentId: null,
      },
    },
    { upsert: true },
  );

  const employees = (await Employees.find({
    role: { $ne: "Guest" },
    email: { $ne: TEST_SUPERADMIN_EMAIL },
  })
    .select("name email role department departmentId dateOfJoining inactiveDate isActive")
    .sort({ name: 1 })
    .lean()) as EmployeeSeed[];

  const roster = employees.filter((employee) => {
    if (!employee.email?.trim()) return false;
    const joiningDate = employee.dateOfJoining ? istDateKey(new Date(employee.dateOfJoining)) : null;
    const inactiveDate = employee.inactiveDate ? istDateKey(new Date(employee.inactiveDate)) : null;
    const exitDate = attendanceExitDate({
      isActive: employee.isActive !== false,
      inactiveDate,
      today,
    });
    return overlapsAttendanceMonth({
      joiningDate,
      exitDate,
      monthStart: MONTH_START,
      monthEnd: MONTH_END,
    });
  });

  const departmentCounts = new Map<string, number>();
  for (const employee of roster) {
    const departmentId = employee.departmentId ? String(employee.departmentId) : "";
    if (!departmentId) continue;
    departmentCounts.set(departmentId, (departmentCounts.get(departmentId) ?? 0) + 1);
  }
  const departmentHolidayId =
    [...departmentCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ??
    null;
  if (departmentHolidayId) {
    await CompanyHoliday.updateOne(
      { date: DEPARTMENT_HOLIDAY, departmentId: departmentHolidayId },
      {
        $setOnInsert: {
          date: DEPARTMENT_HOLIDAY,
          name: "Attendance test department holiday",
          departmentId: departmentHolidayId,
        },
      },
      { upsert: true },
    );
  }

  const assignments = (await EmployeeShiftAssignment.find({
    employeeId: { $in: roster.map((employee) => String(employee._id)) },
  })
    .select("employeeId startTime endTime weeklyOffDays effectiveFrom effectiveTo")
    .lean()) as Array<ShiftAssignmentRange & { employeeId: string }>;
  const shiftsByEmployee = new Map<string, ShiftAssignmentRange[]>();
  for (const assignment of assignments) {
    const list = shiftsByEmployee.get(assignment.employeeId) ?? [];
    list.push({
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      weeklyOffDays: assignment.weeklyOffDays ?? [],
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo ?? null,
    });
    shiftsByEmployee.set(assignment.employeeId, list);
  }

  const removedLogins = await EmployeeActivityLog.deleteMany({ notes: TAG });
  const removedManual = await AttendanceRecord.deleteMany({
    remarks: TAG,
    attendanceDate: { $gte: MONTH_START, $lte: MONTH_END },
  });

  // Clear prior auto-reconciled rows for this month so the new late rules recompute cleanly.
  const removedAuto = await AttendanceRecord.deleteMany({
    attendanceDate: { $gte: MONTH_START, $lte: MONTH_END },
    employeeId: { $in: roster.map((employee) => String(employee._id)) },
    isManuallyAdjusted: { $ne: true },
    finalizedAt: null,
  });

  const monthStart = clockOnDate(MONTH_START, "00:00");
  const monthEnd = clockOnDate(addAttendanceDays(MONTH_END, 1), "00:00");
  const existingLogins = await EmployeeActivityLog.find({
    employeeId: { $in: roster.map((employee) => String(employee._id)) },
    activityType: "login",
    $or: [
      { loginTime: { $gte: monthStart, $lt: monthEnd } },
      { loginTime: null, createdAt: { $gte: monthStart, $lt: monthEnd } },
    ],
  })
    .select("employeeId loginTime createdAt")
    .lean<{ employeeId: string; loginTime?: Date | null; createdAt?: Date }[]>();

  const occupied = new Set<string>();
  for (const login of existingLogins) {
    const at = login.loginTime ? new Date(login.loginTime) : login.createdAt ? new Date(login.createdAt) : null;
    if (!at) continue;
    occupied.add(`${login.employeeId}:${istDateKey(at)}`);
  }

  const dates = datesThrough(MONTH_START, lastSeedDate);
  const loginDocs: Record<string, unknown>[] = [];
  const manualPlans: {
    employeeId: string;
    date: string;
    status: ManualPlan["status"];
    leavePay: LeavePay | null;
    shiftStartAt: Date;
    shiftEndAt: Date;
  }[] = [];
  const labelCounts = new Map<string, number>();
  const personaNames: { index: number; name: string; persona: string }[] = [];
  let skippedExisting = 0;
  let holidayLoginSeeded = false;

  const bump = (label: string) => labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  const personaLabel = (index: number): string => {
    const group = index % 6;
    if (group === 0) return "always on time";
    if (group === 1) return "mild grace late every day (threshold LOP)";
    if (group === 2) return "half-hour+ late → half days";
    if (group === 3) return "absences / unpaid leave";
    if (group === 4) return "paid leave / WFH / manual half";
    return "rotating mix";
  };

  roster.forEach((employee, employeeIndex) => {
    const employeeId = String(employee._id);
    personaNames.push({
      index: employeeIndex,
      name: employee.name?.trim() || employee.email || employeeId,
      persona: personaLabel(employeeIndex),
    });
    const joiningDate = employee.dateOfJoining ? istDateKey(new Date(employee.dateOfJoining)) : null;
    const inactiveDate = employee.inactiveDate ? istDateKey(new Date(employee.inactiveDate)) : null;
    const exitDate = attendanceExitDate({
      isActive: employee.isActive !== false,
      inactiveDate,
      today,
    });
    const departmentId = employee.departmentId ? String(employee.departmentId) : null;
    let workingSlot = 0;

    for (const date of dates) {
      if (joiningDate && date < joiningDate) continue;
      if (exitDate && date > exitDate) continue;
      const key = `${employeeId}:${date}`;
      if (occupied.has(key)) {
        skippedExisting += 1;
        continue;
      }

      const shift = shiftForDate(
        date,
        {
          shiftStart: policy.shiftStart,
          shiftEnd: policy.shiftEnd,
          weeklyOffDays: policy.weeklyOffDays ?? [],
        },
        shiftsByEmployee.get(employeeId) ?? [],
      );
      const weeklyOff = isWeeklyOffDay(
        date,
        shift.weeklyOffDays,
        normalizeAlternateSaturdayOff(
          policy.alternateSaturdayOff ?? DEFAULT_ATTENDANCE_POLICY.alternateSaturdayOff,
        ),
      );
      const companyHoliday = date === COMPANY_HOLIDAY;
      const departmentHoliday =
        departmentHolidayId !== null &&
        departmentId === departmentHolidayId &&
        date === DEPARTMENT_HOLIDAY;

      if (weeklyOff || companyHoliday || departmentHoliday) {
        const shouldLogin =
          (weeklyOff && employeeIndex % 3 === 0) ||
          (companyHoliday && employeeIndex % 4 === 0) ||
          (departmentHoliday && !holidayLoginSeeded);
        if (!shouldLogin) {
          bump(weeklyOff ? "weekly off" : "holiday");
          continue;
        }
        if (departmentHoliday) holidayLoginSeeded = true;
        const clock = clockPlus(shift.startTime, 60);
        if (!sameCalendarDay(clock, date)) continue;
        pushLogin(employee, date, clock, loginDocs);
        bump(weeklyOff ? "login on weekly off" : "login on holiday");
        continue;
      }

      const plan = personaPlan(employeeIndex, workingSlot);
      workingSlot += 1;
      if (!plan) continue;

      if (plan.kind === "gap") {
        bump(date === today ? "pending today" : plan.label);
        continue;
      }
      if (plan.kind === "manual") {
        if (date === today) {
          bump("pending today");
          continue;
        }
        const window = shiftWindow(date, shift.startTime, shift.endTime);
        manualPlans.push({
          employeeId,
          date,
          status: plan.status,
          leavePay: plan.leavePay,
          shiftStartAt: window.start,
          shiftEndAt: window.end,
        });
        bump(plan.label);
        continue;
      }

      const clocks = plan.clocks
        .map((token) => resolveClock(token, shift.startTime, shift.endTime))
        .filter((clock) => sameCalendarDay(clock, date));
      if (clocks.length === 0) {
        bump("absent");
        continue;
      }
      clocks.forEach((clock) => pushLogin(employee, date, clock, loginDocs));
      bump(date === today ? `${plan.label} today` : plan.label);
    }
  });

  if (loginDocs.length > 0) {
    await EmployeeActivityLog.insertMany(loginDocs, { ordered: false });
  }

  const reconciled = await reconcileRange(MONTH_START, lastSeedDate);

  if (manualPlans.length > 0) {
    await AttendanceRecord.bulkWrite(
      manualPlans.map((plan) => ({
        updateOne: {
          filter: { employeeId: plan.employeeId, attendanceDate: plan.date },
          update: {
            $set: {
              status: plan.status,
              isLate: false,
              lateByMinutes: 0,
              leavePay: plan.leavePay,
              firstLoginAt: null,
              shiftStartAt: plan.shiftStartAt,
              shiftEndAt: plan.shiftEndAt,
              source: "manual",
              isManuallyAdjusted: true,
              anomalyFlags: [],
              remarks: TAG,
              finalizedAt: clockOnDate(plan.date, policy.cutoffTime),
            },
            $setOnInsert: {
              employeeId: plan.employeeId,
              attendanceDate: plan.date,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  const statusRows = await AttendanceRecord.aggregate<{ _id: string; count: number }>([
    { $match: { attendanceDate: { $gte: MONTH_START, $lte: lastSeedDate } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const lateRows = await AttendanceRecord.aggregate<{
    _id: string;
    latePresent: number;
    lateHalf: number;
  }>([
    {
      $match: {
        attendanceDate: { $gte: MONTH_START, $lte: lastSeedDate },
        isLate: true,
      },
    },
    {
      $group: {
        _id: "$employeeId",
        latePresent: {
          $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
        },
        lateHalf: {
          $sum: { $cond: [{ $eq: ["$status", "half_day"] }, 1, 0] },
        },
      },
    },
  ]);

  const samplePersonas = personaNames.slice(0, 12).map((row) => {
    const late = lateRows.find((item) => item._id === String(roster[row.index]?._id));
    return {
      ...row,
      mildGraceLates: late?.latePresent ?? 0,
      lateHalfDays: late?.lateHalf ?? 0,
      expectedThresholdLop:
        (late?.latePresent ?? 0) >= DEFAULT_ATTENDANCE_POLICY.lateGraceThresholdCount
          ? DEFAULT_ATTENDANCE_POLICY.lateLopFactor
          : 0,
    };
  });

  console.log(
    JSON.stringify(
      {
        month: MONTH,
        roster: roster.length,
        skippedOutsideMonth: employees.length - roster.length,
        replacedTestLogins: removedLogins.deletedCount,
        replacedManualRows: removedManual.deletedCount,
        clearedAutoRows: removedAuto.deletedCount,
        loginsInserted: loginDocs.length,
        daysLeftBecauseARealLoginExists: skippedExisting,
        manualRows: manualPlans.length,
        reconciled,
        seededThrough: lastSeedDate,
        lateLopRules: {
          enabled: true,
          graceThresholdCount: DEFAULT_ATTENDANCE_POLICY.lateGraceThresholdCount,
          graceThresholdLop: DEFAULT_ATTENDANCE_POLICY.lateLopFactor,
          severeLateMinutes: DEFAULT_ATTENDANCE_POLICY.severeLateMinutes,
          halfDayLopFactor: DEFAULT_ATTENDANCE_POLICY.halfDayLopFactor,
        },
        companyHoliday: COMPANY_HOLIDAY,
        departmentHoliday: departmentHolidayId ? DEPARTMENT_HOLIDAY : null,
        samplePersonas,
        plannedDays: Object.fromEntries(
          [...labelCounts.entries()].sort((left, right) => left[0].localeCompare(right[0])),
        ),
        storedStatuses: Object.fromEntries(statusRows.map((row) => [row._id, row.count])),
      },
      null,
      2,
    ),
  );
}

function pushLogin(
  employee: EmployeeSeed,
  date: string,
  clock: string,
  target: Record<string, unknown>[],
): void {
  const loginTime = clockOnDate(date, clock);
  const logoutTime = new Date(loginTime.getTime() + 8 * 60 * 60 * 1000);
  target.push({
    employeeId: String(employee._id),
    employeeName: employee.name?.trim() || "Unnamed employee",
    employeeEmail: employee.email?.trim() || "",
    role: employee.role?.trim() || "Employee",
    activityType: "login",
    loginTime,
    logoutTime,
    duration: 8 * 60,
    ipAddress: "127.0.0.1",
    userAgent: TAG,
    deviceInfo: `${MONTH} attendance test`,
    location: "",
    notes: TAG,
    sessionId: `${TAG}-${String(employee._id)}-${date}-${clock.replace(":", "")}`,
    status: "ended",
    lastActivityAt: logoutTime,
    createdAt: loginTime,
    updatedAt: loginTime,
  });
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Attendance seed failed";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
