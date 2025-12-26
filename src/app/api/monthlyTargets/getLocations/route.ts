import { MonthlyTarget } from "@/models/monthlytarget";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const locations = await MonthlyTarget.find({}).select("city");
    return NextResponse.json({ locations });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get locations" }, { status: 500 });
  }
}