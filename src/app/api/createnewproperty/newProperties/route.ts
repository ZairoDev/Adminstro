import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Property } from "@/util/type";
import { sendUserDetailsToCompany } from "@/util/gmailmailer";
import { Properties } from "@/models/property";
import { customAlphabet } from "nanoid";

connectDb();

const generateCommonId = (length: number): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const generateUniqueId = customAlphabet(charset, length);
  return generateUniqueId();
};

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
      weeklyDiscount,
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

    const propertyIds = [];
    const commonId = generateCommonId(7);

    for (let i = 0; i < (numberOfPortions ?? 1); i++) {
      console.log("LOOP: ", i);
      console.log("userId: ", userId, "email: ", email);
      const newProperty = await Properties.create({
        commonId: commonId,
        userId,
        email,
        rentalType,
        isInstantBooking: false,
        propertyType,
        rentalForm,
        propertyName: placeName,
        placeName: portionName?.[i],
        street,
        postalCode,
        city,
        state,
        country,
        center,
        size: portionSize?.[i],
        guests: guests?.[i],
        bedrooms: bedrooms?.[i],
        beds: beds?.[i],
        bathroom: bathroom?.[i],
        kitchen: kitchen?.[i],
        childrenAge: childrenAge?.[i],
        basePrice: basePrice?.[i],
        weekendPrice: weekendPrice?.[i],
        weeklyDiscount: weeklyDiscount?.[i],
        pricePerDay: pricePerDay?.[i],
        basePriceLongTerm: basePriceLongTerm?.[i],
        monthlyDiscount: monthlyDiscount?.[i],
        monthlyDiscountLongTerm: monthlyDiscountLongTerm?.[i],
        currency,
        icalLinks: {},
        generalAmenities,
        otherAmenities,
        safeAmenities,
        smoking,
        pet,
        party,
        cooking,
        additionalRules,
        reviews: reviews?.[i],
        newReviews: "",
        propertyImages: [propertyCoverFileUrl, ...(propertyPictureUrls || [])],
        propertyCoverFileUrl: portionCoverFileUrls?.[i] || "",
        propertyPictureUrls: portionPictureUrls?.[i] || [],
        night,
        time,
        datesPerPortion: datesPerPortion?.[i],
        area,
        subarea,
        neighbourhood,
        floor,
        isTopFloor,
        orientation,
        levels,
        zones,
        propertyStyle,
        constructionYear,
        isSuitableForStudents,
        monthlyExpenses,
        heatingType,
        heatingMedium,
        energyClass,
        nearbyLocations,
        hostedFrom: host,
        hostedBy,
        listedOn: [],
        lastUpdatedBy: [],
        lastUpdates: [],
        longTermMonths,
        isLive,
      });

      console.log(newProperty._id, newProperty.VSID, newProperty.commonId);
      propertyIds.push(newProperty.VSID);
    }
    return NextResponse.json({ propertyIds }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
