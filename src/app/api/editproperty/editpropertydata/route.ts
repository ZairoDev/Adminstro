import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

interface UpdatedData {
  lastUpdatedBy?: string[];
  [key: string]: any; 
}
interface RequestBody {
  propertyId: string;
  updatedData: UpdatedData;
  userEmail: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get("host");
  console.log('host');
  try {
    const reqBody: RequestBody = await request.json();
    const { propertyId, updatedData, userEmail } = reqBody;
    console.log(userEmail, propertyId, updatedData);
    let { lastUpdatedBy } = updatedData;
    console.log(lastUpdatedBy);

    if (lastUpdatedBy) {
      lastUpdatedBy.push(userEmail);
      console.log(lastUpdatedBy);
      updatedData.lastUpdatedBy = lastUpdatedBy;
    } else {
      console.log('else');
    }

    console.log(updatedData);
    delete updatedData.VSID; 
    console.log(updatedData);

    if (!propertyId || !updatedData) {
      return new NextResponse(
        JSON.stringify({
          error: "Property ID, updated data, and user ID are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("here");

    const property = await Property.findOneAndUpdate(
      { _id: propertyId },
      { $set: updatedData },
      { new: true }
    );

    if (!property) {
      return new NextResponse(JSON.stringify({ message: "Property not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new NextResponse(JSON.stringify({ property }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
