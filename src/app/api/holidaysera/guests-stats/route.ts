import { NextRequest, NextResponse } from "next/server";
import { getHolidayGuestsStats } from "@/actions/(VS)/queryActions";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const result = await getHolidayGuestsStats();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error in guests-stats route:", err);
    return NextResponse.json({ success: false, error: error?.message || "Unknown" }, { status: 500 });
  }
}

