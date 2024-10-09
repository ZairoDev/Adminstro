import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Property as PropertyModel } from "@/models/listing";
import { Property } from "@/util/type";
import { sendUserDetailsToCompany } from "@/util/gmailmailer";

connectDb();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const host = request.headers.get("host");

    const {
      userId,
      email,
      phone = "", 
      name = "",
      propertyType,
      placeName,
      rentalForm,
      numberOfPortions,
      street,
      postalCode,
      city,
      state,
      country,
      center,
      portionName,
      portionSize,
      guests,
      bedrooms,
      beds,
      bathroom,
      kitchen,
      childrenAge,
      basePrice,
      weekendPrice,
      monthlyDiscount,
      currency,
      pricePerDay,
      generalAmenities,
      otherAmenities,
      safeAmenities,
      smoking,
      pet,
      party,
      cooking,
      additionalRules,
      reviews,
      propertyCoverFileUrl,
      propertyPictureUrls,
      portionCoverFileUrls,
      portionPictureUrls,
      night,
      time,
      datesPerPortion,
      area,
      subarea,
      neighbourhood,
      floor,
      isTopFloor = false,
      orientation,
      levels,
      zones,
      propertyStyle,
      isSuitableForStudents = true,
      monthlyExpenses,
      heatingMedium,
      energyClass,
      heatingType,
      constructionYear,

      nearbyLocations,

      hostedBy,
      rentalType,
      basePriceLongTerm,
      monthlyDiscountLongTerm,
      longTermMonths,
      isLive,
    }: Property = data;

    const property = new PropertyModel({
      userId,
      email,
      propertyType,
      placeName,
      rentalForm,
      numberOfPortions,
      street,
      postalCode,
      city,
      state,
      country,
      center,
      portionName,
      portionSize,
      guests,
      bedrooms,
      beds,
      bathroom,
      kitchen,
      childrenAge,
      basePrice,
      weekendPrice,
      monthlyDiscount,
      currency,
      pricePerDay,
      generalAmenities,
      otherAmenities,
      safeAmenities,
      smoking,
      pet,
      party,
      cooking,
      additionalRules,
      reviews,
      propertyCoverFileUrl,
      propertyPictureUrls,
      portionCoverFileUrls,
      portionPictureUrls,
      night,
      time,
      datesPerPortion,
      area,
      subarea,
      neighbourhood,
      floor,
      isTopFloor,
      orientation,
      levels,
      zones,
      propertyStyle,
      isSuitableForStudents,
      monthlyExpenses,
      heatingMedium,
      energyClass,
      heatingType,
      constructionYear,

      nearbyLocations,

      hostedBy,
      hostedFrom: host,
      rentalType,
      basePriceLongTerm,
      monthlyDiscountLongTerm,
      longTermMonths,
      isLive,
    });

    const createdProperty = await property.save();
    const VSID = createdProperty.VSID;
    const propertyId = createdProperty._id;

    await sendUserDetailsToCompany({
      email: email || " ",
      phone: phone,
      name: name,
      VSID: VSID,
      Link: `https://www.vacationsaga.com/listing-stay-detail?id=${propertyId}`,
    });

    return NextResponse.json(createdProperty, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
