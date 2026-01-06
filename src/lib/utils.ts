import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRandomColor() {
  const colors = [
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#800080",
    "#008000",
    "#000080",
    "#008080",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Date handling utilities for interview scheduling
 * 
 * CRITICAL: These functions ensure dates are handled consistently as calendar dates
 * in the user's local timezone, preventing off-by-one day errors caused by UTC conversion.
 * 
 * The core principle: A date selected by the user (e.g., "January 7") should always
 * be stored, displayed, and validated as "January 7" regardless of timezone offsets.
 */

/**
 * Converts a Date object to a YYYY-MM-DD string using LOCAL date components.
 * This prevents timezone shifts that occur with toISOString().
 * 
 * Example: If user selects Jan 7 at midnight IST (+05:30), toISOString() would
 * give "2025-01-06T18:30:00.000Z" (Jan 6 UTC), but this function returns "2025-01-07".
 * 
 * @param date - The Date object to convert
 * @returns YYYY-MM-DD string in local timezone
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string to a Date object at LOCAL midnight.
 * This ensures the date represents the intended calendar date in the user's timezone.
 * 
 * @param dateString - YYYY-MM-DD format string
 * @returns Date object at local midnight
 */
export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  // Create date at local midnight (month is 0-indexed in Date constructor)
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Normalizes a Date to local midnight for consistent comparisons.
 * This ensures date comparisons ignore time components and timezone offsets.
 * 
 * @param date - Date to normalize
 * @returns New Date object at local midnight
 */
export function normalizeToLocalMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Gets today's date normalized to local midnight.
 * 
 * @returns Date object representing today at local midnight
 */
export function getTodayLocalMidnight(): Date {
  return normalizeToLocalMidnight(new Date());
}

/**
 * Checks if a date is before today (strictly in the past).
 * Uses local date comparisons to avoid timezone issues.
 * 
 * @param date - Date to check
 * @returns true if date is before today
 */
export function isDateBeforeToday(date: Date): boolean {
  const today = getTodayLocalMidnight();
  const checkDate = normalizeToLocalMidnight(date);
  return checkDate < today;
}

/**
 * Checks if a date is today or in the future.
 * Uses local date comparisons to avoid timezone issues.
 * 
 * @param date - Date to check
 * @returns true if date is today or future
 */
export function isDateTodayOrFuture(date: Date): boolean {
  const today = getTodayLocalMidnight();
  const checkDate = normalizeToLocalMidnight(date);
  return checkDate >= today;
}

/**
 * Formats a date from the database (Date object or ISO string) for display.
 * This function ensures dates are displayed correctly regardless of how they were stored.
 * 
 * When MongoDB stores a date, it converts it to UTC. When we retrieve it, we need to
 * ensure the calendar date is preserved correctly for display.
 * 
 * @param date - Date object, ISO string, or YYYY-MM-DD string from database
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatDateForDisplay(
  date: Date | string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "N/A";
  
  try {
    let dateObj: Date;
    
    if (typeof date === "string") {
      // If it's a YYYY-MM-DD string, parse as local date
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dateObj = parseLocalDateString(date);
      } else {
        // Otherwise, it's an ISO string - parse normally
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    // Format using local timezone
    return dateObj.toLocaleDateString("en-US", options || {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}
