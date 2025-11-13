// import { NextRequest, NextResponse } from "next/server";
// import { connectDb } from "@/util/db";
// connectDb();
// export async function PUT(req: NextRequest): Promise<NextResponse | undefined> {
//   try {
//     const reqBody = await req.json();
//     const { VSID, propertyData } = reqBody;
//     if (!VSID) {
//       return NextResponse.json(
//         {
//           error: "Property ID is required",
//         },
//         { status: 400 }
//       );
//     }
//     console.log(VSID, propertyData);
//     return NextResponse.json(
//       {
//         message: "Property updated successfully",
//         data: { VSID, propertyData },
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.log(error);
//     return NextResponse.json(
//       {
//         error: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Property } from "@/models/listing";
import { Properties } from "@/models/property";

connectDb();

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const reqBody = await req.json();
    const { PropertyId, propertyData } = reqBody;

    // Ensure VSID and propertyData are provided
    if (!PropertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }
    if (!propertyData) {
      return NextResponse.json(
        { error: "Property data is required for update" },
        { status: 400 }
      );
    }

    console.log("message",PropertyId, propertyData.bedrooms,propertyData.beds);

    const updatedProperty = await Properties.findByIdAndUpdate(
      PropertyId,
      { $set: propertyData, propertyImages:propertyData.propertyPictureUrls },
      { new: true }
    );
    console.log("updatedProperty: ", updatedProperty);
    if (!updatedProperty) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Property updated successfully",
        data: updatedProperty,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating property:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
