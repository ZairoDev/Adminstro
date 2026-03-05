import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();
interface RequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const reqBody: RequestBody = await request.json();
    const { email } = reqBody;
    const user = await Employees.findOne({ email }).select("-password -passwordExpiresAt");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      status: 200,
      message: "User found",
      data: user,
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
