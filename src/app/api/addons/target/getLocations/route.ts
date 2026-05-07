export const dynamic = "force-dynamic";
import { MonthlyTarget } from "@/models/monthlytarget";
import { dedupeCities, toDisplayCity } from "@/lib/city-normalizer";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("target") ;
    if (target === "country") {
      const val = await MonthlyTarget.find({ month: { $exists: false }, isActive: { $ne: false } }, { country: 1, _id: 0 }).distinct(
        "country"
      );
      // console.log("val: ", val);
      return NextResponse.json({ data: val }, { status: 200 });
    } else {
      const val = await MonthlyTarget.find(
        { month: { $exists: false }, isActive: { $ne: false } },
        { city: 1, _id: 0 }
      ).distinct("city");
      const deduped = dedupeCities(val.map((city) => toDisplayCity(String(city))));
      // console.log("val: ", val);
      return NextResponse.json({ data: deduped }, { status: 200 });
    }
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log(err);
    return NextResponse.json(
      { error: "Unable to get locations" },
      { status: 500 }
    );
  }
}
