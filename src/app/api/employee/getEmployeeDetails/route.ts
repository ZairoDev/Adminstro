import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { EmployeeInterface } from "@/util/type";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
connectDb();
interface RequestBody {
  userId: string;
}
export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const reqBody: RequestBody = await request.json();
    const { userId } = reqBody;
    const user = await Employees.findOne({ _id: userId })
  .select("-password -passwordExpiresAt")
  .lean() as EmployeeInterface | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      status: 200,
      message: "User found",
      data: {
        ...user,
        warnings: user.warnings || [],
        pips: user.pips || [],
        appreciations: user.appreciations || [],
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    throw error;
  }
}

