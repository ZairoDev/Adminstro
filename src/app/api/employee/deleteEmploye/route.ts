import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
connectDb();
interface Employee {
  _id: string;
}
export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const reqBody: Employee = await request.json();
    const { _id } = reqBody;
    if (!_id) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }
    const employee = await Employees.findById(_id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    if (employee.role === "SuperAdmin") {
      return NextResponse.json(
        { error: "You can not delete the superadmin" },
        { status: 403 }
      );
    }
    await Employees.deleteOne({ _id });
    return NextResponse.json(
      { message: "Employee deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
