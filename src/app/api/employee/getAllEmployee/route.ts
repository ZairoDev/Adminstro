import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

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

  console.log(
    `currentPage: ${currentPage}, queryType: ${queryType}, EmployeeInput: ${EmployeeInput}`
  );

  if (EmployeeInput) {
    EmployeeInput = EmployeeInput.trim();
  }
  const token = await getDataFromToken(request);
  const role = token.role;

  const query: UserQuery & { role?: { $nin: string[] } } = {};

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

  if (role === "HR") {
    query.role = { $nin: ["SuperAdmin", "Developer"] };
  }

  try {
    console.log(`Query: ${JSON.stringify(query)}`);
    const allEmployees: Employee[] = await Employees.find(query)
      .limit(20)
      .skip(skip)
      .sort({ _id: -1 });

    const totalEmployee: number = await Employees.countDocuments(query);

    console.log(`Found ${totalEmployee} users`);
    return NextResponse.json({ allEmployees, totalEmployee });
  } catch (error) {
    console.error("Error fetching Employee:", error);
    return NextResponse.json({
      message: "Failed to fetch Employees",
    });
  }
}
