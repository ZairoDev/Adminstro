import { Properties } from "@/models/property";
import Users from "@/models/user";
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
    let owner = await Users.findById(
      new mongoose.Types.ObjectId(property.userId)
    );
    if (!owner) {
      owner = await Users.findOne({ email: property.email });
    }

    const propertyObj = {
      ...property.toObject(),
      ownerName: owner.name,
    };


    return NextResponse.json({ data: propertyObj }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
