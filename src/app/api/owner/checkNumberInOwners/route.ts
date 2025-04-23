import { NextRequest, NextResponse } from "next/server";

import { Owners } from "@/models/owner";

export async function POST(req: NextRequest) {
  const { phoneNumber } = await req.json();
  console.log("phoneNumber: ", phoneNumber);

  try {
    const existingPhone = await Owners.findOne({
      phoneNumber: phoneNumber,
    });

    console.log("phoneNumber in try: ", phoneNumber, !!existingPhone);

    if (existingPhone) {
      return NextResponse.json({ exists: true }, { status: 200 });
    }

    return NextResponse.json({ exists: false }, { status: 200 });
  } catch (error: any) {
    console.log("error in finding number: ", error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
