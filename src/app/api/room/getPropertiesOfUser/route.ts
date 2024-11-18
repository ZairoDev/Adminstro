import { Properties } from "@/models/property";
import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { canUseAsyncIteratorSymbol } from "@apollo/client/utilities";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { userName, userMobile } = await req.json();

    if (!userName || !userMobile) {
      return NextResponse.json(
        { error: "Owner details are required" },
        { status: 400 }
      );
    }

    const query = {
      name: new RegExp(userName, "i"),
      phone: userMobile,
    };

    const user = await Users.find(query);

    if (user.length === 0) {
      return NextResponse.json(
        { error: "User does not exist" },
        { status: 400 }
      );
    }

    const userEmail = user[0].email;

    const properties = await Properties.find({ email: userEmail });

    if (!properties) {
      return NextResponse.json(
        { error: "No properties found" },
        { status: 400 }
      );
    }

    const ownerProperties = properties.map((property) => ({
      propertyId: property._id,
      propertyImages: property.propertyImages,
    }));

    return NextResponse.json(ownerProperties, { status: 200 });
  } catch (err: unknown) {
    console.log("error: ", err);
    if (err instanceof Error) {
      return NextResponse.json(
        { error: "Error in fetching properties of user" },
        { status: 400 }
      );
    }
  }
}
