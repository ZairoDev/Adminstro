import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";

connectDb();

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { PropertyId, propertyData, syncImages } = await req.json();

    if (!PropertyId)
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );

    if (!propertyData)
      return NextResponse.json(
        { error: "Property data is required" },
        { status: 400 }
      );

    const existing = await Properties.findById(PropertyId);
    if (!existing)
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );

    // ---------------------------
    // 🔥 AUTO-MERGE UPLOADED IMAGES
    // ---------------------------
    const incomingImages = propertyData.propertyImages ?? [];
    const incomingPics = propertyData.propertyPictureUrls ?? [];

    let mergedImages = Array.from(
      new Set([...existing.propertyImages, ...incomingImages])
    ).filter(Boolean);
    let mergedPics = Array.from(
      new Set([...existing.propertyPictureUrls, ...incomingPics])
    ).filter(Boolean);

    // ---------------------------
    // 🔄 SYNC ON (Mirror Both)
    // ---------------------------
    if (syncImages) {
      mergedPics = [...mergedImages];
    }

    // ---------------------------
    // 🧹 CLEAN DATA ALWAYS
    // ---------------------------
    mergedImages = Array.from(new Set(mergedImages)).filter(Boolean);
    mergedPics = Array.from(new Set(mergedPics)).filter(Boolean);

    // ---------------------------
    // 🔧 AUTO-FILL if sync ON
    // ---------------------------
    if (syncImages && mergedPics.length === 0 && mergedImages.length > 0)
      mergedPics = [...mergedImages];

    if (syncImages && mergedImages.length === 0 && mergedPics.length > 0)
      mergedImages = [...mergedPics];

    // Apply to propertyData
    propertyData.propertyImages = mergedImages;
    propertyData.propertyPictureUrls = mergedPics;

    // Save
    const updated = await Properties.findByIdAndUpdate(
      PropertyId,
      { $set: propertyData },
      { new: true }
    );

    return NextResponse.json(
      { message: "Property updated successfully", data: updated },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
