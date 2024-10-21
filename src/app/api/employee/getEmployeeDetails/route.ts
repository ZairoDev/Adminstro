import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
connectDb();
interface RequestBody {
  userId: string;
}
export async function POST(request: NextRequest) {
  const reqBody: RequestBody = await request.json();
  const { userId } = reqBody;
  console.log(userId);
  const user = await Employees.findOne({ _id: userId }).select(
    "-password -passwordExpiresAt"
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: 200,
    message: "User found",
    data: user,
  });
}
