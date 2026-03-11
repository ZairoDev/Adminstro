import { NextRequest, NextResponse } from "next/server";
import { Boosters } from "@/models/propertyBooster";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  await connectDb();
  try {
    await getDataFromToken(req);
    const { BoostID } = await req.json();
    if (!BoostID) {
      return NextResponse.json({ error: "BoostID is required" }, { status: 400 });
    }

    const booster = await Boosters.findOne({ BoostID }).lean();
    if (!booster) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(booster);
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}