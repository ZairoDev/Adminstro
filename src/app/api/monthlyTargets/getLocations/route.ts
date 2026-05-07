import { MonthlyTarget } from "@/models/monthlytarget";
import { dedupeCities, toDisplayCity } from "@/lib/city-normalizer";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const locations = await MonthlyTarget.find({ month: { $exists: false }, isActive: { $ne: false } }).select("city").lean();
    const cities = dedupeCities(
      locations.map((location) => toDisplayCity(location.city || ""))
    );
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