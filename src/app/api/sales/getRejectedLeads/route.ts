import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function GET(req: NextRequest) {
  try {
    const rejectedLeads = await Query.find({
      rejectionReason: { $ne: null },
    }).sort({
      createdAt: -1,
    });
    console.log("rejected leads: ", rejectedLeads);

    if (!rejectedLeads) {
      return NextResponse.json(
        { error: "No rejected leads found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rejectedLeads, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
