import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Users from "@/models/user";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

function generateRandomPassword(length: number): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await getDataFromToken(request);
    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "Owner") {
      return NextResponse.json(
        { error: "Password reset is only available for owner accounts" },
        { status: 403 },
      );
    }

    const plainPassword = generateRandomPassword(8);
    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(plainPassword, salt);
    await user.save();

    return NextResponse.json({
      message: "Owner password reset successfully",
      newPassword: plainPassword,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("resetPassword error:", err);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 },
    );
  }
}
