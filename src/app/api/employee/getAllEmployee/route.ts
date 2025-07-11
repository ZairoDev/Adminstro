import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

interface Employee {
  _id: string;
  name: string;
  email: string;
}

interface UserQuery {
  [key: string]: RegExp;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const currentPage =
    Number(request.nextUrl.searchParams.get("currentPage")) || 1;
  const queryType = request.nextUrl.searchParams.get("queryType");
  let EmployeeInput = request.nextUrl.searchParams.get("userInput");

  const token = await getDataFromToken(request);

  if (EmployeeInput) {
    EmployeeInput = EmployeeInput.trim();
  }
  const role = request.nextUrl.searchParams.get("role");

  const query: UserQuery = {};

  if (role) {
    query.role = new RegExp(role, "i");
  }

  const validQueryTypes = ["name", "email", "phone"];
  if (queryType && validQueryTypes.includes(queryType)) {
    if (EmployeeInput) {
      const regex = new RegExp(EmployeeInput, "i");
      query[queryType] = regex;
    }
  } else {
    console.log("Invalid queryType");
  }

  const skip = (currentPage - 1) * 10;

  // if (role === "HR") {
  //   query.role = { $nin: ["SuperAdmin", "Developer"] };
  // }

  let allEmployees: Employee[] = [];

  try {
    if (token.role === "LeadGen-TeamLead") {
      allEmployees = await Employees.find({ ...query, role: "LeadGen" }).sort({
        _id: -1,
      });
    } else {
      allEmployees = await Employees.find(query).sort({ _id: -1 });
    }

    const totalEmployee: number = await Employees.countDocuments(query);

    return NextResponse.json({ allEmployees, totalEmployee });
  } catch (error) {
    console.error("Error fetching Employee:", error);
    return NextResponse.json({
      message: "Failed to fetch Employees",
    });
  }
}
