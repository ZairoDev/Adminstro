import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";

connectDb();

export async function POST(request: NextRequest) {
  const reqBody = await request.json();
  const { pId, data } = reqBody;

  console.log("Delete images request:", { pId, data });

  try {
    const property = await Properties.findById(pId);

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    let deletedCount = {
      cover: 0,
      gallery: 0,
    };

    // Handle cover image deletion
    if (
      data.propertyCoverFileUrl !== undefined &&
      data.propertyCoverFileUrl === true
    ) {
      console.log("Deleting cover image:", property.propertyCoverFileUrl);
      property.propertyCoverFileUrl = "";
      deletedCount.cover = 1;
    }

    // Handle propertyPictureUrls deletion (array of indices)
    if (
      data.propertyPictureUrls &&
      Array.isArray(data.propertyPictureUrls) &&
      data.propertyPictureUrls.length > 0
    ) {
      console.log(
        "Deleting gallery images at indices:",
        data.propertyPictureUrls
      );

      // Sort indices in descending order to avoid index shift issues when splicing
      const sortedIndices = [...data.propertyPictureUrls].sort(
        (a: number, b: number) => b - a
      );

      // Delete from propertyPictureUrls
      sortedIndices.forEach((index: number) => {
        if (index >= 0 && index < property.propertyPictureUrls.length) {
          console.log(
            `Removing image at index ${index}: ${property.propertyPictureUrls[index]}`
          );
          property.propertyPictureUrls.splice(index, 1);
          deletedCount.gallery++;
        }
      });

      // Sync propertyImages array with propertyPictureUrls if it exists
      if (
        property.propertyImages &&
        Array.isArray(property.propertyImages) &&
        property.propertyImages.length > 0
      ) {
        // Reset sortedIndices for propertyImages (need fresh sort in case arrays differ)
        const imageSortedIndices = [...data.propertyPictureUrls].sort(
          (a: number, b: number) => b - a
        );

        imageSortedIndices.forEach((index: number) => {
          if (index >= 0 && index < property.propertyImages.length) {
            console.log(`Removing image from propertyImages at index ${index}`);
            property.propertyImages.splice(index, 1);
          }
        });
      }
    }

    // Save the updated property
    await property.save();

    console.log("Property updated successfully. Deleted:", deletedCount);

    return NextResponse.json(
      {
        success: true,
        message: "Images deleted successfully",
        deletedCount,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in deleteImages API:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
