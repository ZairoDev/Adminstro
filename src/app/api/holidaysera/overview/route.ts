import { NextRequest, NextResponse } from "next/server";
import { getHolidayseraOverview } from "@/actions/(VS)/queryActions";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const result = await getHolidayseraOverview();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error in holidaysera overview route:", err);
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

