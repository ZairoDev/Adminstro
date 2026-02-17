import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";
import { excludeTestAccountFromQuery, excludeTestAccountFromCount } from "@/util/employeeConstants";
import { EmployeeInterface } from "@/util/type";

export const dynamic = "force-dynamic";

connectDb();

interface UserQuery {
  [key: string]: RegExp;
}

// Extended interface to include isLocked which exists in the database but not in EmployeeInterface
interface EmployeeWithLock extends EmployeeInterface {
  isLocked?: boolean;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const currentPage =
    Number(request.nextUrl.searchParams.get("currentPage")) || 1;
  const queryType = request.nextUrl.searchParams.get("queryType");
  let EmployeeInput = request.nextUrl.searchParams.get("userInput");

  const token = await getDataFromToken(request);
  // console.log(token, "token");

  if (EmployeeInput) {
    EmployeeInput = EmployeeInput.trim();
  }
  const role = request.nextUrl.searchParams.get("role");

  const query: UserQuery = {};

  if (role) {
    query.role = new RegExp(role, "i");
  }

  const validQueryTypes = ["name", "email", "phone"];
  if (queryType) {
    if (validQueryTypes.includes(queryType)) {
      if (EmployeeInput) {
        const regex = new RegExp(EmployeeInput, "i");
        query[queryType] = regex;
      }
    } else {
      // console.log("Invalid queryType:", queryType);
    }
  }

  const skip = (currentPage - 1) * 10;

  // if (role === "HR") {
  //   query.role = { $nin: ["SuperAdmin", "Developer"] };
  // }

  // Role-based access control
  const allowedRoles: readonly string[] = ["SuperAdmin", "HR", "Admin", "Developer", "LeadGen-TeamLead", "Sales-TeamLead"];
  
  // Type guard: ensure token exists and has a role property
  if (!token || typeof token !== "object" || !("role" in token)) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid token" },
      { status: 403 }
    );
  }
  
  const userRole = String(token.role);
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { message: "Unauthorized: You don't have permission to access employee data" },
      { status: 403 }
    );
  }

  let allEmployees: EmployeeWithLock[] = [];
  try {
    const queryWithExclusion = excludeTestAccountFromQuery(query);

    // Start of day (UTC) for overdue PIP comparison
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    // LeadGen-TeamLead can only see LeadGen employees
    if (userRole === "LeadGen-TeamLead") {
      allEmployees = (await Employees.find({ ...queryWithExclusion, role: "LeadGen" })
        .sort({ _id: -1 })
        .lean() as unknown) as EmployeeWithLock[];
    }
    // HR and Admin roles can see all employees (with optional role filter from query params)
    else if (["HR", "Admin", "SuperAdmin", "Developer"].includes(userRole as string)) {
      allEmployees = (await Employees.find(queryWithExclusion)
        .sort({ _id: -1 })
        .lean() as unknown) as EmployeeWithLock[];
    }
    // Sales-TeamLead can see Sales employees
    else if (userRole === "Sales-TeamLead") {
      allEmployees = (await Employees.find({ ...queryWithExclusion, role: "Sales" })
        .sort({ _id: -1 })
        .lean() as unknown) as EmployeeWithLock[];
    }
    else {
      // Default: no access
      allEmployees = [];
    }

    // Auto-lock employee when they have an active PIP past end date (PIP duration over, not cleared)
    for (const emp of allEmployees) {
      const employee = emp as EmployeeWithLock;
      const pips = employee.pips || [];
      const hasOverdueActivePIP = pips.some(
        (p) => p.status === "active" && new Date(p.endDate) < startOfToday
      );
      if (hasOverdueActivePIP && !employee.isLocked) {
        await Employees.findByIdAndUpdate(employee._id, { isLocked: true });
        employee.isLocked = true;
      }
    }

    const totalEmployee: number = await Employees.countDocuments(excludeTestAccountFromCount(query));

    return NextResponse.json({ allEmployees, totalEmployee });
  } catch (error) {
    console.error("Error fetching Employee:", error);
    return NextResponse.json({
      message: "Failed to fetch Employees",
    });
  }
}
