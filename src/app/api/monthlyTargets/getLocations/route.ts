import { getMonthlyTargetCities } from "@/lib/monthly-target-locations";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const cities = await getMonthlyTargetCities();
    return NextResponse.json({ locations: cities });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Failed to get locations" }, { status: 500 });
  }
}