import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";
import { SalesOfferInterface } from "@/util/type";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { phoneNumber } = await req.json();
    const existingPhone = (await Offer.find({
      phoneNumber,
    })) as SalesOfferInterface[];


    if (existingPhone.length > 0) {
      let onVS = false;
      let onTT = false;
      let onHS = false;
      const platform1 = existingPhone[0]?.platform;
      const platform2 = existingPhone[1]?.platform;

      onVS =
        platform1 === "VacationSaga" || (platform2 && platform2 === "VacationSaga")
          ? true
          : false;
      onTT =
        platform1 === "Holidaysera" ||
        platform1 === "TechTunes" ||
        (platform2 && (platform2 === "Holidaysera" || platform2 === "TechTunes"))
          ? true
          : false;
      onHS =
        platform1 === "HousingSaga" || (platform2 && platform2 === "HousingSaga")
          ? true
          : false;

      return NextResponse.json(
        { availableOnVS: onVS, availableOnTT: onTT, availableOnHS: onHS },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { availableOnVS: false, availableOnTT: false, availableOnHS: false },
      { status: 200 },
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log("error in finding number: ", err);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
