import { Properties } from "@/models/property";
import { quicklisting } from "@/models/quicklisting";
import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { canUseAsyncIteratorSymbol } from "@apollo/client/utilities";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { userName, userMobile } = await req.json();
    console.log(`mobile:${userName},${userMobile}`);

    if (!userName || !userMobile) {
      return NextResponse.json(
        { error: "Owner details are required" },
        { status: 400 }
      );
    }

    const user = await Users.find({ phone: userMobile });
    console.log("user in route: ", user);

    // if (user.length === 0) {
    //   return NextResponse.json(
    //     { error: "User does not exist" },
    //     { status: 400 }
    //   );
    // }

    const userEmail = user.length ? user[0].email : "";

    let totalProperties: any[] = [];

    if (userEmail) {
      const siteListings = await Properties.find({ email: userEmail });
      if (siteListings) totalProperties = [...siteListings];
    }

    const quickListings = await quicklisting.find({
      ownerMobile: userMobile,
    });
    if (quickListings) totalProperties = [...totalProperties, ...quickListings];

    if (!totalProperties) {
      return NextResponse.json(
        { error: "No properties found" },
        { status: 400 }
      );
    }

    const ownerProperties = totalProperties.map((property) => ({
      propertyId: property._id,
      propertyImages: property.propertyImages,
      isQuickListing: property?.QID ? true : false,
    }));

    return NextResponse.json(ownerProperties, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json(
        { error: "Error in fetching properties of user" },
        { status: 400 }
      );
    }
  }
}
