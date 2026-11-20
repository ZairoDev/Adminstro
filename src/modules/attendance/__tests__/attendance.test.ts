import { getIstDayBounds } from "@/util/employeeActivitySession";
import {
  attendanceExitDate,
  canAutoUpdate,
  correctionPermission,
  isHoliday,
  overlapsAttendanceMonth,
  qualifyingLoginCount,
  resolveAttendanceDay,
  attendanceOrgIds,
  resolveWorkShift,
  shiftForDate,
  summarizeAttendance,
} from "@/modules/attendance/calculate";
import {
  addAttendanceDays,
  attendanceRecordKey,
  datesInPayrollMonth,
  earliestInstant,
  istDateKey,
  istDayBounds,
  isAlternateSaturdayOff,
  isWeeklyOffDay,
  loginMatchesDate,
  saturdayCycleParity,
} from "@/modules/attendance/dates";
import { daysInPayrollMonth, parsePayrollMonth } from "@/modules/finance/salary-month";
import {
  DEFAULT_ATTENDANCE_POLICY,
  type AttendancePolicyRules,
  type DayContribution,
  type ResolveDayInput,
} from "@/modules/attendance/types";
import { isDuplicateKeyError } from "@/modules/attendance/errors";

const confirmed: AttendancePolicyRules = { ...DEFAULT_ATTENDANCE_POLICY, confirmed: true };
const draft: AttendancePolicyRules = { ...DEFAULT_ATTENDANCE_POLICY, confirmed: false };
const dayShift = {
  startTime: "10:00",
  endTime: "18:30",
  weeklyOffDays: [0],
};

function input(overrides: Partial<ResolveDayInput> & Pick<ResolveDayInput, "attendanceDate" | "now">): ResolveDayInput {
  return {
    policy: confirmed,
    joiningDate: "2020-01-01",
    exitDate: null,
    departmentId: "sales",
    holidays: [],
    shift: dayShift,
    firstLoginAt: null,
    qualifyingLoginCount: overrides.firstLoginAt ? 1 : 0,
    ...overrides,
  };
}

function day(
  status: DayContribution["status"],
  leavePay: DayContribution["leavePay"] = null,
  isLate = false,
): DayContribution {
  return { status, leavePay, isLate };
}

describe("attendance dates", () => {
  it("treats 18:30 UTC as the next IST calendar day", () => {
    expect(istDateKey(new Date("2026-10-29T18:30:00.000Z"))).toBe("2026-10-30");
    expect(istDateKey(new Date("2026-10-29T18:29:59.999Z"))).toBe("2026-10-29");
  });

  it("matches getIstDayBounds for the same IST day", () => {
    const noon = new Date("2026-10-30T12:00:00+05:30");
    const bounds = getIstDayBounds(noon);
    const key = istDateKey(noon);
    expect(istDayBounds(key).start.toISOString()).toBe(bounds.start.toISOString());
    expect(istDayBounds(key).end.toISOString()).toBe(bounds.end.toISOString());
  });

  it("builds months of 28, 29, 30, and 31 days", () => {
    const feb = parsePayrollMonth("2025-02");
    const leap = parsePayrollMonth("2024-02");
    const apr = parsePayrollMonth("2026-04");
    const oct = parsePayrollMonth("2026-10");
    expect(feb && datesInPayrollMonth(feb)).toHaveLength(28);
    expect(leap && datesInPayrollMonth(leap)).toHaveLength(29);
    expect(apr && datesInPayrollMonth(apr)).toHaveLength(30);
    expect(oct && datesInPayrollMonth(oct)).toHaveLength(31);
    expect(feb && daysInPayrollMonth(feb)).toBe(28);
    expect(leap && addAttendanceDays(`${leap.key}-01`, 28)).toBe("2024-02-29");
  });
});

describe("attendance day resolution", () => {
  const afterCutoff = new Date("2026-10-30T19:00:00+05:30");
  const duringDay = new Date("2026-10-30T12:00:00+05:30");

  it("marks the earliest qualifying login as present and ignores later logins", () => {
    const first = new Date("2026-10-30T04:30:00.000Z");
    const second = new Date("2026-10-30T08:00:00.000Z");
    expect(earliestInstant([second, first])?.toISOString()).toBe(first.toISOString());
    const matches = qualifyingLoginCount([first, second], "2026-10-30", dayShift);
    expect(matches).toHaveLength(2);
    const resolved = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-30",
        now: afterCutoff,
        firstLoginAt: earliestInstant(matches),
        qualifyingLoginCount: matches.length,
      }),
    );
    expect(resolved.persist).toBe(true);
    if (resolved.persist) {
      expect(resolved.status).toBe("present");
      expect(resolved.isLate).toBe(false);
      expect(resolved.anomalyFlags).toContain("duplicate_source_events");
      expect(resolved.firstLoginAt?.toISOString()).toBe(first.toISOString());
    }
  });

  it("marks a completed working day without a login as unapproved leave only after the policy is confirmed", () => {
    const absent = resolveAttendanceDay(
      input({ attendanceDate: "2026-10-30", now: afterCutoff, policy: confirmed }),
    );
    const pending = resolveAttendanceDay(
      input({ attendanceDate: "2026-10-30", now: afterCutoff, policy: draft }),
    );
    expect(absent.persist && absent.status).toBe("on_leave");
    expect(absent.persist && absent.leaveCategory).toBe("unapproved");
    expect(absent.persist && absent.leavePay).toBe("unpaid");
    expect(pending.persist && pending.status).toBe("pending_verification");
  });

  it("keeps the current day provisional before cutoff", () => {
    const resolved = resolveAttendanceDay(
      input({ attendanceDate: "2026-10-30", now: duringDay }),
    );
    expect(resolved.persist && resolved.status).toBe("pending_verification");
  });

  it("does not mark a future working day absent", () => {
    const resolved = resolveAttendanceDay(
      input({ attendanceDate: "2026-10-31", now: duringDay }),
    );
    expect(resolved.persist).toBe(false);
    if (!resolved.persist) expect(resolved.reason).toBe("future_working_day");
  });

  it("marks Sunday as a weekly off", () => {
    const resolved = resolveAttendanceDay(
      input({ attendanceDate: "2026-11-01", now: afterCutoff }),
    );
    expect(resolved.persist && resolved.status).toBe("weekly_off");
  });

  it("marks every other Saturday off in a continuous cycle across months", () => {
    // October → November 2026 Saturdays must keep alternating without resetting each month.
    const saturdays = [
      "2026-10-03",
      "2026-10-10",
      "2026-10-17",
      "2026-10-24",
      "2026-10-31",
      "2026-11-07",
      "2026-11-14",
      "2026-11-21",
      "2026-11-28",
    ];
    for (let index = 1; index < saturdays.length; index += 1) {
      const previous = saturdays[index - 1];
      const current = saturdays[index];
      if (!previous || !current) continue;
      expect(saturdayCycleParity(previous)).not.toBe(saturdayCycleParity(current));
    }

    expect(isAlternateSaturdayOff("2026-10-03", "cycle_a")).toBe(
      saturdayCycleParity("2026-10-03") === 0,
    );
    expect(isAlternateSaturdayOff("2026-10-03", "cycle_b")).toBe(
      saturdayCycleParity("2026-10-03") === 1,
    );
    expect(isWeeklyOffDay("2026-10-03", [0], "none")).toBe(false);

    const offSaturday = saturdays.find((date) => isAlternateSaturdayOff(date, "cycle_a"));
    const workSaturday = saturdays.find((date) => !isAlternateSaturdayOff(date, "cycle_a"));
    expect(offSaturday).toBeTruthy();
    expect(workSaturday).toBeTruthy();

    const off = resolveAttendanceDay(
      input({
        attendanceDate: offSaturday!,
        now: afterCutoff,
        policy: { ...confirmed, alternateSaturdayOff: "cycle_a" },
      }),
    );
    expect(off.persist && off.status).toBe("weekly_off");

    const working = resolveAttendanceDay(
      input({
        attendanceDate: workSaturday!,
        now: afterCutoff,
        firstLoginAt: new Date(`${workSaturday}T04:30:00.000Z`),
        policy: { ...confirmed, alternateSaturdayOff: "cycle_a" },
      }),
    );
    expect(working.persist && working.status).toBe("present");

    const flipped = resolveAttendanceDay(
      input({
        attendanceDate: workSaturday!,
        now: afterCutoff,
        policy: { ...confirmed, alternateSaturdayOff: "cycle_b" },
      }),
    );
    expect(flipped.persist && flipped.status).toBe("weekly_off");
  });

  it("marks company and department holidays, and ignores another department", () => {
    const holidays = [
      { date: "2026-10-02", departmentId: null },
      { date: "2026-10-05", departmentId: "sales" },
      { date: "2026-10-06", departmentId: "content" },
    ];
    expect(isHoliday("2026-10-02", "sales", holidays)).toBe(true);
    expect(isHoliday("2026-10-05", "sales", holidays)).toBe(true);
    expect(isHoliday("2026-10-06", "sales", holidays)).toBe(false);
    const holiday = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-02",
        now: afterCutoff,
        holidays,
      }),
    );
    expect(holiday.persist && holiday.status).toBe("holiday");
  });

  it("does not mark dates before joining as absent", () => {
    const resolved = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-14",
        now: afterCutoff,
        joiningDate: "2026-10-15",
      }),
    );
    expect(resolved.persist && resolved.status).toBe("not_joined");
  });

  it("stops records after the employment end date and still counts the last day", () => {
    const lastDay = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-15",
        now: afterCutoff,
        exitDate: "2026-10-15",
      }),
    );
    const after = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-16",
        now: afterCutoff,
        exitDate: "2026-10-15",
      }),
    );
    expect(lastDay.persist && lastDay.status).toBe("on_leave");
    expect(lastDay.persist && lastDay.leaveCategory).toBe("unapproved");
    expect(after.persist).toBe(false);
  });

  it("uses the assigned shift instead of the company default for lateness", () => {
    const login = new Date("2026-10-30T08:40:00.000Z");
    const resolved = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-30",
        now: afterCutoff,
        firstLoginAt: login,
        shift: { startTime: "14:00", endTime: "22:00", weeklyOffDays: [0] },
      }),
    );
    expect(resolved.persist && resolved.status).toBe("present");
    expect(resolved.persist && resolved.isLate).toBe(false);
  });

  it("keeps an overnight shift on the start date across midnight", () => {
    const shift = { startTime: "22:00", endTime: "06:00", weeklyOffDays: [0] };
    const lateLogin = new Date("2026-10-30T17:00:00.000Z");
    const afterMidnight = new Date("2026-10-30T19:30:00.000Z");
    expect(loginMatchesDate(afterMidnight, "2026-10-30", shift.startTime, shift.endTime)).toBe(true);
    expect(loginMatchesDate(afterMidnight, "2026-10-31", shift.startTime, shift.endTime)).toBe(false);
    const resolved = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-30",
        now: new Date("2026-10-31T08:00:00+05:30"),
        firstLoginAt: lateLogin,
        shift,
      }),
    );
    expect(resolved.persist && resolved.status).toBe("present");
    expect(resolved.persist && resolved.isLate).toBe(true);
    expect(resolved.persist && resolved.lateByMinutes).toBe(15);
  });

  it("lets a late login upgrade an open day and refuses manual or finalized rows", () => {
    expect(canAutoUpdate({ isManuallyAdjusted: false, periodFinalized: false })).toBe(true);
    expect(canAutoUpdate({ isManuallyAdjusted: true, periodFinalized: false })).toBe(false);
    expect(canAutoUpdate({ isManuallyAdjusted: false, periodFinalized: true })).toBe(false);
  });

  it("requires super admin approval once a period is finalized and blocks future absences", () => {
    expect(
      correctionPermission({
        periodFinalized: true,
        role: "HR",
        status: "present",
        attendanceDate: "2026-10-01",
        today: "2026-10-30",
      }).allowed,
    ).toBe(false);
    const approved = correctionPermission({
      periodFinalized: true,
      role: "SuperAdmin",
      status: "present",
      attendanceDate: "2026-10-01",
      today: "2026-10-30",
    });
    expect(approved.allowed).toBe(true);
    expect(approved.requiresApproval).toBe(true);
    expect(
      correctionPermission({
        periodFinalized: false,
        role: "HR",
        status: "absent",
        attendanceDate: "2026-11-02",
        today: "2026-10-30",
      }).allowed,
    ).toBe(false);
  });

  it("builds a stable employee-date key", () => {
    expect(attendanceRecordKey("emp-1", "2026-10-30")).toBe("emp-1:2026-10-30");
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError({ writeErrors: [{ code: 11000 }, { code: 11000 }] })).toBe(true);
    expect(isDuplicateKeyError({ writeErrors: [{ code: 11000 }, { code: 2 }] })).toBe(false);
  });

  it("resolves historical shifts by effective date", () => {
    const chosen = shiftForDate(
      "2026-10-30",
      confirmed,
      [
        {
          startTime: "09:00",
          endTime: "17:00",
          weeklyOffDays: [0],
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-10-01",
        },
        {
          startTime: "14:00",
          endTime: "22:00",
          weeklyOffDays: [0, 6],
          effectiveFrom: "2026-10-02",
          effectiveTo: null,
        },
      ],
    );
    expect(chosen.startTime).toBe("14:00");
  });

  it("uses the designation shift, then the department shift, before the company default", () => {
    const departmentShifts = new Map([
      ["sales", { startTime: "09:30", endTime: "18:30", weeklyOffDays: [0] }],
    ]);
    const positionShifts = new Map([
      ["bde", { startTime: "11:00", endTime: "20:00", weeklyOffDays: [0] }],
    ]);
    const base = {
      date: "2026-10-06",
      policy: confirmed,
      personalShifts: [],
      departmentShifts,
      positionShifts,
    };
    expect(
      resolveWorkShift({ ...base, departmentId: "sales", jobPositionId: "bde" }).startTime,
    ).toBe("11:00");
    expect(
      resolveWorkShift({ ...base, departmentId: "sales", jobPositionId: "intern" }).startTime,
    ).toBe("09:30");
    expect(
      resolveWorkShift({ ...base, departmentId: "it", jobPositionId: null }).startTime,
    ).toBe("10:00");
    expect(
      resolveWorkShift({
        ...base,
        departmentId: "sales",
        jobPositionId: "bde",
        personalShifts: [
          {
            startTime: "22:00",
            endTime: "06:00",
            weeklyOffDays: [0],
            effectiveFrom: "2026-10-01",
            effectiveTo: null,
          },
        ],
      }).startTime,
    ).toBe("22:00");
  });

  it("reads department and designation from the names already stored on the employee", () => {
    const departmentIdByName = new Map([["sales", "sales-id"]]);
    const positionIdByDepartmentAndTitle = new Map([["sales-id\nbusiness development executive", "bde-id"]]);
    expect(
      attendanceOrgIds({
        departmentId: null,
        jobPositionId: null,
        departmentName: " Sales ",
        jobTitle: "Business Development Executive",
        departmentIdByName,
        positionIdByDepartmentAndTitle,
      }),
    ).toEqual({ departmentId: "sales-id", jobPositionId: "bde-id" });
    expect(
      attendanceOrgIds({
        departmentId: "stored-dept",
        jobPositionId: "stored-role",
        departmentName: "Sales",
        jobTitle: "Business Development Executive",
        departmentIdByName,
        positionIdByDepartmentAndTitle,
      }),
    ).toEqual({ departmentId: "stored-dept", jobPositionId: "stored-role" });
  });
});

describe("monthly employee eligibility", () => {
  it("keeps a former employee on the month they worked and removes them from later months", () => {
    const exitDate = attendanceExitDate({
      isActive: false,
      inactiveDate: "2026-09-30",
      today: "2026-10-30",
    });
    expect(
      overlapsAttendanceMonth({
        joiningDate: "2024-01-01",
        exitDate,
        monthStart: "2026-09-01",
        monthEnd: "2026-09-30",
      }),
    ).toBe(true);
    expect(
      overlapsAttendanceMonth({
        joiningDate: "2024-01-01",
        exitDate,
        monthStart: "2026-10-01",
        monthEnd: "2026-10-31",
      }),
    ).toBe(false);
  });

  it("hides an inactive employee with no exit date from the current month only", () => {
    const exitDate = attendanceExitDate({
      isActive: false,
      inactiveDate: null,
      today: "2026-10-30",
    });
    expect(exitDate).toBe("2026-09-30");
    expect(
      overlapsAttendanceMonth({
        joiningDate: "2024-06-01",
        exitDate,
        monthStart: "2026-09-01",
        monthEnd: "2026-09-30",
      }),
    ).toBe(true);
    expect(
      overlapsAttendanceMonth({
        joiningDate: "2024-06-01",
        exitDate,
        monthStart: "2026-10-01",
        monthEnd: "2026-10-31",
      }),
    ).toBe(false);
  });

  it("shows only people who had joined by that month", () => {
    expect(
      overlapsAttendanceMonth({
        joiningDate: "2026-10-10",
        exitDate: null,
        monthStart: "2026-09-01",
        monthEnd: "2026-09-30",
      }),
    ).toBe(false);
    expect(
      overlapsAttendanceMonth({
        joiningDate: "2026-10-10",
        exitDate: attendanceExitDate({ isActive: true, inactiveDate: null, today: "2026-10-30" }),
        monthStart: "2026-10-01",
        monthEnd: "2026-10-31",
      }),
    ).toBe(true);
  });
});

describe("loss of pay", () => {
  const afterCutoff = new Date("2026-10-30T19:00:00+05:30");
  const policy = {
    halfDayLopFactor: 0.5,
    lateCreatesLop: false,
    lateLopFactor: 0.25,
    lateGraceThresholdCount: 10,
  };

  it("calculates the illustrative month as 4 LOP days from the attendance records", () => {
    const days: DayContribution[] = [
      ...Array.from({ length: 22 }, () => day("present")),
      day("absent"),
      day("absent"),
      day("half_day"),
      day("half_day"),
      day("on_leave", "paid"),
      day("on_leave", "unpaid"),
    ];
    const summary = summarizeAttendance(days, policy);
    expect(summary.scheduledWorkingDays).toBe(28);
    expect(summary.presentDays).toBe(22);
    expect(summary.absentDays).toBe(2);
    expect(summary.halfDays).toBe(2);
    expect(summary.paidLeaveDays).toBe(1);
    expect(summary.unpaidLeaveDays).toBe(1);
    expect(summary.lopDays).toBe(4);
    expect(summary.presentEquivalents).toBe(24);
  });

  it("does not count paid leave, pending days, holidays, weekly offs, or lateness as LOP", () => {
    const summary = summarizeAttendance(
      [
        day("on_leave", "paid"),
        day("on_leave", "unpaid"),
        day("half_day"),
        day("pending_verification"),
        day("holiday"),
        day("weekly_off"),
        day("present", null, true),
        day("work_from_home"),
        day("not_joined"),
      ],
      policy,
    );
    expect(summary.lopDays).toBe(1.5);
    expect(summary.scheduledWorkingDays).toBe(6);
    expect(summary.holidays).toBe(1);
    expect(summary.weeklyOffs).toBe(1);
    expect(summary.notJoinedDays).toBe(1);
    expect(summary.lateArrivals).toBe(1);
    expect(summary.attendancePercentage).toBe(58.3);
  });

  it("adds threshold LOP once when grace-late present days reach the monthly count", () => {
    const nine = Array.from({ length: 9 }, () => day("present", null, true));
    const under = summarizeAttendance([...nine, day("half_day", null, true)], {
      halfDayLopFactor: 0.5,
      lateCreatesLop: true,
      lateLopFactor: 0.25,
      lateGraceThresholdCount: 10,
    });
    expect(under.lopDays).toBe(0.5);

    const ten = Array.from({ length: 10 }, () => day("present", null, true));
    const atThreshold = summarizeAttendance([...ten, day("half_day", null, true)], {
      halfDayLopFactor: 0.5,
      lateCreatesLop: true,
      lateLopFactor: 0.25,
      lateGraceThresholdCount: 10,
    });
    expect(atThreshold.lopDays).toBe(0.75);
    expect(atThreshold.lateArrivals).toBe(11);
  });

  it("marks login 30+ minutes after shift start as half day when late LOP rules are on", () => {
    const login = new Date("2026-10-30T05:00:00.000Z"); // 10:30 IST
    const resolved = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-30",
        now: afterCutoff,
        firstLoginAt: login,
        policy: {
          ...confirmed,
          lateCreatesLop: true,
          severeLateMinutes: 30,
        },
      }),
    );
    expect(resolved.persist && resolved.status).toBe("half_day");
    expect(resolved.persist && resolved.isLate).toBe(true);
    expect(resolved.persist && resolved.lateByMinutes).toBe(15);
  });

  it("keeps a mild late arrival as present when under the half-hour threshold", () => {
    // 10:20 IST = 5 min past 15-min grace, 20 min after shift start
    const mild = new Date("2026-10-30T04:50:00.000Z");
    const resolved = resolveAttendanceDay(
      input({
        attendanceDate: "2026-10-30",
        now: afterCutoff,
        firstLoginAt: mild,
        policy: {
          ...confirmed,
          lateCreatesLop: true,
          severeLateMinutes: 30,
        },
      }),
    );
    expect(resolved.persist && resolved.status).toBe("present");
    expect(resolved.persist && resolved.isLate).toBe(true);
    expect(resolved.persist && resolved.lateByMinutes).toBe(5);
  });

  it("returns zero percentage when there are no scheduled days", () => {
    const summary = summarizeAttendance([day("holiday"), day("weekly_off")], policy);
    expect(summary.attendancePercentage).toBe(0);
    expect(summary.lopDays).toBe(0);
  });
});

describe("leave categories in loss of pay", () => {
  const policy = {
    halfDayLopFactor: 0.5,
    lateCreatesLop: false,
    lateLopFactor: 0.25,
    lateGraceThresholdCount: 10,
    unplannedLeaveLopDays: 2,
  };

  const leave = (
    leaveCategory: "planned" | "unplanned" | null,
    leavePay: "paid" | "unpaid",
  ): DayContribution => ({ status: "on_leave", leavePay, leaveCategory, isLate: false });

  it("charges 2 LOP days for each explicitly marked unplanned leave day", () => {
    const summary = summarizeAttendance([leave("unplanned", "unpaid")], policy);
    expect(summary.lopDays).toBe(2);
    expect(summary.unplannedLeaveDays).toBe(1);
    expect(summary.unpaidLeaveDays).toBe(0);
    expect(summary.presentEquivalents).toBe(0);
    expect(summary.lopBreakdown.unplannedLeave).toBe(2);
  });

  it("keeps a system-detected absence at 1 LOP day", () => {
    const summary = summarizeAttendance([day("absent")], policy);
    expect(summary.lopDays).toBe(1);
    expect(summary.absentDays).toBe(1);
    expect(summary.lopBreakdown.absent).toBe(1);
  });

  it("treats a no-show stored as unapproved leave as 1 LOP day", () => {
    const summary = summarizeAttendance(
      [{ status: "on_leave", leavePay: "unpaid", leaveCategory: "unapproved", isLate: false }],
      policy,
    );
    expect(summary.lopDays).toBe(1);
    expect(summary.absentDays).toBe(1);
    expect(summary.unpaidLeaveDays).toBe(0);
    expect(summary.unplannedLeaveDays).toBe(0);
    expect(summary.lopBreakdown.absent).toBe(1);
  });

  it("follows the configured unplanned factor", () => {
    const summary = summarizeAttendance([leave("unplanned", "unpaid")], { ...policy, unplannedLeaveLopDays: 3 });
    expect(summary.lopDays).toBe(3);
  });

  it("defaults to 2 LOP days when the policy has no unplanned factor", () => {
    const { unplannedLeaveLopDays: _ignored, ...legacyPolicy } = policy;
    expect(summarizeAttendance([leave("unplanned", "unpaid")], legacyPolicy).lopDays).toBe(2);
  });

  it("treats leave saved before categories existed as planned", () => {
    const summary = summarizeAttendance([leave(null, "unpaid"), leave(null, "paid")], policy);
    expect(summary.lopDays).toBe(1);
    expect(summary.unpaidLeaveDays).toBe(1);
    expect(summary.paidLeaveDays).toBe(1);
    expect(summary.unplannedLeaveDays).toBe(0);
  });

  it("adds up planned paid, planned unpaid, unplanned, absent, and half-day LOP in one month", () => {
    const summary = summarizeAttendance(
      [
        ...Array.from({ length: 18 }, () => day("present")),
        leave("planned", "paid"),
        leave("planned", "unpaid"),
        leave("unplanned", "unpaid"),
        leave("unplanned", "unpaid"),
        day("absent"),
        day("half_day"),
      ],
      policy,
    );
    expect(summary.paidLeaveDays).toBe(1);
    expect(summary.unpaidLeaveDays).toBe(1);
    expect(summary.unplannedLeaveDays).toBe(2);
    // 1 planned unpaid + 4 unplanned + 1 absent + 0.5 half day
    expect(summary.lopDays).toBe(6.5);
    expect(summary.lopBreakdown).toEqual({
      absent: 1,
      halfDay: 0.5,
      plannedUnpaidLeave: 1,
      unplannedLeave: 4,
      late: 0,
    });
    const parts = Object.values(summary.lopBreakdown).reduce((sum, value) => sum + value, 0);
    expect(parts).toBe(summary.lopDays);
  });

  it("never lets reconcile rewrite a day that belongs to a leave request", () => {
    expect(canAutoUpdate({ isManuallyAdjusted: false, periodFinalized: false, leaveRequestId: "abc" })).toBe(false);
    expect(canAutoUpdate({ isManuallyAdjusted: false, periodFinalized: false, leaveRequestId: null })).toBe(true);
  });
});
