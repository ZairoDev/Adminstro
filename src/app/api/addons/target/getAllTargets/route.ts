// src/app/api/addons/target/getAllTargets/route.ts
export const dynamic = "force-dynamic";

import { MonthlyTarget } from "@/models/monthlytarget";
import { Area } from "@/models/area";
import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDb();
  try {
    const targets = await MonthlyTarget.find().lean();
    const areas = await Area.find().lean();

    // Merge targets with their matching areas based on city field
    const result = targets.map((target) => {
      const matchingAreas = areas.filter((a) => a.city === target.city);
      return {
        ...target,
        areas: matchingAreas, // all areas for this target's city
      };
    });

    console.log("result: ", result);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error("Error fetching targets:", err);
    return NextResponse.json(
      { status: 500, error: "Unable to fetch targets" },
      { status: 500 }
    );
  }
}
