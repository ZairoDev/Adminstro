import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

connectDb();

interface RequestBody {
  userId: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const tokenData = await getDataFromToken(request);
    const reqBody: RequestBody = await request.json();
    const { userId } = reqBody;
    const user = await Users.findOne({ _id: userId }).select("-password");
    const { email } = tokenData;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "User found",
      data: user,
      loggedInUserEmail: email,
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
