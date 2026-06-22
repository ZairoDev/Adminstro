/** Local-calendar day key helpers for dashboard date navigation. */

export const MAX_LEADS_DAY_LOOKBACK = 90;

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getDayBounds(dateKey?: string): { start: Date; end: Date } {
  const base = dateKey ? parseDateKey(dateKey) : new Date();
  return {
    start: startOfLocalDay(base),
    end: endOfLocalDay(base),
  };
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameLocalDay(date, new Date());
}

export function addLocalDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return startOfLocalDay(next);
}

export function canNavigateToDay(date: Date): boolean {
  const today = startOfLocalDay(new Date());
  if (date > today) return false;

  const earliest = addLocalDays(today, -MAX_LEADS_DAY_LOOKBACK);
  return date >= earliest;
}

export function canGoToNextDay(selectedDate: Date): boolean {
  return !isToday(selectedDate);
}

export function canGoToPreviousDay(selectedDate: Date): boolean {
  const prev = addLocalDays(selectedDate, -1);
  return canNavigateToDay(prev);
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function generateRecentDays(count = 30): Date[] {
  const today = startOfLocalDay(new Date());
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    days.push(addLocalDays(today, -i));
  }
  return days;
}
