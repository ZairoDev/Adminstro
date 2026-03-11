import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();
export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const targetData = await req.json();

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
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log("error in creating target: ", err);
    return NextResponse.json(
      { error: "Unable to create target" },
      { status: 500 }
    );
  }
}
