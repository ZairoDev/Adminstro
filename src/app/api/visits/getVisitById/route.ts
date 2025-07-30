import Visits from "@/models/visit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { visitId } = await req.json();

  try {
    const visit = await Visits.findById(visitId).populate({
      path: "lead",
      select: "name phoneNo",
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Lead is not available for this Id" },
        { status: 401 }
      );
    }

    return NextResponse.json({ data: visit }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
