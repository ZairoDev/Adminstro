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

  let allEmployees: Employee[] = [];
  // console.log("working in getAllEmployee",role);
  try {
    if (token.role === "LeadGen-TeamLead") {
      allEmployees = await Employees.find({ ...query, role: "LeadGen" }).sort({
        _id: -1,
      });
    }
    // else if (role === "Sales") {
    //   allEmployees = await Employees.find({ ...query, role: "Sales", isActive: true }).sort({
    //     _id: -1,
    //   });
    //   // console.log(allEmployees);
    // }
     else {
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
