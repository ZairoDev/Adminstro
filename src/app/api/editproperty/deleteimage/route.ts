import { NextRequest, NextResponse } from "next/server";
import { Property, IProperty } from "@/models/listing";
import { connectDb } from "@/util/db";
import { Types } from "mongoose";

connectDb();

export async function DELETE(request: NextRequest) {
  try {
    const {
      id,
      url: imageUrl,
      index,
      portionIndex,
      type,
    } = await request.json();
    console.log(id, imageUrl, index, portionIndex, type);

    // Validate the input
    if (!id || !imageUrl || typeof index === "undefined" || !type) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid property ID" },
        { status: 400 }
      );
    }

    const property = await Property.findById(id);
    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    let updateOperation: any = {};

    switch (type) {
      case "propertyCoverFileUrl":
        if (property.propertyCoverFileUrl === imageUrl) {
          updateOperation = { $set: { propertyCoverFileUrl: "" } };
        }
        break;

      case "propertyPictureUrls":
        updateOperation = {
          $pull: { propertyPictureUrls: imageUrl }
        };
        break;

      case "portionCoverFileUrls":
        if (property.portionCoverFileUrls && property.portionCoverFileUrls[index] === imageUrl) {
          updateOperation = {
            $set: { [`portionCoverFileUrls.${index}`]: "" }
          };
        }
        break;
    
      case "portionPictureUrls":
        if (typeof portionIndex === "undefined") {
          return NextResponse.json(
            { error: "Missing portionIndex for portionPictureUrls" },
            { status: 400 }
          );
        }
        updateOperation = {
          $pull: { [`portionPictureUrls.${portionIndex}`]: imageUrl }
        };
        break;
    }
    const result = await Property.updateOne(
      { _id: id },
      updateOperation
    );

    console.log("Update result:", result);

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "No changes were made to the document" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Image deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}