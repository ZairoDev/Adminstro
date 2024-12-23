import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { page } = await req.json();

    const skip = (page - 1) * 10;

    const rejectedLeads = await Query.find({
      rejectionReason: { $ne: null },
    })
      .skip(skip)
      .limit(10)
      .sort({
        createdAt: -1,
      });
    console.log("rejected leads: ", rejectedLeads);

    const totalRejectedLeads = await Query.countDocuments({
      rejectionReason: { $ne: null },
    });

    console.log("totalDocuments: ", totalRejectedLeads);

    if (!rejectedLeads) {
      return NextResponse.json(
        { error: "No rejected leads found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { rejectedLeads, totalRejectedLeads },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
