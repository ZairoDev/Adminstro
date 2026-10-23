import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";
import { type NextRequest, NextResponse } from "next/server";

interface InterviewerRecord {
  _id: unknown;
  name?: string;
  email?: string;
  role?: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role ?? "");
    if (role !== "HR" && role !== "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: "Only HR and SuperAdmin can list interviewers" },
        { status: 403 }
      );
    }

    await connectDb();
    const employees = (await Employee.find(
      excludeTestAccountFromQuery({ isActive: { $ne: false } })
    )
      .select("name email role")
      .sort({ name: 1 })
      .lean()) as InterviewerRecord[];

    const data = employees.flatMap((employee) => {
      const name = employee.name?.trim() ?? "";
      const email = employee.email?.trim() ?? "";
      if (!name || !email) return [];
      return [
        {
          id: String(employee._id),
          name,
          email,
          role: employee.role?.trim() || "",
        },
      ];
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status }
      );
    }
    console.error("List interviewers error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load interviewers" },
      { status: 500 }
    );
  }
}
