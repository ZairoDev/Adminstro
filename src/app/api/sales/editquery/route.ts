import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  const token = await getDataFromToken(req);
  try {
    const updatedLead = await req.json();
    const { _id } = updatedLead;

    const token = await getDataFromToken(req);
    const loggedInUser = token?.email;

    const updatedBy = [...(updatedLead.updatedBy ?? []), loggedInUser];
    updatedLead.updatedBy = updatedBy;
    updatedLead.isViewed = false;

    const existingQuery = await Query.findByIdAndUpdate({ _id }, { ...updatedLead });

    return NextResponse.json({ success: true, data: existingQuery }, { status: 201 });
  } catch (error: any) {
    console.log(error);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
