import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { leadStatus, page } = await req.json();

    const skip = page ? (page - 1) * 10 : 0;
    const offers = await Offer.find({ leadStatus }).skip(skip).limit(10);
    const totalDocuments = await Offer.countDocuments({ leadStatus });
    const totalPages = Math.ceil(totalDocuments / 10);

    return NextResponse.json({ offers, totalDocuments, totalPages }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
