import { subDays } from "date-fns";

/**
 * Converts a date string (YYYY-MM-DD) to IST start of day in UTC.
 * IST midnight = 18:30:00 UTC previous day.
 */
export function getISTStartOfDay(dateInput: Date | string): Date {
  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  }

  const utcDate = Date.UTC(year, month, day, 0, 0, 0, 0);
  return new Date(utcDate - 5.5 * 60 * 60 * 1000);
}

/** Exclusive upper bound for IST date range queries. */
export function getISTEndOfDay(dateInput: Date | string): Date {
  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  }

  const currentDate = new Date(year, month, day);
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const nextYear = nextDate.getFullYear();
  const nextMonth = nextDate.getMonth() + 1;
  const nextDay = nextDate.getDate();

  return getISTStartOfDay(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`,
  );
}

export function buildCreatedAtRangeQuery(
  fromDate: string,
  toDate: string,
): Record<string, { $gte: Date; $lt: Date }> {
  return {
    createdAt: {
      $gte: getISTStartOfDay(fromDate),
      $lt: getISTEndOfDay(toDate),
    },
  };
}

export function buildDateFilterQuery(
  dateFilter: string,
  customDays: number,
  startDate?: string | null,
  endDate?: string | null,
): Record<string, unknown> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = subDays(today, 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  switch (dateFilter) {
    case "today":
      return buildCreatedAtRangeQuery(todayStr, todayStr);
    case "yesterday":
      return buildCreatedAtRangeQuery(yesterdayStr, yesterdayStr);
    case "lastDays":
      if (customDays > 0) {
        const pastDate = subDays(today, customDays);
        const pastDateStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, "0")}-${String(pastDate.getDate()).padStart(2, "0")}`;
        return { createdAt: { $gte: getISTStartOfDay(pastDateStr) } };
      }
      return {};
    case "customRange":
      if (startDate && endDate) {
        return buildCreatedAtRangeQuery(startDate, endDate);
      }
      return {};
    default:
      return {};
  }
}
