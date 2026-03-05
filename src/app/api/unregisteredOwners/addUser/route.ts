// import UnregisteredOwnersTable from "@/app/dashboard/unregistered-owner/unregisteredTable";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const body = await req.json();

    const data = await unregisteredOwner.create({
      name: body.name,
      phoneNumber: body.phoneNumber,
      location: body.location,
      price: body.price,
      interiorStatus: body.interiorStatus,
      propertyType: body.propertyType,
      link: body.link,
      area: body.area,
      referenceLink: body.referenceLink,
      address: body.address,
      remarks: body.remarks,
    });
    return NextResponse.json({ data }, { status: 200 }); 
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 }); 
  }
}