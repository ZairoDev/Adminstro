import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Property as PropertyModel } from "@/models/listing";
import { Property } from "@/util/type";
import { sendUserDetailsToCompany } from "@/util/gmailmailer";
import { Properties } from "@/models/property";
import { customAlphabet } from "nanoid";

connectDb();

const generateCommonId = (length: number): string => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
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
		const commonId = generateCommonId(5);

    for (let i = 0; i < (numberOfPortions ?? 1); i++) {
      console.log("LOOP: ", i);
      const property = new Properties({
				commonId: commonId,
        userId,
        email,
        propertyType,
				propertyName: placeName,
        placeName: portionName?.[i],
        rentalForm,
        street,
        postalCode,
        city,
        state,
        country,
        center,
        guests: guests?.[i],
        bedrooms: bedrooms?.[i],
        beds: beds?.[i],
        bathroom: bathroom?.[i],
        kitchen: kitchen?.[i],
        childrenAge: childrenAge?.[i],
        basePrice: basePrice?.[i],
        weekendPrice: weekendPrice?.[i],
        monthlyDiscount: monthlyDiscount?.[i],
        currency,
        pricePerDay: pricePerDay?.[i],
        generalAmenities,
        otherAmenities,
        safeAmenities,
        smoking,
        pet,
        party,
        cooking,
        additionalRules,
        reviews: reviews?.[i],
        propertyCoverFileUrl,
        propertyPictureUrls,
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
        basePriceLongTerm: basePriceLongTerm?.[i],
        monthlyDiscountLongTerm: monthlyDiscountLongTerm?.[i],
        longTermMonths,
        isLive,
      });

      const newProperty = await property.save();
      console.log("newProperty: ", newProperty);
      const VSID = newProperty.VSID;
      const propertyId = newProperty._id;
      propertyIds.push(propertyId);
    }

    // const property = new Properties({
    //   userId,
    //   email,
    //   propertyType,
    //   placeName,
    //   rentalForm,
    //   numberOfPortions,
    //   street,
    //   postalCode,
    //   city,
    //   state,
    //   country,
    //   center,
    //   portionName,
    //   portionSize,
    //   guests,
    //   bedrooms,
    //   beds,
    //   bathroom,
    //   kitchen,
    //   childrenAge,
    //   basePrice,
    //   weekendPrice,
    //   monthlyDiscount,
    //   currency,
    //   pricePerDay,
    //   generalAmenities,
    //   otherAmenities,
    //   safeAmenities,
    //   smoking,
    //   pet,
    //   party,
    //   cooking,
    //   additionalRules,
    //   reviews,
    //   propertyCoverFileUrl,
    //   propertyPictureUrls,
    //   portionCoverFileUrls,
    //   portionPictureUrls,
    //   night,
    //   time,
    //   datesPerPortion,
    //   area,
    //   subarea,
    //   neighbourhood,
    //   floor,
    //   isTopFloor,
    //   orientation,
    //   levels,
    //   zones,
    //   propertyStyle,
    //   isSuitableForStudents,
    //   monthlyExpenses,
    //   heatingMedium,
    //   energyClass,
    //   heatingType,
    //   constructionYear,

    //   nearbyLocations,

    //   hostedBy,
    //   hostedFrom: host,
    //   rentalType,
    //   basePriceLongTerm,
    //   monthlyDiscountLongTerm,
    //   longTermMonths,
    //   isLive,
    // });

    // const createdProperty = await property.save();
    // const VSID = createdProperty.VSID;
    // const propertyId = createdProperty._id;

    // await sendUserDetailsToCompany({
    //   email: email || " ",
    //   phone: phone,
    //   name: name,
    //   VSID: VSID,
    //   Link: `https://www.vacationsaga.com/listing-stay-detail?id=${propertyId}`,
    // });

    // return NextResponse.json(createdProperty, { status: 200 });
    return NextResponse.json({ propertyIds }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
