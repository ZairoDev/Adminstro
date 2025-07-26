import { NextRequest, NextResponse } from "next/server";

import Visits from "@/models/visit";

export async function POST(req: NextRequest) {
  try {
    const visits = await Visits.find().populate({
      path: "lead",
      select: "name phoneNo",
    });
    const totalVisits = await Visits.countDocuments();
    const totalPages = Math.ceil(totalVisits / 50);
    return NextResponse.json(
      { data: visits, totalPages, totalVisits },
      { status: 200 }
    );
  } catch (err: any) {
    const errr = new Error(err);
    return NextResponse.json({ error: errr.message }, { status: 400 });
  }
}
