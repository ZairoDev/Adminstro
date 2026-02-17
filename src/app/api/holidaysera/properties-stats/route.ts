import { NextRequest, NextResponse } from "next/server";
import { getHolidayPropertiesStats } from "@/actions/(VS)/queryActions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const result = await getHolidayPropertiesStats();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in properties-stats route:", error);
    return NextResponse.json({ success: false, error: error?.message || "Unknown" }, { status: 500 });
  }
}

