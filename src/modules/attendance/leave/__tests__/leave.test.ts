import {
  accrualStartMonth,
  classifyLeaveDay,
  enumerateLeaveDates,
  lopForLeaveDays,
  monthKeysBetween,
  planAccruals,
  prorateAccrual,
  rangesOverlap,
  splitLeaveDays,
  validateLeaveWindow,
  wholePaidDaysAvailable,
} from "@/modules/attendance/leave/calculate";
import {
  DEFAULT_ATTENDANCE_POLICY,
  DEFAULT_LEAVE_POLICY,
  type AttendancePolicyRules,
} from "@/modules/attendance/types";

const policy: AttendancePolicyRules = { ...DEFAULT_ATTENDANCE_POLICY, confirmed: true };
const windowPolicy = { plannedLeaveMinNoticeDays: 1, unplannedBackdateDays: 7 };
const dayShift = { startTime: "10:00", endTime: "18:30", weeklyOffDays: [0] };

describe("splitLeaveDays", () => {
  const days = ["2026-11-18", "2026-11-19", "2026-11-20"];

  it("pays the earliest planned days from the balance and leaves the rest unpaid", () => {
    const split = splitLeaveDays({ workingDays: days, category: "planned", balance: 1.5, unplannedLopDays: 2 });
    expect(split.days.map((day) => day.pay)).toEqual(["paid", "unpaid", "unpaid"]);
    expect(split.paidDays).toBe(1);
    expect(split.unpaidDays).toBe(2);
    expect(split.lopDays).toBe(2);
  });

  it("charges no loss of pay when the balance covers every planned day", () => {
    const split = splitLeaveDays({ workingDays: days, category: "planned", balance: 10, unplannedLopDays: 2 });
    expect(split.paidDays).toBe(3);
    expect(split.lopDays).toBe(0);
  });

  it("makes every planned day unpaid when there is no balance", () => {
    const split = splitLeaveDays({ workingDays: days, category: "planned", balance: 0, unplannedLopDays: 2 });
    expect(split.paidDays).toBe(0);
    expect(split.lopDays).toBe(3);
  });

  it("sorts the days before paying the earliest ones", () => {
    const split = splitLeaveDays({
      workingDays: ["2026-11-20", "2026-11-18"],
      category: "planned",
      balance: 1,
      unplannedLopDays: 2,
    });
    expect(split.days[0]).toEqual({ date: "2026-11-18", pay: "paid", category: "planned" });
  });

  it("charges 2 LOP days for every unplanned day and never spends the balance", () => {
    const split = splitLeaveDays({ workingDays: days, category: "unplanned", balance: 20, unplannedLopDays: 2 });
    expect(split.paidDays).toBe(0);
    expect(split.unpaidDays).toBe(3);
    expect(split.lopDays).toBe(6);
    expect(split.days.every((day) => day.category === "unplanned" && day.pay === "unpaid")).toBe(true);
  });

  it("follows the configured unplanned LOP factor", () => {
    const split = splitLeaveDays({ workingDays: ["2026-11-18"], category: "unplanned", balance: 0, unplannedLopDays: 3 });
    expect(split.lopDays).toBe(3);
  });
});

describe("lopForLeaveDays and whole paid days", () => {
  it("adds 1 per unpaid planned day and the factor per unplanned day", () => {
    expect(
      lopForLeaveDays(
        [
          { date: "2026-11-18", pay: "paid", category: "planned" },
          { date: "2026-11-19", pay: "unpaid", category: "planned" },
          { date: "2026-11-20", pay: "unpaid", category: "unplanned" },
        ],
        2,
      ),
    ).toBe(3);
  });

  it("only counts whole paid days from a fractional balance", () => {
    expect(wholePaidDaysAvailable(1.5)).toBe(1);
    expect(wholePaidDaysAvailable(0.5)).toBe(0);
    expect(wholePaidDaysAvailable(-3)).toBe(0);
  });
});

describe("paid leave accrual", () => {
  it("gives the full credit for months after the joining month", () => {
    expect(prorateAccrual({ joiningDate: "2026-09-10", monthKey: "2026-10", monthlyAccrual: 1.5 })).toBe(1.5);
    expect(prorateAccrual({ joiningDate: null, monthKey: "2026-10", monthlyAccrual: 1.5 })).toBe(1.5);
  });

  it("gives nothing for a month before joining", () => {
    expect(prorateAccrual({ joiningDate: "2026-11-02", monthKey: "2026-10", monthlyAccrual: 1.5 })).toBe(0);
  });

  it("shares the joining month by days employed, rounded to half a day", () => {
    expect(prorateAccrual({ joiningDate: "2026-10-01", monthKey: "2026-10", monthlyAccrual: 1.5 })).toBe(1.5);
    expect(prorateAccrual({ joiningDate: "2026-10-16", monthKey: "2026-10", monthlyAccrual: 1.5 })).toBe(1);
    expect(prorateAccrual({ joiningDate: "2026-10-31", monthKey: "2026-10", monthlyAccrual: 1.5 })).toBe(0);
  });

  it("starts at the later of the joining month and the policy start month", () => {
    expect(accrualStartMonth("2020-01-15", "2026-11", "2026-11")).toBe("2026-11");
    expect(accrualStartMonth("2026-12-03", "2026-11", "2026-12")).toBe("2026-12");
    expect(accrualStartMonth(null, "", "2026-11")).toBe("2026-11");
  });

  it("lists month keys across a year end", () => {
    expect(monthKeysBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(monthKeysBetween("2026-12", "2026-11")).toEqual([]);
  });

  const accrualPolicy = { ...DEFAULT_LEAVE_POLICY, paidLeaveMonthlyAccrual: 1.5 };

  it("credits every month that has not been accrued yet", () => {
    const entries = planAccruals({
      startMonth: "2026-10",
      throughMonth: "2026-12",
      accruedMonths: new Set(["2026-10"]),
      joiningDate: "2020-01-01",
      currentBalance: 1.5,
      policy: accrualPolicy,
    });
    expect(entries).toEqual([
      { monthKey: "2026-11", entryType: "accrual", days: 1.5 },
      { monthKey: "2026-12", entryType: "accrual", days: 1.5 },
    ]);
  });

  it("posts nothing when every month is already accrued", () => {
    const entries = planAccruals({
      startMonth: "2026-10",
      throughMonth: "2026-11",
      accruedMonths: new Set(["2026-10", "2026-11"]),
      joiningDate: null,
      currentBalance: 3,
      policy: accrualPolicy,
    });
    expect(entries).toEqual([]);
  });

  it("never lifts the balance above the maximum but still records the month", () => {
    const entries = planAccruals({
      startMonth: "2026-10",
      throughMonth: "2026-11",
      accruedMonths: new Set(),
      joiningDate: null,
      currentBalance: 23,
      policy: { ...accrualPolicy, paidLeaveMaxBalance: 24 },
    });
    expect(entries).toEqual([
      { monthKey: "2026-10", entryType: "accrual", days: 1 },
      { monthKey: "2026-11", entryType: "accrual", days: 0 },
    ]);
  });

  it("trims the balance to the carry-forward cap when January starts", () => {
    const entries = planAccruals({
      startMonth: "2026-12",
      throughMonth: "2027-01",
      accruedMonths: new Set(["2026-12"]),
      joiningDate: null,
      currentBalance: 20,
      policy: { ...accrualPolicy, paidLeaveCarryForwardCap: 12, paidLeaveMaxBalance: 24 },
    });
    expect(entries).toEqual([
      { monthKey: "2027-01", entryType: "cap_trim", days: -8 },
      { monthKey: "2027-01", entryType: "accrual", days: 1.5 },
    ]);
  });
});

describe("validateLeaveWindow", () => {
  const today = "2026-11-17";
  const base = { today, exempt: false, policy: windowPolicy };

  it("asks for notice on planned leave", () => {
    expect(validateLeaveWindow({ ...base, leaveType: "planned", fromDate: "2026-11-17", toDate: "2026-11-17" }).ok).toBe(false);
    expect(validateLeaveWindow({ ...base, leaveType: "planned", fromDate: "2026-11-18", toDate: "2026-11-19" }).ok).toBe(true);
  });

  it("lets HR file planned leave without notice", () => {
    expect(
      validateLeaveWindow({ ...base, exempt: true, leaveType: "planned", fromDate: "2026-11-17", toDate: "2026-11-17" }).ok,
    ).toBe(true);
  });

  it("rejects unplanned leave that starts in the future", () => {
    const result = validateLeaveWindow({ ...base, leaveType: "unplanned", fromDate: "2026-11-18", toDate: "2026-11-18" });
    expect(result.ok).toBe(false);
  });

  it("accepts unplanned leave that starts today or within the backdate window", () => {
    expect(validateLeaveWindow({ ...base, leaveType: "unplanned", fromDate: "2026-11-17", toDate: "2026-11-18" }).ok).toBe(true);
    expect(validateLeaveWindow({ ...base, leaveType: "unplanned", fromDate: "2026-11-10", toDate: "2026-11-10" }).ok).toBe(true);
  });

  it("rejects unplanned leave older than the backdate window unless HR files it", () => {
    const old = { leaveType: "unplanned" as const, fromDate: "2026-11-09", toDate: "2026-11-09" };
    expect(validateLeaveWindow({ ...base, ...old }).ok).toBe(false);
    expect(validateLeaveWindow({ ...base, ...old, exempt: true }).ok).toBe(true);
  });

  it("rejects unplanned leave that runs too far past today", () => {
    expect(validateLeaveWindow({ ...base, leaveType: "unplanned", fromDate: "2026-11-17", toDate: "2026-11-25" }).ok).toBe(false);
  });

  it("rejects reversed and over-long ranges", () => {
    expect(validateLeaveWindow({ ...base, leaveType: "planned", fromDate: "2026-11-20", toDate: "2026-11-19" }).ok).toBe(false);
    expect(validateLeaveWindow({ ...base, leaveType: "planned", fromDate: "2026-12-01", toDate: "2027-02-01" }).ok).toBe(false);
  });
});

describe("classifyLeaveDay", () => {
  const now = new Date("2026-11-17T12:00:00+05:30");
  const input = (attendanceDate: string, overrides: Partial<Parameters<typeof classifyLeaveDay>[0]> = {}) => ({
    attendanceDate,
    now,
    policy,
    joiningDate: "2020-01-01",
    exitDate: null,
    departmentId: "sales",
    holidays: [],
    shift: dayShift,
    ...overrides,
  });

  it("treats future and past weekdays as working days", () => {
    expect(classifyLeaveDay(input("2026-11-18"))).toBe("working");
    expect(classifyLeaveDay(input("2026-11-16"))).toBe("working");
  });

  it("skips weekly offs, holidays, days before joining, and days after exit", () => {
    expect(classifyLeaveDay(input("2026-11-15"))).toBe("weekly_off");
    expect(classifyLeaveDay(input("2026-11-18", { holidays: [{ date: "2026-11-18", departmentId: null }] }))).toBe("holiday");
    expect(classifyLeaveDay(input("2026-11-18", { joiningDate: "2026-11-20" }))).toBe("not_joined");
    expect(classifyLeaveDay(input("2026-11-18", { exitDate: "2026-11-16" }))).toBe("after_exit");
  });
});

describe("date ranges", () => {
  it("lists dates inclusively", () => {
    expect(enumerateLeaveDates("2026-11-18", "2026-11-20")).toEqual(["2026-11-18", "2026-11-19", "2026-11-20"]);
  });

  it("detects overlapping ranges", () => {
    expect(rangesOverlap({ fromDate: "2026-11-18", toDate: "2026-11-20" }, { fromDate: "2026-11-20", toDate: "2026-11-22" })).toBe(true);
    expect(rangesOverlap({ fromDate: "2026-11-18", toDate: "2026-11-19" }, { fromDate: "2026-11-20", toDate: "2026-11-22" })).toBe(false);
  });
});
