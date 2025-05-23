import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

connectDb();
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await getDataFromToken(request);
    console.log("token: ", token);

    if (!token) {
      return NextResponse.json({
        success: false,
        message: "No token found",
      });
    } else {
      console.log("token: ", token);
      return NextResponse.json({
        success: true,
        message: "User found",
        user: token,
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "User not found",
    });
  }
}
