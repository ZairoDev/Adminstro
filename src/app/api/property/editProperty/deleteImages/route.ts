import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";

connectDb();

export async function POST(request: NextRequest) {
  const { pId, data, syncImages } = await request.json();

  try {
    const property = await Properties.findById(pId);
    if (!property)
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );

    let deleted = { cover: 0, pictureUrls: 0, propertyImages: 0 };

    // 🗑 Cover Image
    if (data.propertyCoverFileUrl === true) {
      property.propertyCoverFileUrl = "";
      deleted.cover++;
    }

    // Helper function (remove by index)
    const removeByIndex = (arr: any[], indexes: number[]) => {
      [...indexes]
        .sort((a, b) => b - a)
        .forEach((i) => {
          if (i >= 0 && i < arr.length) arr.splice(i, 1);
        });
    };

    // -------------------------
    // 🔥 DELETE WITH SYNC OFF → only selected array
    // 🔥 DELETE WITH SYNC ON → remove by URL match in both
    // -------------------------

    // Property Picture URLs
    if (Array.isArray(data.propertyPictureUrls)) {
      const removedUrls = data.propertyPictureUrls
        .map((i: number) => property.propertyPictureUrls[i])
        .filter(Boolean);

      removeByIndex(property.propertyPictureUrls, data.propertyPictureUrls);
      deleted.pictureUrls += removedUrls.length;

      if (syncImages) {
        // Remove same URLs from propertyImages
        property.propertyImages = property.propertyImages.filter(
          (url: string) => !removedUrls.includes(url)
        );
      }
    }

    // Property Images
    if (Array.isArray(data.propertyImages)) {
      const removedUrls = data.propertyImages
        .map((i: number) => property.propertyImages[i])
        .filter(Boolean);

      removeByIndex(property.propertyImages, data.propertyImages);
      deleted.propertyImages += removedUrls.length;

      if (syncImages) {
        // Remove same URLs from propertyPictureUrls
        property.propertyPictureUrls = property.propertyPictureUrls.filter(
          (url: string) => !removedUrls.includes(url)
        );
      }
    }

    // -------------------------
    // 🧹 CLEAN DUPLICATES + EMPTY VALUES
    // -------------------------
    property.propertyPictureUrls = [
      ...new Set(property.propertyPictureUrls),
    ].filter(Boolean);
    property.propertyImages = [...new Set(property.propertyImages)].filter(
      Boolean
    );

    // -------------------------
    // 🔧 AUTO-FILL IF SYNC ON
    // -------------------------
    if (syncImages) {
      if (property.propertyPictureUrls.length === 0)
        property.propertyPictureUrls = [...property.propertyImages];

      if (property.propertyImages.length === 0)
        property.propertyImages = [...property.propertyPictureUrls];
    }

    await property.save();

    return NextResponse.json({ success: true, deleted }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
