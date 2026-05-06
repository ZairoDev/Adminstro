// src/app/api/addons/target/getAllTargets/route.ts
export const dynamic = "force-dynamic";

import { MonthlyTarget } from "@/models/monthlytarget";
import { Area } from "@/models/area";
import { normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDb();
  try {
    // Only return location config records (legacy records without month/year)
    const targets = await MonthlyTarget.find({ month: { $exists: false } }).lean();
    const areas = await Area.find().lean();

    const targetByCity = new Map<string, (typeof targets)[number]>();
    targets.forEach((target) => {
      const cityKey = normalizeCityKey(target.city || "");
      if (!targetByCity.has(cityKey)) {
        targetByCity.set(cityKey, target);
      }
    });

    // Merge targets with their matching areas based on normalized city field
    const result = Array.from(targetByCity.values()).map((target) => {
      const targetCityKey = normalizeCityKey(target.city || "");
      const matchingAreas = areas.filter(
        (a) => normalizeCityKey(String(a.city || "")) === targetCityKey
      );
      return {
        ...target,
        city: toDisplayCity(target.city || ""),
        areas: matchingAreas, // all areas for this target's city
      };
    });

    

    // console.log("result: ", result);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error("Error fetching targets:", err);
    return NextResponse.json(
      { status: 500, error: "Unable to fetch targets" },
      { status: 500 }
    );
  }
}
