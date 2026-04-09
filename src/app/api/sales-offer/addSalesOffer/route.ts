import { NextRequest, NextResponse } from "next/server";

import { Offer } from "@/models/offer";
import { AliasInterface, SalesOfferInterface } from "@/util/type";
import { sendOfferMail } from "@/util/offerMail";
import { getDataFromToken } from "@/util/getDataFromToken";
import Aliases from "@/models/alias";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { sendOfferEmailUsingAlias } from "@/util/offerEmailService";

export async function POST(req: NextRequest) {
  try {
    const offerData = (await req.json()) as SalesOfferInterface;
    const data = await getDataFromToken(req);
    const employeeEmail = data.email as string;
    const employeeId = (data as any).id as string | undefined;

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

    await connectDb();
    const employee = employeeId ? await Employees.findById(employeeId).lean() : null;

    const newOffer = {
      ...offerData,
      availableOn: [],
      sentBy: {
        name: data.name,
        email: data.email,
      },
    };

    //get alias data (backward compatible)
    let aliasName = "";
    let aliasEmail = "";
    let aliasEmailPassword = "";
    try {
      if (employeeId && employee) {
        const org = (employee as any).organization;
        const resolved = await Aliases.findOne({
          assignedTo: employeeId,
          organization: org,
          status: "Active",
        }).lean();
        if (resolved) {
          aliasName = String((resolved as any).aliasName ?? "");
          aliasEmail = String((resolved as any).aliasEmail ?? "");
          aliasEmailPassword = String((resolved as any).aliasEmailPassword ?? "");
        }
      }
      if (!aliasEmail) {
        const legacy = (await (Aliases as any).collection.findOne({
          assignedTo: employeeEmail,
          status: "Active",
        })) as AliasInterface | null;
        if (legacy) {
          aliasName = (legacy as any).aliasName;
          aliasEmail = (legacy as any).aliasEmail;
          aliasEmailPassword = (legacy as any).aliasEmailPassword;
        }
      }
    } catch {
      // ignore alias resolution errors; will be handled below if needed for sending
    }

    (newOffer as any).sentBy.aliasName = aliasName;
    (newOffer as any).sentBy.aliasEmail = aliasEmail;
    (newOffer as any).organization = (employee as any)?.organization;
    (newOffer as any).sentByEmployee = employeeId;
    // console.log("newOffer: ", newOffer);
    const offer = await Offer.create(newOffer);

    await Offer.updateMany({ phoneNumber }, { $push: { availableOn: availableOn } });
    // console.log("offer data");
    if (offerData.leadStatus === "Send Offer") {
      // Prefer the new org-safe template+alias system.
      if (employeeId && employee) {
        try {
          const subject = `Offer - ${offerData.plan}`;
          const { alias, renderedHtml } = await sendOfferEmailUsingAlias({
            employeeId,
            to: offer.email,
            subject,
            placeholders: {
              ownerName: offerData.name,
              price: offerData.effectivePrice,
              employeeName: String((employee as any).name ?? ""),
              employeeEmail: String((employee as any).email ?? ""),
              propertyName: offerData.propertyName,
              propertyUrl: offerData.propertyUrl,
              plan: offerData.plan,
              discount: offerData.discount,
              effectivePrice: offerData.effectivePrice,
            },
          });

          await Offer.updateOne(
            { _id: (offer as any)._id },
            {
              $set: {
                offerStatus: "Sent",
                aliasUsed: alias._id,
                sentBySnapshot: {
                  name: String((employee as any).name ?? ""),
                  email: String((employee as any).email ?? ""),
                  aliasName: alias.aliasName,
                  aliasEmail: alias.aliasEmail,
                },
                emailSubject: subject,
                emailContent: renderedHtml,
              },
              $push: {
                history: {
                  type: "offer",
                  status: "Sent",
                  note: offerData.note ?? "",
                  updatedBy: employeeId,
                },
              },
            },
          );
        } catch (e) {
          // Fallback to legacy TechTunes-only mailer for existing behavior.
          if (offerData.platform === "TechTunes" && aliasEmail && aliasEmailPassword) {
            await sendOfferMail({
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
          }
        }
      } else if (offerData.platform === "TechTunes" && aliasEmail && aliasEmailPassword) {
        await sendOfferMail({
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
      }
    }

    return NextResponse.json({ message: "offer added successfully" }, { status: 201 });
  } catch (error: any) {
    console.log("error in backend: ", error);
    const err = new Error(error);
    return NextResponse.json({ error: err.message }, { status: 402 });
  }
}
