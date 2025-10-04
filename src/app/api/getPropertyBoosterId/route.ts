import { NextResponse } from "next/server";
import { Boosters } from "@/models/propertyBooster";
import { connectDb } from "@/util/db";


export async function POST(req: Request) {
  await connectDb();
  try {
    const { BoostID } = await req.json();
    if (!BoostID) {
      return NextResponse.json({ error: "BoostID is required" }, { status: 400 });
    }

    const booster = await Boosters.findOne({ BoostID }).lean();
    if (!booster) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(booster);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}