import Visits from "@/models/visit";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const visitData = await req.json();
  const token = await getDataFromToken(req);

  const newVisitData = {
    ...visitData,
    ...(visitData.ownerPhone
      ? { ownerPhone: visitData.ownerPhone.replace(/\D/g, "") }
      : {}),
    createdBy: token.email,
  };

  try {
    await Visits.create(newVisitData);

    return NextResponse.json(
      { message: "Visit scheduled successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.log("err in shceduling visit: ", err);
    return NextResponse.json(
      { error: "Unable to schedule visit" },
      { status: 400 }
    );
  }
}
