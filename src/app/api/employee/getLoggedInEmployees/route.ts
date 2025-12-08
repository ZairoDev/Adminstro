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
        warnings: 1,
        pips: 1,
        appreciations: 1,
      }
    )
      .sort({ lastLogin: -1 })
      .lean();

    // Add counts for warnings, PIPs, and appreciations
    const employeesWithCounts = loggedInEmployees.map((employee: any) => ({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      profilePic: employee.profilePic,
      lastLogin: employee.lastLogin,
      allotedArea: employee.allotedArea,
      warningsCount: employee.warnings?.length || 0,
      pipsCount: employee.pips?.filter((pip: any) => pip.status === 'active').length || 0,
      appreciationsCount: employee.appreciations?.length || 0,
    }));

    console.log(`📊 Found ${loggedInEmployees.length} logged-in employees:`, loggedInEmployees.map(e => e.email));

    return NextResponse.json({
      success: true,
      employees: employeesWithCounts,
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
