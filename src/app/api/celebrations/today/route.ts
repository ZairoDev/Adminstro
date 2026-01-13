import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";

/**
 * API Endpoint: GET /api/celebrations/today
 * Returns today's birthdays and work anniversaries for all active employees
 * Uses timezone-safe local date comparison
 */

interface CelebrationEvent {
  employeeId: string;
  firstName: string;
  fullName: string;
  eventType: "birthday" | "anniversary";
  years?: number; // Only for anniversaries
}

interface CelebrationsResponse {
  birthdays: CelebrationEvent[];
  anniversaries: CelebrationEvent[];
  hasEvents: boolean;
  totalCount: number;
}

/**
 * Normalizes a date to local timezone for safe comparison
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

  // Adjust if anniversary hasn't occurred this year yet
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const token = await getDataFromToken(request);
    if (!token || typeof token !== "object" || !("id" in token)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDb();

    // Fetch all active employees only
    const employees = await Employees.find({
      isActive: true,
      name: { $exists: true, $nin: [null, ""] },
    })
      .select("_id name dateOfBirth dateOfJoining")
      .lean();

    const birthdays: CelebrationEvent[] = [];
    const anniversaries: CelebrationEvent[] = [];

    // Check each employee for today's events
    for (const emp of employees) {
      if (!emp._id || !emp.name || emp.name.trim() === "") {
        continue;
      }

      const firstName = getFirstName(emp.name);
      const fullName = emp.name.trim();

      // Check birthday
      if (emp.dateOfBirth && isDateToday(emp.dateOfBirth)) {
        birthdays.push({
          employeeId: String(emp._id),
          firstName,
          fullName,
          eventType: "birthday",
        });
      }

      // Check work anniversary
      if (emp.dateOfJoining && isDateToday(emp.dateOfJoining)) {
        const years = calculateYears(emp.dateOfJoining);
        if (years !== null && years > 0) {
          anniversaries.push({
            employeeId: String(emp._id),
            firstName,
            fullName,
            eventType: "anniversary",
            years,
          });
        }
      }
    }

    // Sort alphabetically by first name
    birthdays.sort((a, b) => a.firstName.localeCompare(b.firstName));
    anniversaries.sort((a, b) => a.firstName.localeCompare(b.firstName));

    const response: CelebrationsResponse = {
      birthdays,
      anniversaries,
      hasEvents: birthdays.length > 0 || anniversaries.length > 0,
      totalCount: birthdays.length + anniversaries.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching today's celebrations:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch celebrations",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

