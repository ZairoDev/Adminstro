import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";
import { SalesOfferInterface } from "@/util/type";

export async function POST(req: NextRequest) {
  try {
    const offerData = (await req.json()) as SalesOfferInterface;

    const { phoneNumber, availableOn } = offerData;

    console.log("offerData in backend: ", offerData);

    const existingPhone = (await Offer.findOne({ phoneNumber })) as SalesOfferInterface;

    if (existingPhone) {
      if (
        existingPhone.availableOn?.includes(
          availableOn as keyof typeof offerData.availableOn
        )
      ) {
        return NextResponse.json({ error: "Offer already exists" }, { status: 400 });
      }
    }

    const newOffer = { ...offerData, availableOn: [], platform: availableOn };
    console.log("newOffer: ", newOffer);
    const offer = await Offer.create(newOffer);

    await Offer.updateMany({ phoneNumber }, { $push: { availableOn: availableOn } });

    return NextResponse.json({ message: "offer added successfully" }, { status: 201 });
  } catch (error: any) {
    console.log("error in backend: ", error);
    const err = new Error(error);
    return NextResponse.json({ error: err.message }, { status: 402 });
  }
}
