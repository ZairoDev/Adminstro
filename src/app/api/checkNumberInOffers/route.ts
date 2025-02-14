import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";

export async function POST(req: NextRequest) {
  const { phoneNo } = await req.json();

  try {
    const existingPhone = await Query.findOne({ phoneNo });

    if (existingPhone) {
      console.log("isAvailable: ", existingPhone);

      const onVS = existingPhone.availableOn.includes("VacationSaga");
      const onTT = existingPhone.availableOn.includes("TechTunes");

      return NextResponse.json(
        { availableOnVS: !!onVS, availableOnTT: !!onTT },
        { status: 200 }
      );
    }

    return NextResponse.json({ isAvailable: false }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
