// import { Property } from "@/models/listing";
// import { connectDb } from "@/util/db";
// import { NextRequest, NextResponse } from "next/server";
// connectDb();

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     console.log(body, "Body will print here");
//     const { userId } = body;
//     console.log(userId, "Property id will print here");
//     const property = await Property.findOne({ userId: userId });
//     if (!property) {
//       return NextResponse.json({ error: "Property not found", status: 404 });
//     }
//     return NextResponse.json({ property, status: 200 });
//   } catch (error: any) {
//     return NextResponse.json({
//       error: "An error occurred",
//       message: error.message,
//       status: 500,
//     });
//   }
// }

import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(body, "Body will print here");
    const { userId } = body;
    console.log(userId, "User ID will print here");
    const properties = await Property.find({ userId: userId });
    if (!properties || properties.length === 0) {
      return NextResponse.json(
        { error: "No properties found" },
        { status: 404 }
      );
    }
    const responseProperties = properties.map((property) => ({
      _id: property._id,
      basePrice: property.basePrice,
      VSID: property.VSID,
      propertyCoverFileUrl: property.propertyCoverFileUrl,
    }));
    return NextResponse.json(
      { properties: responseProperties },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "An error occurred",
      },
      { status: 500 }
    );
  }
}
