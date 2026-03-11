import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { leadId, value, type } = await req.json();


    if (!leadId || value === undefined) {
      return NextResponse.json({ error: "Insufficient data" }, { status: 400 });
    }

    const parsedValue = Number(value);

    const updatedLead = await Query.updateOne(
      {_id:new mongoose.Types.ObjectId(leadId)},
      { $set: { [`propertyShown`]: parsedValue } },
      {timestamps: false}
    );

    // console.log("updatedLead: ", updatedLead);

    return NextResponse.json(
      {
        message: "Sales Property Shown updated successfully",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log("error in priority: ", err);
    return NextResponse.json(
      { error: "Error in updating sales Property Shown" },
      { status: 500 }
    );
  }
}
