import { NextRequest, NextResponse } from "next/server";
import { getHolidayseraOverview } from "@/actions/(VS)/queryActions";

export async function GET(request: NextRequest) {
  try {
    const result = await getHolidayseraOverview();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in holidaysera overview route:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

