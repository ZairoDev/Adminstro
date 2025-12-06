import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";

connectDb();

export async function GET(request: NextRequest) {
  try {
    const loggedInEmployees = await Employees.find(
      { isLoggedIn: true },
      {
        name: 1,
        email: 1,
        role: 1,
        profilePic: 1,
        lastLogin: 1,
        allotedArea: 1,
      }
    )
      .sort({ lastLogin: -1 })
      .lean();

    console.log(`📊 Found ${loggedInEmployees.length} logged-in employees:`, loggedInEmployees.map(e => e.email));

    return NextResponse.json({
      success: true,
      employees: loggedInEmployees,
      count: loggedInEmployees.length,
    });
  } catch (error) {
    console.error("Error fetching logged-in employees:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch logged-in employees",
      },
      { status: 500 }
    );
  }
}
