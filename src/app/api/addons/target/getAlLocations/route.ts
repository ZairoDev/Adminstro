export const dynamic = "force-dynamic";
import { MonthlyTarget } from "@/models/monthlytarget";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
      const res = await MonthlyTarget.find({}, { area: 1, city:1 })
      // console.log("val: ", res);
      return NextResponse.json({ data: res }, { status: 200 });
    }
  catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Unable to get locations" },
      { status: 500 }
    );
  }
}
