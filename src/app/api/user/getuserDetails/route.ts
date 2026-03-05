import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

interface RequestBody {
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(request);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const reqBody: RequestBody = await request.json();
    const { userId } = reqBody;

    const user = await Users.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      status: 200,
      message: "User found",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 },
    );
  }
}
