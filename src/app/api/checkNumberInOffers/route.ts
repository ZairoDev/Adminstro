import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    try {
      await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
    }

    const { phoneNo } = await req.json();
    if (!phoneNo) {
      return NextResponse.json({ error: "phoneNo is required" }, { status: 400 });
    }

    const existingPhone = await Query.findOne({ phoneNo });

    if (existingPhone) {
      // console.log("isAvailable: ", existingPhone);

      const onVS = existingPhone.availableOn.includes("VacationSaga");
      const onTT = existingPhone.availableOn.includes("TechTunes");

      return NextResponse.json(
        { availableOnVS: !!onVS, availableOnTT: !!onTT },
        { status: 200 }
      );
    }

    return NextResponse.json({ isAvailable: false }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to check number" },
      { status: 500 },
    );
  }
}
