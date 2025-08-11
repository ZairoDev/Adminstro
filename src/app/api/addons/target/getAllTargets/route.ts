import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDb();
  try {
    const targets = await MonthlyTarget.find();
    const response = NextResponse.json({ data: targets }, { status: 200 });

    // Tell browser/CDN to never cache this response
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (err) {
    return NextResponse.json({ status: 401, error: "Unable to fetch targets" });
  }
}