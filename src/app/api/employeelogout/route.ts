import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import type { NextRequest, NextResponse as ResponseType } from "next/server";

connectDb();

export async function GET(request: NextRequest): Promise<ResponseType> {
  try {
    // Create the response
    const response = NextResponse.json({
      message: "Logged out successfully",
      success: true,
    });

    await response.cookies.delete({
      name: "token",
      path: "/",
      sameSite: "none",
      secure: true,
    });

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    // Handle errors if any occur
    return NextResponse.json(
      { message: "An error occurred", success: false },
      { status: 500 }
    );
  }
}
