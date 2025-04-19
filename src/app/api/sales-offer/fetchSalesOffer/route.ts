import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";

export async function POST(req: NextRequest) {
  const { leadStatus, page } = await req.json();

  const skip = page ? (page - 1) * 10 : 0;

  try {
    const offers = await Offer.find({ leadStatus }).skip(skip).limit(10);
    const totalDocuments = await Offer.countDocuments({ leadStatus });
    const totalPages = Math.ceil(totalDocuments / 10);

    return NextResponse.json({ offers, totalDocuments, totalPages }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
