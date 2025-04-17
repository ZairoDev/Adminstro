import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";

export async function POST(req: NextRequest) {
  const { leadStatus } = await req.json();

  try {
    const offers = await Offer.find({ leadStatus });

    return NextResponse.json({ offers }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
