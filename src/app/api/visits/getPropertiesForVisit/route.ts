import { Properties } from "@/models/property";
import { quicklisting } from "@/models/quicklisting";
import Users from "@/models/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userMobile } = await req.json();

  try {
    const user = await Users.findOne({ phone: userMobile });

    if (!user) {
      return NextResponse.json(
        { error: "User does not exist" },
        { status: 400 }
      );
    }
    const userId = user._id.toString();
    let totalProperties: any[] = [];
    console.log("userId: ", userId);
    if (userId) {
      const siteListings = await Properties.find({ userId: userId });
      if (siteListings) totalProperties = [...siteListings];
    }

    const quickListings = await quicklisting.find({
      ownerMobile: userMobile,
    });
    if (quickListings) totalProperties = [...totalProperties, ...quickListings];

    return NextResponse.json(totalProperties, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to fetch properties" },
      { status: 400 }
    );
  }
}
