import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";
import { SalesOfferInterface } from "@/util/type";

export async function POST(req: NextRequest) {
  const { phoneNumber } = await req.json();

  try {
    const existingPhone = (await Offer.findOne({ phoneNumber })) as SalesOfferInterface;

    console.log("phoneNumber: ", phoneNumber, existingPhone);

    if (existingPhone) {
      console.log("isAvailable: ", existingPhone.availableOn);

      const onVS = (existingPhone.availableOn as string[]).includes("VacationSaga");
      const onTT = (existingPhone.availableOn as string[]).includes("TechTunes");

      console.log("availability: ", onVS, onTT);

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
