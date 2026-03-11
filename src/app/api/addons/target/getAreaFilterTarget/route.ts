// src/app/api/addons/target/getAllTargets/route.ts
export const dynamic = "force-dynamic";

import { MonthlyTarget } from "@/models/monthlytarget";
import { Area } from "@/models/area";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(request: NextRequest) {
  await connectDb();
  try {
    await getDataFromToken(request);
    const targets = await MonthlyTarget.find().lean();
    const areas = await Area.find({},{city:1,name:1}).lean();

    
    const result = targets.map((target) => {
      const targetCity = (target.city || "").toString().trim().toLowerCase();
      const matchingAreas = areas.filter(
        (a) => (a.city || "").toString().trim().toLowerCase() === targetCity
      );
      return {
        ...target,
        areas: matchingAreas,
      };
    });
    
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error fetching targets:", err);
    return NextResponse.json(
      { error: "Unable to fetch targets" },
      { status: 500 }
    );
  }
}
