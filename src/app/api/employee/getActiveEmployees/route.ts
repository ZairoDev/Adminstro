import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";

connectDb();

interface Employee {
  _id: string;
  name: string;
  email: string;
}

export async function POST(request: NextRequest) {
  const filters = await request.json();

  console.log("filters: ", filters);

  try {
    const activeEmployees: Employee[] = await Employees.find(filters);

    const totalEmployee: number = await Employees.countDocuments({ isActive: true });

    return NextResponse.json({ activeEmployees, totalEmployee });
  } catch (error) {
    console.error("Error fetching Employee:", error);
    return NextResponse.json({
      message: "Failed to fetch Employees",
    });
  }
}
