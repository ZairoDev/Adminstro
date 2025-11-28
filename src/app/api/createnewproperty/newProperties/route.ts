  import { NextResponse } from "next/server";
  import { connectDb } from "@/util/db";
  import { Properties } from "@/models/property";
  import { Property as PropertyType } from "@/util/type";
  import { customAlphabet } from "nanoid";

  connectDb();

  const generateCommonId = (length: number): string => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return customAlphabet(charset, length)();
  };

  export async function POST(request: Request) {
    try {
      const data: PropertyType = await request.json();
      const host = request.headers.get("host");

      const {
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
        internalCity,
        internalArea,
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
        propertyPictureUrls = [],
        portionCoverFileUrls = [],
        portionPictureUrls = [],
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
        rentalType, // IMPORTANT FIELD
        basePriceLongTerm,
        monthlyDiscountLongTerm,
        longTermMonths,
        isLive,
      } = data;

      console.log("data:", data);
      const mongoIds: string[] = [];
      const propertyIds: string[] = [];
      const commonId = generateCommonId(7);

      const nearbyLocationsMap = nearbyLocations
        ? {
            nearbyLocationName: nearbyLocations.nearbyLocationName || [],
            nearbyLocationDistance:
              nearbyLocations.nearbyLocationDistance || [],
            nearbyLocationTag: nearbyLocations.nearbyLocationTag || [],
            nearbyLocationUrl: nearbyLocations.nearbyLocationUrl || [],
          }
        : {};

      // -----------------------------------------------------------------
      // 📌 IMAGE LOGIC: Short Term + multi-portions => own images
      // Otherwise => same images everywhere
      // -----------------------------------------------------------------
      const isMultiShortTerm =
        rentalType === "Short Term" && (numberOfPortions ?? 1) > 1;

      // MASTER images for non-multi-short-term OR global usage
      const masterImages = Array.from(
        new Set([propertyCoverFileUrl, ...(propertyPictureUrls || [])])
      ).filter(Boolean);

      for (let i = 0; i < (numberOfPortions ?? 1); i++) {
        // ----------------------------
        // 📌 PORTION-IMAGE DECISION
        // ----------------------------
        let portionCover =
          isMultiShortTerm && portionCoverFileUrls[i]
            ? portionCoverFileUrls[i]
            : propertyCoverFileUrl;
        
        let portionGallery =
          isMultiShortTerm && portionPictureUrls[i]
            ? portionPictureUrls[i]
            : propertyPictureUrls;

        portionGallery = Array.from(new Set(portionGallery || [])).filter(
          Boolean
        );

        const propertyData = {
          commonId,
          userId,
          email,
          propertyType,
          rentalForm,
          rentalType,
          isInstantBooking: false,
          propertyName: placeName,
          placeName: portionName?.[i],
          street,
          postalCode,
          city,
          state,
          country,
          center,
          internalCity,
          internalArea,
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

          // ----------------------------
          // 📌 FINAL IMAGE ASSIGNMENT
          // ----------------------------
          propertyCoverFileUrl: portionCover,
          propertyPictureUrls: portionGallery,
          propertyImages: [...masterImages], // ALWAYS SAME master everywhere

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
          nearbyLocations: nearbyLocationsMap,
          hostedFrom: host,
          hostedBy,
          listedOn: [],
          lastUpdatedBy: [],
          lastUpdates: [],
          longTermMonths,
          isLive,
        };

        const newProperty = await Properties.create(propertyData);
        propertyIds.push(newProperty.VSID);
        mongoIds.push(newProperty._id.toString());
      }

      return NextResponse.json({ propertyIds, mongoIds }, { status: 200 });
    } catch (error) {
      console.error("Error:", error);
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  }
