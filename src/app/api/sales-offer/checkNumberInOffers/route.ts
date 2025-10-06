import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";
import { SalesOfferInterface } from "@/util/type";

export async function POST(req: NextRequest) {
  const { phoneNumber } = await req.json();


  try {
    const existingPhone = (await Offer.find({
      phoneNumber,
    })) as SalesOfferInterface[];


    if (existingPhone.length > 0) {
      let onVS = false;
      let onTT = false;
      const platform1 = existingPhone[0]?.platform;
      const platform2 = existingPhone[1]?.platform;

      onVS =
        platform1 === "VacationSaga" || (platform2 && platform2 === "VacationSaga")
          ? true
          : false;
      onTT =
        platform1 === "TechTunes" || (platform2 && platform2 === "TechTunes")
          ? true
          : false;

      return NextResponse.json(
        { availableOnVS: onVS, availableOnTT: onTT },
        { status: 200 }
      );
    }

    return NextResponse.json({ isAvailable: false }, { status: 200 });
  } catch (error: any) {
    console.log("error in finding number: ", error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
