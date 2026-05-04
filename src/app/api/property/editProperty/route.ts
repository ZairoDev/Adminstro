import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

/** Accepts numbers or numeric strings (e.g. inputs); strips thousands separators. */
function parseNumericField(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

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

    // ====================================
    // 🔥 AUTO-MERGE UPLOADED IMAGES
    // ====================================
    const incomingImages = Array.isArray(propertyData.propertyImages)
      ? propertyData.propertyImages
      : [];
    const incomingPics = Array.isArray(propertyData.propertyPictureUrls)
      ? propertyData.propertyPictureUrls
      : [];
    const existingImages = Array.isArray(existing.propertyImages)
      ? existing.propertyImages
      : [];
    const existingPics = Array.isArray(existing.propertyPictureUrls)
      ? existing.propertyPictureUrls
      : [];

    let mergedImages = Array.from(
      new Set([...existingImages, ...incomingImages])
    ).filter(Boolean);
    let mergedPics = Array.from(
      new Set([...existingPics, ...incomingPics])
    ).filter(Boolean);

    // ====================================
    // 🔄 SYNC ON (Mirror Both Arrays)
    // ====================================
    if (syncImages) {
      mergedPics = [...mergedImages];
    }

    // ====================================
    // 🧹 CLEAN DATA ALWAYS
    // ====================================
    mergedImages = Array.from(new Set(mergedImages)).filter(Boolean);
    mergedPics = Array.from(new Set(mergedPics)).filter(Boolean);

    // ====================================
    // 🔧 AUTO-FILL if sync ON
    // ====================================
    if (syncImages && mergedPics.length === 0 && mergedImages.length > 0)
      mergedPics = [...mergedImages];

    if (syncImages && mergedImages.length === 0 && mergedPics.length > 0)
      mergedImages = [...mergedPics];

    // Apply merged images to propertyData
    propertyData.propertyImages = mergedImages;
    propertyData.propertyPictureUrls = mergedPics;

    // ====================================
    // 📝 PROCESS ALL EDITABLE FIELDS
    // ====================================
    const updateData: any = { ...propertyData };

    // ---------------------------
    // BASIC INFORMATION FIELDS
    // ---------------------------
    if (propertyData.propertyType !== undefined) {
      updateData.propertyType = propertyData.propertyType;
    }

    if (propertyData.placeName !== undefined) {
      updateData.placeName = propertyData.placeName;
    }

    if (propertyData.size !== undefined) {
      updateData.size = Number(propertyData.size) || 0;
    }

    if (propertyData.floor !== undefined) {
      updateData.floor = propertyData.floor;
    }

    if (propertyData.neighbourhood !== undefined) {
      updateData.neighbourhood = propertyData.neighbourhood;
    }

    if (propertyData.subarea !== undefined) {
      updateData.subarea = propertyData.subarea;
    }

    if (propertyData.guests !== undefined) {
      updateData.guests = Number(propertyData.guests) || 0;
    }

    // ---------------------------
    // PRICING FIELDS
    // ---------------------------
    if (propertyData.basePrice !== undefined) {
      updateData.basePrice = parseNumericField(propertyData.basePrice);
    }

    if (propertyData.basePriceLongTerm !== undefined) {
      updateData.basePriceLongTerm = parseNumericField(
        propertyData.basePriceLongTerm,
      );
    }

    if (propertyData.weekendPrice !== undefined) {
      updateData.weekendPrice = parseNumericField(propertyData.weekendPrice);
    }

    if (propertyData.weeklyDiscount !== undefined) {
      updateData.weeklyDiscount = parseNumericField(
        propertyData.weeklyDiscount,
      );
    }

    if (propertyData.monthlyDiscount !== undefined) {
      updateData.monthlyDiscount = parseNumericField(
        propertyData.monthlyDiscount,
      );
    }

    // ---------------------------
    // PROPERTY SPECIFICATIONS
    // ---------------------------
    if (propertyData.area !== undefined) {
      updateData.area = propertyData.area;
    }

    if (propertyData.bedrooms !== undefined) {
      updateData.bedrooms = Number(propertyData.bedrooms) || 0;
    }

    if (propertyData.bathroom !== undefined) {
      updateData.bathroom = Number(propertyData.bathroom) || 0;
    }

    if (propertyData.beds !== undefined) {
      updateData.beds = Number(propertyData.beds) || 0;
    }

    if (propertyData.kitchen !== undefined) {
      updateData.kitchen = Number(propertyData.kitchen) || 0;
    }

    // ---------------------------
    // LOCATION FIELDS
    // ---------------------------
    if (propertyData.city !== undefined) {
      updateData.city = propertyData.city;
    }

    if (propertyData.street !== undefined) {
      updateData.street = propertyData.street;
    }

    if (propertyData.postalCode !== undefined) {
      updateData.postalCode = propertyData.postalCode;
    }

    if (propertyData.state !== undefined) {
      updateData.state = propertyData.state;
    }

    if (propertyData.country !== undefined) {
      updateData.country = propertyData.country;
    }

    if (
      propertyData.center !== undefined &&
      propertyData.center !== null &&
      typeof propertyData.center === "object" &&
      "lat" in propertyData.center &&
      "lng" in propertyData.center
    ) {
      updateData.center = {
        lat: Number(propertyData.center.lat) || 0,
        lng: Number(propertyData.center.lng) || 0,
      };
    }

    if (propertyData.internalCity !== undefined) {
      updateData.internalCity = propertyData.internalCity;
    }

    if (propertyData.internalArea !== undefined) {
      updateData.internalArea = propertyData.internalArea;
    }

    // ---------------------------
    // AMENITIES
    // ---------------------------
    if (propertyData.generalAmenities !== undefined) {
      updateData.generalAmenities = propertyData.generalAmenities;
    }

    if (propertyData.otherAmenities !== undefined) {
      updateData.otherAmenities = propertyData.otherAmenities;
    }

    if (propertyData.safeAmenities !== undefined) {
      updateData.safeAmenities = propertyData.safeAmenities;
    }

    // ---------------------------
    // RULES & POLICIES
    // ---------------------------
    if (propertyData.cooking !== undefined) {
      updateData.cooking = propertyData.cooking;
    }

    if (propertyData.party !== undefined) {
      updateData.party = propertyData.party;
    }

    if (propertyData.pet !== undefined) {
      updateData.pet = propertyData.pet;
    }

    if (propertyData.smoking !== undefined) {
      updateData.smoking = propertyData.smoking;
    }

    if (propertyData.additionalRules !== undefined) {
      updateData.additionalRules = propertyData.additionalRules;
    }

    // ---------------------------
    // BOOLEAN FLAGS
    // ---------------------------
    if (propertyData.isInstantBooking !== undefined) {
      updateData.isInstantBooking = Boolean(propertyData.isInstantBooking);
    }

    if (propertyData.isLive !== undefined) {
      updateData.isLive = Boolean(propertyData.isLive);
    }

    if (propertyData.isSuitableForStudents !== undefined) {
      updateData.isSuitableForStudents = Boolean(
        propertyData.isSuitableForStudents
      );
    }

    if (propertyData.isTopFloor !== undefined) {
      updateData.isTopFloor = Boolean(propertyData.isTopFloor);
    }

    // ---------------------------
    // DESCRIPTIONS
    // ---------------------------
    if (propertyData.reviews !== undefined) {
      updateData.reviews = propertyData.reviews;
    }

    if (propertyData.newReviews !== undefined) {
      updateData.newReviews = propertyData.newReviews;
    }

    // ---------------------------
    // ADDITIONAL PROPERTY DETAILS
    // ---------------------------
    if (propertyData.orientation !== undefined) {
      updateData.orientation = propertyData.orientation;
    }

    if (propertyData.levels !== undefined) {
      updateData.levels = Number(propertyData.levels) || 0;
    }

    if (propertyData.zones !== undefined) {
      updateData.zones = propertyData.zones;
    }

    if (propertyData.propertyStyle !== undefined) {
      updateData.propertyStyle = propertyData.propertyStyle;
    }

    if (propertyData.constructionYear !== undefined) {
      updateData.constructionYear = Number(propertyData.constructionYear) || 0;
    }

    if (propertyData.monthlyExpenses !== undefined) {
      updateData.monthlyExpenses = Number(propertyData.monthlyExpenses) || 0;
    }

    if (propertyData.heatingType !== undefined) {
      updateData.heatingType = propertyData.heatingType;
    }

    if (propertyData.heatingMedium !== undefined) {
      updateData.heatingMedium = propertyData.heatingMedium;
    }

    if (propertyData.energyClass !== undefined) {
      updateData.energyClass = propertyData.energyClass;
    }

    // ---------------------------
    // NEARBY LOCATIONS
    // ---------------------------
    if (propertyData.nearbyLocations !== undefined) {
      updateData.nearbyLocations = propertyData.nearbyLocations;
    }

    // ---------------------------
    // COVER IMAGE
    // ---------------------------
    if (propertyData.propertyCoverFileUrl !== undefined) {
      updateData.propertyCoverFileUrl = propertyData.propertyCoverFileUrl;
    }

    // ====================================
    // 📊 UPDATE TRACKING
    // ====================================
    const currentDate = new Date().toISOString();

    // Prepare update tracking
    const lastUpdatedBy = Array.isArray(existing.lastUpdatedBy)
      ? [...existing.lastUpdatedBy]
      : [];
    const priorUpdates = Array.isArray(existing.lastUpdates)
      ? [...existing.lastUpdates]
      : [];
    // Schema is [[String]]; older saves may have pushed plain strings (invalid rows).
    const lastUpdates: string[][] = priorUpdates.flatMap((row: unknown) => {
      if (Array.isArray(row)) return [row as string[]];
      if (typeof row === "string") return [[row]];
      return [];
    });

    lastUpdatedBy.push(propertyData.updatedBy || "Admin");
    lastUpdates.push([currentDate]);

    updateData.lastUpdatedBy = lastUpdatedBy;
    updateData.lastUpdates = lastUpdates;

    // Never $set immutable / server-owned fields (MongoDB errors on _id; timestamps should stay server-driven).
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // ====================================
    // 💾 SAVE UPDATED PROPERTY
    // ====================================
    const updated = await Properties.findByIdAndUpdate(
      PropertyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update property" },
        { status: 500 }
      );
    }

    // ====================================
    // ✅ SUCCESS RESPONSE
    // ====================================
    return NextResponse.json(
      {
        success: true,
        message: "Property updated successfully",
        data: updated,
        syncApplied: syncImages,
        imageStats: {
          propertyImages: mergedImages.length,
          propertyPictureUrls: mergedPics.length,
          synced: syncImages,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Error updating property:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
