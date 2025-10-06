import { Property } from "@/models/listing";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";

connectDb();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, newPlaceName, newReviews } = body;
    const id = propertyId[0];

    if (!newReviews || !newPlaceName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { message: "Property ID is required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid property ID." },
        { status: 400 }
      );
    }

    const property = await Property.findById(id);

    if (!property) {
      return NextResponse.json(
        { message: "Property not found." },
        { status: 404 }
      );
    }

    property.newReviews = newReviews;
    property.newPlaceName = newPlaceName;

    await property.save();

    try {// ! updating the words count in content writer's profile

      const newWords: number = newReviews.split(" ").filter((item: string) => item != "").length;


      const token: any = await getDataFromToken(request);
      const { email } = token;

      const employee = await Employees.findOneAndUpdate({email}, {
        $inc: {
          "extras.wordsCount": newWords
        }
      });

    } catch (err: any) {
      console.log("words count not updated", err);
    }

    return NextResponse.json(
      { message: "Description Updated successfully" },
      { status: 200 }
    );

  } catch (error) {

    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
