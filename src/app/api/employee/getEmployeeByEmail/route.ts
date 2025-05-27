import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";

connectDb();
interface RequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
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
}
