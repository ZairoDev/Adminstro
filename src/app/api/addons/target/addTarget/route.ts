import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { connect } from "http2";
import { NextRequest, NextResponse } from "next/server";

connectDb();
export async function POST(req: NextRequest) {
  try {
    const targetData = await req.json(); // ✅ await here

    // console.log("target data: ", targetData);

    const exists = await MonthlyTarget.find({
      country: targetData.country,
      city: targetData.city,
    });
    if(exists.length > 0) return NextResponse.json({ error: "Target already exists" }, { status: 501 });

    const target = await MonthlyTarget.create(targetData);
    // console.log("target created: ", target);

    return NextResponse.json(
      { message: "Target created successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.log("error in creating target: ", err);
    return NextResponse.json(
      { error: "Unable to create target" },
      { status: 401 }
    );
  }
}
