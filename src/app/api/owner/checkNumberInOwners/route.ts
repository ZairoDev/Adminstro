import { NextRequest, NextResponse } from "next/server";

import { Owners } from "@/models/owner";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    // This endpoint is used from authenticated dashboard flows.
    // Enforce auth and return 401 only for real auth failures (with `code`).
    try {
      await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
    }

    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "phoneNumber is required" },
        { status: 400 },
      );
    }

    const existingPhone = await Owners.findOne({
      phoneNumber: phoneNumber,
    });

    // console.log("phoneNumber in try: ", phoneNumber, !!existingPhone);

    if (existingPhone) {
      return NextResponse.json({ exists: true }, { status: 200 });
    }

    return NextResponse.json({ exists: false }, { status: 200 });
  } catch (error: any) {
    console.log("error in finding number: ", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check phone number" },
      { status: 500 },
    );
  }
}
