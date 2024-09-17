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

    response.cookies.delete("token");

    return response;
  } catch (error) {
    // Handle errors if any occur
    return NextResponse.json(
      { message: "An error occurred", success: false },
      { status: 500 }
    );
  }
}
