/**
 * Helper functions to detect today's birthdays and work anniversaries
 * with timezone-safe date comparison
 */

export interface BirthdayEvent {
  employeeId: string;
  firstName: string;
  fullName: string;
  isCurrentUser: boolean;
}

export interface AnniversaryEvent {
  employeeId: string;
  firstName: string;
  fullName: string;
  years: number;
  isCurrentUser: boolean;
}

export interface TodaysEvents {
  birthdays: BirthdayEvent[];
  anniversaries: AnniversaryEvent[];
  hasEvents: boolean;
}

/**
 * Normalizes a date to local timezone start-of-day for safe comparison
 * Handles various date formats and invalid dates gracefully
 */
function normalizeToLocalDate(dateValue: any): Date | null {
  if (!dateValue || dateValue === "" || dateValue === "null" || dateValue === "undefined") {
    return null;
  }

  try {
    let date: Date;

    if (typeof dateValue === "string") {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = new Date(dateValue);
    } else if (typeof dateValue === "number") {
      date = new Date(dateValue);
    } else {
      date = new Date(String(dateValue));
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if a date matches today (month and day only, ignoring year)
 */
function isDateToday(dateValue: any): boolean {
  const date = normalizeToLocalDate(dateValue);
  if (!date) return false;

  const today = new Date();
  const todayMonth = today.getMonth(); // 0-11
  const todayDate = today.getDate(); // 1-31

  const dateMonth = date.getMonth();
  const dateDay = date.getDate();

  return dateMonth === todayMonth && dateDay === todayDate;
}

/**
 * Calculates years between a date and today
 */
function calculateYears(dateValue: any): number | null {
  const date = normalizeToLocalDate(dateValue);
  if (!date) return null;

  const today = new Date();
  let years = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  // Adjust if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    years--;
  }

  return years >= 0 ? years : null;
}

/**
 * Extracts first name from full name
 */
function getFirstName(fullName: string | null | undefined): string {
  if (!fullName || typeof fullName !== "string") return "Colleague";
  return fullName.trim().split(" ")[0];
}

/**
 * Main function to detect today's events from employee list
 */
export function getTodaysEvents(
  employees: Array<{
    _id: string;
    name?: string | null;
    dateOfBirth?: any;
    dateOfJoining?: any;
  }>,
  currentUserId?: string | null
): TodaysEvents {
  const birthdays: BirthdayEvent[] = [];
  const anniversaries: AnniversaryEvent[] = [];

  for (const emp of employees) {
    // Skip if missing required fields
    if (!emp._id || !emp.name || emp.name.trim() === "") {
      continue;
    }

    const isCurrentUser = emp._id === currentUserId;
    const firstName = getFirstName(emp.name);
    const fullName = emp.name.trim();

    // Check birthday
    if (emp.dateOfBirth && isDateToday(emp.dateOfBirth)) {
      birthdays.push({
        employeeId: emp._id,
        firstName,
        fullName,
        isCurrentUser,
      });
    }

    // Check work anniversary
    if (emp.dateOfJoining && isDateToday(emp.dateOfJoining)) {
      const years = calculateYears(emp.dateOfJoining);
      if (years !== null) {
        anniversaries.push({
          employeeId: emp._id,
          firstName,
          fullName,
          years,
          isCurrentUser,
        });
      }
    }
  }

  // Sort: current user first, then alphabetically
  const sortEvents = <T extends { isCurrentUser: boolean; firstName: string }>(
    events: T[]
  ): T[] => {
    return [...events].sort((a, b) => {
      if (a.isCurrentUser && !b.isCurrentUser) return -1;
      if (!a.isCurrentUser && b.isCurrentUser) return 1;
      return a.firstName.localeCompare(b.firstName);
    });
  };

  return {
    birthdays: sortEvents(birthdays),
    anniversaries: sortEvents(anniversaries),
    hasEvents: birthdays.length > 0 || anniversaries.length > 0,
  };
}

