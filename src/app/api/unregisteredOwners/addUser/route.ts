// import UnregisteredOwnersTable from "@/app/dashboard/unregistered-owner/unregisteredTable";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  try { 

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