/**
 * Calendar-day boundaries for the sales guest initiation limit.
 * Resets at local midnight (12:00 AM) in the configured timezone.
 */
export const GUEST_INITIATION_TIMEZONE =
  process.env.WHATSAPP_DAILY_LIMIT_TIMEZONE?.trim() || "Asia/Kolkata";

export function todayDateKey(timeZone = GUEST_INITIATION_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateKeyForInstant(
  at: Date,
  timeZone = GUEST_INITIATION_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function getTimezoneOffsetMs(at: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(at);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - at.getTime();
}

export function dayBoundsForDateKey(
  dateKey: string,
  timeZone = GUEST_INITIATION_TIMEZONE,
): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const midnightGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const start = new Date(
    midnightGuess - getTimezoneOffsetMs(new Date(midnightGuess), timeZone),
  );

  const nextKey = nextDateKey(dateKey);
  const [y2, m2, d2] = nextKey.split("-").map(Number);
  const nextMidnightGuess = Date.UTC(y2, m2 - 1, d2, 0, 0, 0);
  const end = new Date(
    nextMidnightGuess -
      getTimezoneOffsetMs(new Date(nextMidnightGuess), timeZone),
  );

  return { start, end };
}
