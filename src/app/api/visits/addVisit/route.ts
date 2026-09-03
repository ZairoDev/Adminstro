import Visits from "@/models/visit";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const visitData = await req.json();

    const { visitStatus: _ignoredStatus, ...rest } = visitData;

    const newVisitData = {
      ...rest,
      ...(visitData.ownerPhone
        ? { ownerPhone: visitData.ownerPhone.replace(/\D/g, "") }
        : {}),
      visitStatus: "scheduled",
      outcome: "none",
      createdBy: token.email,
      statusHistory: [
        {
          from: "created",
          to: "scheduled",
          at: new Date(),
          by: token.email,
          source: "system",
        },
      ],
    };

    await connectDb();
    await Visits.create(newVisitData);

    return NextResponse.json(
      { message: "Visit scheduled successfully" },
      { status: 201 },
    );
  } catch (err) {
    console.log("err in scheduling visit: ", err);
    return NextResponse.json(
      { error: "Unable to schedule visit" },
      { status: 400 },
    );
  }
}
