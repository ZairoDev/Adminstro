import { resolveAttendanceDay, roundLop } from "@/modules/attendance/calculate";
import { addAttendanceDays, compareDateKeys, isAttendanceDateKey } from "@/modules/attendance/dates";
import {
  MAX_LEAVE_RANGE_DAYS,
  UNPLANNED_MAX_FUTURE_DAYS,
  type LeaveDay,
  type LeaveDayKind,
  type LeaveSplit,
  type LeaveWindowCheck,
} from "@/modules/attendance/leave/types";
import type {
  LeaveCategory,
  LeavePolicyRules,
  ResolveDayInput,
} from "@/modules/attendance/types";

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Every date from `from` to `to`, inclusive. Stops at one past the maximum range. */
export function enumerateLeaveDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (compareDateKeys(cursor, to) <= 0 && dates.length <= MAX_LEAVE_RANGE_DAYS) {
    dates.push(cursor);
    cursor = addAttendanceDays(cursor, 1);
  }
  return dates;
}

/** Whether a calendar day can carry leave. Holidays, weekly offs and days outside employment cannot. */
export function classifyLeaveDay(
  input: Omit<ResolveDayInput, "firstLoginAt" | "qualifyingLoginCount">,
): LeaveDayKind {
  const resolved = resolveAttendanceDay({ ...input, firstLoginAt: null, qualifyingLoginCount: 0 });
  if (!resolved.persist) return resolved.reason === "after_exit" ? "after_exit" : "working";
  if (resolved.status === "holiday") return "holiday";
  if (resolved.status === "weekly_off") return "weekly_off";
  if (resolved.status === "not_joined") return "not_joined";
  return "working";
}

/** Paid days are counted in whole days, so a 1.5 balance covers one paid day. */
export function wholePaidDaysAvailable(balance: number): number {
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  return Math.floor(balance + 1e-9);
}

/** LOP days a set of leave days adds to the month. */
export function lopForLeaveDays(days: LeaveDay[], unplannedLopDays: number): number {
  let lop = 0;
  for (const day of days) {
    if (day.category === "unplanned") lop += unplannedLopDays;
    else if (day.pay === "unpaid") lop += 1;
  }
  return roundLop(lop);
}

/**
 * Planned leave spends the paid balance on the earliest days and the rest is unpaid.
 * Unplanned leave is always unpaid, never touches the balance, and costs extra LOP.
 */
export function splitLeaveDays(input: {
  workingDays: string[];
  category: LeaveCategory;
  balance: number;
  unplannedLopDays: number;
}): LeaveSplit {
  const ordered = [...input.workingDays].sort(compareDateKeys);
  if (input.category === "unplanned") {
    const days: LeaveDay[] = ordered.map((date) => ({ date, pay: "unpaid", category: "unplanned" }));
    return {
      days,
      paidDays: 0,
      unpaidDays: days.length,
      lopDays: lopForLeaveDays(days, input.unplannedLopDays),
    };
  }
  const paidCount = Math.min(ordered.length, wholePaidDaysAvailable(input.balance));
  const days: LeaveDay[] = ordered.map((date, index) => ({
    date,
    pay: index < paidCount ? "paid" : "unpaid",
    category: "planned",
  }));
  return {
    days,
    paidDays: paidCount,
    unpaidDays: days.length - paidCount,
    lopDays: lopForLeaveDays(days, input.unplannedLopDays),
  };
}

export function daysInMonthKey(monthKey: string): number {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonthKeys(monthKey: string, count: number): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7)) - 1 + count;
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Month keys from `start` through `end`, inclusive. Empty when `start` is after `end`. */
export function monthKeysBetween(start: string, end: string): string[] {
  const keys: string[] = [];
  let cursor = start;
  while (cursor <= end && keys.length < 600) {
    keys.push(cursor);
    cursor = addMonthKeys(cursor, 1);
  }
  return keys;
}

/** The joining month earns a share of the monthly credit, rounded to the nearest half day. */
export function prorateAccrual(input: {
  joiningDate: string | null;
  monthKey: string;
  monthlyAccrual: number;
}): number {
  if (input.monthlyAccrual <= 0) return 0;
  const { joiningDate, monthKey, monthlyAccrual } = input;
  if (!joiningDate) return monthlyAccrual;
  const joiningMonth = monthKeyOf(joiningDate);
  if (joiningMonth > monthKey) return 0;
  if (joiningMonth < monthKey) return monthlyAccrual;
  const monthDays = daysInMonthKey(monthKey);
  const employedDays = monthDays - Number(joiningDate.slice(8, 10)) + 1;
  const share = (monthlyAccrual * employedDays) / monthDays;
  return Math.round(share * 2) / 2;
}

/** First month that earns paid leave: the later of the joining month and the policy start month. */
export function accrualStartMonth(
  joiningDate: string | null,
  policyStartMonth: string,
  fallbackMonth: string,
): string {
  const joiningMonth = joiningDate ? monthKeyOf(joiningDate) : "";
  const start = policyStartMonth || fallbackMonth;
  if (!joiningMonth) return start;
  return joiningMonth > start ? joiningMonth : start;
}

export type PlannedAccrualEntry = {
  monthKey: string;
  entryType: "accrual" | "cap_trim";
  days: number;
};

/**
 * Entries still owed for the months that have no accrual yet, applied in month order.
 * The balance is trimmed to the carry-forward cap when January starts, and an accrual
 * never lifts the balance above the maximum. A zero-day accrual is still recorded so the
 * month counts as processed and can never be credited later.
 */
export function planAccruals(input: {
  startMonth: string;
  throughMonth: string;
  accruedMonths: ReadonlySet<string>;
  joiningDate: string | null;
  currentBalance: number;
  policy: Pick<
    LeavePolicyRules,
    "paidLeaveMonthlyAccrual" | "paidLeaveCarryForwardCap" | "paidLeaveMaxBalance"
  >;
}): PlannedAccrualEntry[] {
  const entries: PlannedAccrualEntry[] = [];
  let balance = input.currentBalance;
  for (const monthKey of monthKeysBetween(input.startMonth, input.throughMonth)) {
    if (input.accruedMonths.has(monthKey)) continue;
    if (monthKey.endsWith("-01") && balance > input.policy.paidLeaveCarryForwardCap) {
      const trim = roundLop(input.policy.paidLeaveCarryForwardCap - balance);
      entries.push({ monthKey, entryType: "cap_trim", days: trim });
      balance += trim;
    }
    const earned = prorateAccrual({
      joiningDate: input.joiningDate,
      monthKey,
      monthlyAccrual: input.policy.paidLeaveMonthlyAccrual,
    });
    const room = Math.max(0, input.policy.paidLeaveMaxBalance - balance);
    const credited = roundLop(Math.min(earned, room));
    entries.push({ monthKey, entryType: "accrual", days: credited });
    balance += credited;
  }
  return entries;
}

export function rangesOverlap(
  left: { fromDate: string; toDate: string },
  right: { fromDate: string; toDate: string },
): boolean {
  return left.fromDate <= right.toDate && right.fromDate <= left.toDate;
}

/**
 * Date rules for a new request. People with leave authority (`exempt`) may file on behalf of
 * staff, so they skip the notice and backdate windows.
 */
export function validateLeaveWindow(input: {
  leaveType: LeaveCategory;
  fromDate: string;
  toDate: string;
  today: string;
  exempt: boolean;
  policy: Pick<LeavePolicyRules, "plannedLeaveMinNoticeDays" | "unplannedBackdateDays">;
}): LeaveWindowCheck {
  const { leaveType, fromDate, toDate, today, exempt, policy } = input;
  if (!isAttendanceDateKey(fromDate) || !isAttendanceDateKey(toDate)) {
    return { ok: false, message: "Choose valid leave dates" };
  }
  if (compareDateKeys(fromDate, toDate) > 0) {
    return { ok: false, message: "The end date cannot be before the start date" };
  }
  if (enumerateLeaveDates(fromDate, toDate).length > MAX_LEAVE_RANGE_DAYS) {
    return { ok: false, message: `One request can cover at most ${MAX_LEAVE_RANGE_DAYS} days` };
  }
  if (leaveType === "planned") {
    if (!exempt) {
      const earliest = addAttendanceDays(today, policy.plannedLeaveMinNoticeDays);
      if (compareDateKeys(fromDate, earliest) < 0) {
        return {
          ok: false,
          message:
            policy.plannedLeaveMinNoticeDays > 0
              ? `Planned leave needs ${policy.plannedLeaveMinNoticeDays} day(s) notice. If this leave was not planned, mark it as unplanned leave`
              : "Planned leave cannot start in the past. If this leave was not planned, mark it as unplanned leave",
        };
      }
    }
    return { ok: true };
  }
  if (compareDateKeys(fromDate, today) > 0) {
    return { ok: false, message: "Unplanned leave must start today or earlier. Use planned leave for future dates" };
  }
  if (compareDateKeys(toDate, addAttendanceDays(today, UNPLANNED_MAX_FUTURE_DAYS)) > 0) {
    return {
      ok: false,
      message: `Unplanned leave can run at most ${UNPLANNED_MAX_FUTURE_DAYS} days past today`,
    };
  }
  if (!exempt) {
    const earliest = addAttendanceDays(today, -policy.unplannedBackdateDays);
    if (compareDateKeys(fromDate, earliest) < 0) {
      return {
        ok: false,
        message: `Unplanned leave can only be marked up to ${policy.unplannedBackdateDays} day(s) back. Ask HR to mark it`,
      };
    }
  }
  return { ok: true };
}
