import { Properties, IProperty } from "@/models/property";
import Users, { IOwner } from "@/models/user";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const projection = {
  _id: 1,
  email: 1,
  street: 1,
  city: 1,
  state: 1,
  country: 1,
  phone: 1,
  propertyCoverFileUrl: 1,
  propertyImages: 1,
  userId: 1,
};

export async function POST(req: NextRequest) {
  const { VSID } = await req.json();
  // console.log("vsid: ", VSID);

  try {
    const property = await Properties.findOne({ VSID: VSID }, projection);
    // console.log("property: ", property);

    if (!property) {
      return NextResponse.json(
        { error: "Property does not exist" },
        { status: 404 }
      );
    }
    // populate owner from Users collection (source of truth)
    let ownerDoc = null;
    try {
      ownerDoc = await Users.findById(new mongoose.Types.ObjectId((property as any).userId)).select("name email phone");
    } catch (e) {
      ownerDoc = null;
    }
    if (!ownerDoc) {
      // fallback: try to find by email stored on property (not preferred)
      ownerDoc = await Users.findOne({ email: (property as any).email }).select("name email phone");
    }

    const owner: IOwner = ownerDoc
      ? { _id: ownerDoc._id.toString(), name: ownerDoc.name, email: ownerDoc.email, phone: ownerDoc.phone }
      : { _id: "", name: "", email: "", phone: "" };

    const propertyObj: IProperty & { owner?: IOwner | null } = {
      ...(property as any)._doc ? (property as any)._doc : (property as any),
      owner,
    };

    return NextResponse.json({ data: propertyObj }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
