import {
  daysInPayrollMonth,
  type PayrollMonth,
} from "@/modules/finance/salary-month";

/** Same fixed offset as getIstDayBounds in employeeActivitySession (Asia/Kolkata, no DST). */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DATE_KEY = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const OVERNIGHT_EARLY_MS = 2 * 60 * 60 * 1000;
const CUTOFF_GRACE_AFTER_SHIFT_MS = 6 * 60 * 60 * 1000;

export function istDateKey(value: Date): string {
  const ist = new Date(value.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isAttendanceDateKey(value: string): boolean {
  const match = DATE_KEY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function addAttendanceDays(dateKey: string, count: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const utc = new Date(Date.UTC(year, month - 1, day + count));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

export function compareDateKeys(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** IST midnight to next IST midnight. Aligns with getIstDayBounds for the same calendar day. */
export function istDayBounds(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00+05:30`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function weekdayIndex(dateKey: string): number {
  const instant = new Date(`${dateKey}T00:00:00+05:30`);
  const ist = new Date(instant.getTime() + IST_OFFSET_MS);
  return ist.getUTCDay();
}

export function parseClock(value: string): { hours: number; minutes: number } | null {
  const match = CLOCK.exec(value.trim());
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function clockOnDate(dateKey: string, clock: string): Date {
  const parsed = parseClock(clock);
  if (!parsed || !isAttendanceDateKey(dateKey)) {
    throw new Error("Invalid attendance clock");
  }
  const hours = String(parsed.hours).padStart(2, "0");
  const minutes = String(parsed.minutes).padStart(2, "0");
  return new Date(`${dateKey}T${hours}:${minutes}:00+05:30`);
}

export function shiftWindow(
  dateKey: string,
  startTime: string,
  endTime: string,
): { start: Date; end: Date; overnight: boolean } {
  const start = clockOnDate(dateKey, startTime);
  const endSameDay = clockOnDate(dateKey, endTime);
  if (endSameDay.getTime() > start.getTime()) {
    return { start, end: endSameDay, overnight: false };
  }
  return {
    start,
    end: clockOnDate(addAttendanceDays(dateKey, 1), endTime),
    overnight: true,
  };
}

/**
 * Day shifts use the IST calendar day so an early office login still counts.
 * Overnight shifts use the shift start date, from two hours before start through shift end.
 */
export function loginMatchesDate(
  loginAt: Date,
  attendanceDate: string,
  startTime: string,
  endTime: string,
): boolean {
  const window = shiftWindow(attendanceDate, startTime, endTime);
  if (!window.overnight) {
    const bounds = istDayBounds(attendanceDate);
    return (
      loginAt.getTime() >= bounds.start.getTime() &&
      loginAt.getTime() < bounds.end.getTime()
    );
  }
  return (
    loginAt.getTime() >= window.start.getTime() - OVERNIGHT_EARLY_MS &&
    loginAt.getTime() <= window.end.getTime()
  );
}

export function cutoffInstant(
  window: { start: Date; end: Date },
  cutoffTime: string,
  attendanceDate: string,
): Date {
  const options = [window.end.getTime()];
  const onStart = clockOnDate(attendanceDate, cutoffTime);
  if (onStart.getTime() >= window.start.getTime()) options.push(onStart.getTime());
  const endDate = istDateKey(window.end);
  const onEndDate = clockOnDate(endDate, cutoffTime);
  if (
    onEndDate.getTime() >= window.end.getTime() &&
    onEndDate.getTime() - window.end.getTime() <= CUTOFF_GRACE_AFTER_SHIFT_MS
  ) {
    options.push(onEndDate.getTime());
  }
  return new Date(Math.max(...options));
}

export function datesInPayrollMonth(month: PayrollMonth): string[] {
  const count = daysInPayrollMonth(month);
  const start = `${month.key}-01`;
  return Array.from({ length: count }, (_, index) => addAttendanceDays(start, index));
}

export function earliestInstant(values: Date[]): Date | null {
  if (values.length === 0) return null;
  return values.reduce((min, value) => (value.getTime() < min.getTime() ? value : min));
}

export function attendanceRecordKey(employeeId: string, attendanceDate: string): string {
  return `${employeeId}:${attendanceDate}`;
}

export function formatLoginIst(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatAttendanceDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
