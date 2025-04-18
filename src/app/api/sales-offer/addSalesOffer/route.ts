import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";
import { AliasInterface, SalesOfferInterface } from "@/util/type";
import { sendOfferMail } from "@/util/offerMail";
import { getDataFromToken } from "@/util/getDataFromToken";
import Aliases from "@/models/alias";

export async function POST(req: NextRequest) {
  try {
    const offerData = (await req.json()) as SalesOfferInterface;
    const data = await getDataFromToken(req);
    const employeeEmail = data.email as string;

    // console.log("token data in offer; ", data, employeeEmail);

    const { phoneNumber, availableOn } = offerData;

    // console.log("offerData in backend: ", offerData);

    const existingPhone = (await Offer.findOne({ phoneNumber })) as SalesOfferInterface;

    if (existingPhone) {
      if (
        existingPhone.availableOn?.includes(
          availableOn as keyof typeof offerData.availableOn
        ) &&
        existingPhone.platform === offerData.platform
      ) {
        return NextResponse.json({ error: "Offer already exists" }, { status: 400 });
      }
    }

    //get alias data
    const alias = (await Aliases.findOne({
      assignedTo: employeeEmail,
    })) as AliasInterface;
    const aliasName = alias.aliasName;
    const aliasEmail = alias.aliasEmail;
    const aliasEmailPassword = alias.aliasEmailPassword;

    const newOffer = {
      ...offerData,
      availableOn: [],
      sentBy: {
        name: data.name,
        email: data.email,
        aliasName: aliasName,
        aliasEmail: aliasEmail,
      },
    };
    // console.log("newOffer: ", newOffer);
    const offer = await Offer.create(newOffer);

    await Offer.updateMany({ phoneNumber }, { $push: { availableOn: availableOn } });
    // console.log("offer data");
    if (offerData.platform === "TechTunes" && offerData.leadStatus === "Send Offer") {
      const mailResponse = await sendOfferMail({
        email: offer.email,
        emailType: "TECHTUNEOFFER",
        employeeEmail: employeeEmail || "",
        aliasEmail,
        aliasEmailPassword,
        data: {
          plan: offerData.plan,
          discount: offerData.discount,
          effectivePrice: offerData.effectivePrice,
        },
      });
      console.log("mail respones: ", mailResponse);
    }

    return NextResponse.json({ message: "offer added successfully" }, { status: 201 });
  } catch (error: any) {
    console.log("error in backend: ", error);
    const err = new Error(error);
    return NextResponse.json({ error: err.message }, { status: 402 });
  }
}
