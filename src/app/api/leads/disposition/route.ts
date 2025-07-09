import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";

export async function POST(req: NextRequest) {
  try {
    const { id, disposition } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID and dispostion are required" },
        { status: 400 }
      );
    }

    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { $set: { leadStatus: disposition } },
      { new: true }
    );

    return NextResponse.json(
      { success: true, data: updatedQuery },
      { status: 200 }
    );
  } catch (err) {
    console.log("err in updating disposition: ", err);
    return NextResponse.json({ error: err }, { status: 400 });
  }
}
