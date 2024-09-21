import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

connectDb();

interface RequestBody {
  userId: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const reqBody: RequestBody = await request.json();
  const { userId } = reqBody;

  console.log("userId", userId);
  const user = await Users.findOne({ _id: userId }).select("-password");

  const tokenData = await getDataFromToken(request);
  const {email} = tokenData;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    message: "User found",
    data: user,
    loggedInUserEmail: email,
  });
}
