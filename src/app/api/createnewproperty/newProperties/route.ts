import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";
import Users from "@/models/user";
import { Property as PropertyType } from "@/util/type";
import { getDataFromToken } from "@/util/getDataFromToken";
import { sendOwnerPropertyRegisteredEmail } from "@/util/ownerListingEmail";
import { resolveShortTermDraft } from "@/lib/resolve-short-term-draft";
import { customAlphabet } from "nanoid";

connectDb();

const generateCommonId = (length: number): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return customAlphabet(charset, length)();
};

const VALID_ORIGINS = ["vacationsaga", "holidaysera", "housingsaga"] as const;
type ListingOrigin = (typeof VALID_ORIGINS)[number];

const APPROVAL_REQUIRED_ORIGINS = new Set<ListingOrigin>([
  "holidaysera",
  "housingsaga",
]);

function resolveApprovalStatus(origin: ListingOrigin): "pending" | "approved" {
  return APPROVAL_REQUIRED_ORIGINS.has(origin) ? "pending" : "approved";
}

function normalizeOrigin(value: unknown): ListingOrigin {
  if (
    typeof value === "string" &&
    VALID_ORIGINS.includes(value as ListingOrigin)
  ) {
    return value as ListingOrigin;
  }
  return "vacationsaga";
}

function sanitizeAmenities(obj: unknown): Record<string, boolean> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const entries = Object.entries(obj as Record<string, unknown>).filter(
    ([, v]) => v === true || v === false
  ) as [string, boolean][];
  return Object.fromEntries(entries);
}

export async function POST(request: NextRequest) {
  try {
    const data: PropertyType & {
      shortTermDraft?: boolean;
      ownerSheetId?: string;
    } = await request.json();
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
        origin,
        basePriceLongTerm,
        monthlyDiscountLongTerm,
        longTermMonths,
        isLive,
      } = data;

      if (!userId) {
        return NextResponse.json(
          { error: "userId is required" },
          { status: 400 }
        );
      }

      const normalizedEmail =
        typeof email === "string" && email.trim().length > 0
          ? email.trim()
          : "-";

      const explicitOwnerSheetId =
        typeof data.ownerSheetId === "string" ? data.ownerSheetId.trim() : "";

      const ownerUser = await Users.findById(userId).select("email phone").lean();
      const draftResolution = await resolveShortTermDraft({
        userId,
        ownerEmail:
          normalizedEmail !== "-"
            ? normalizedEmail
            : String((ownerUser as { email?: string } | null)?.email ?? "") ||
              undefined,
        ownerPhone: String((ownerUser as { phone?: string } | null)?.phone ?? ""),
        explicitDraft: data.shortTermDraft === true,
        explicitOwnerSheetId,
      });

      const shortTermDraft = draftResolution.shortTermDraft;
      const ownerSheetId = draftResolution.ownerSheetId;

      if (shortTermDraft && (normalizedEmail === "-" || !normalizedEmail)) {
        return NextResponse.json(
          { error: "Owner email is required before registering property" },
          { status: 400 },
        );
      }

      const resolvedIsLive = shortTermDraft ? false : Boolean(isLive);

      let listedByEmail = "";
      if (shortTermDraft) {
        try {
          const auth = await getDataFromToken(request);
          listedByEmail = String(
            (auth as { email?: string }).email ?? "",
          ).trim();
        } catch {
          listedByEmail = "";
        }
      }

      console.log("data:", data);
      const mongoIds: string[] = [];  
      const propertyIds: string[] = [];
      const commonId = generateCommonId(7);
      const normalizedOrigin = normalizeOrigin(origin);

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

      if (shortTermDraft && ownerSheetId) {
        const ownerSheetRow = await unregisteredOwnerShortTerm
          .findById(ownerSheetId)
          .select("propertyMongoId VSID listedBy advertListingStatus")
          .lean();
        const existingPropertyId = String(
          (ownerSheetRow as { propertyMongoId?: string } | null)
            ?.propertyMongoId ?? "",
        ).trim();

        if (existingPropertyId) {
          let authEmail = listedByEmail;
          try {
            const auth = await getDataFromToken(request);
            const role = String((auth as { role?: string }).role ?? "");
            if (role !== "Advert" && role !== "SuperAdmin") {
              return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            authEmail = String((auth as { email?: string }).email ?? "").trim();
          } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }

          const existing = await Properties.findById(existingPropertyId);
          if (!existing) {
            return NextResponse.json(
              { error: "Linked property not found" },
              { status: 404 },
            );
          }

          const portionCover =
            isMultiShortTerm && portionCoverFileUrls[0]
              ? portionCoverFileUrls[0]
              : propertyCoverFileUrl;
          let portionGallery =
            isMultiShortTerm && portionPictureUrls[0]
              ? portionPictureUrls[0]
              : propertyPictureUrls;
          portionGallery = Array.from(new Set(portionGallery || [])).filter(
            Boolean,
          );

          const lastUpdatedBy = Array.isArray(existing.lastUpdatedBy)
            ? [...existing.lastUpdatedBy]
            : [];
          if (authEmail) {
            lastUpdatedBy.push(authEmail);
          }
          const priorUpdates = Array.isArray(existing.lastUpdates)
            ? [...existing.lastUpdates]
            : [];
          const lastUpdates: string[][] = priorUpdates.flatMap(
            (row: unknown) => {
              if (Array.isArray(row)) return [row as string[]];
              if (typeof row === "string") return [[row]];
              return [];
            },
          );
          lastUpdates.push([new Date().toISOString()]);

          const updatePayload: Record<string, unknown> = {
            userId,
            email: normalizedEmail,
            propertyType,
            rentalForm,
            rentalType,
            origin: normalizedOrigin,
            propertyName: placeName,
            placeName: portionName?.[0],
            street,
            postalCode,
            city,
            state,
            country,
            center,
            internalCity,
            internalArea,
            size: portionSize?.[0],
            guests: guests?.[0],
            bedrooms: bedrooms?.[0],
            beds: beds?.[0],
            bathroom: bathroom?.[0],
            kitchen: kitchen?.[0],
            childrenAge: childrenAge?.[0],
            basePrice: basePrice?.[0],
            weekendPrice: weekendPrice?.[0],
            weeklyDiscount: weeklyDiscount?.[0],
            pricePerDay: pricePerDay?.[0],
            basePriceLongTerm: basePriceLongTerm?.[0],
            monthlyDiscount: monthlyDiscount?.[0],
            monthlyDiscountLongTerm: monthlyDiscountLongTerm?.[0],
            currency,
            generalAmenities: sanitizeAmenities(generalAmenities),
            otherAmenities: sanitizeAmenities(otherAmenities),
            safeAmenities: sanitizeAmenities(safeAmenities),
            smoking,
            pet,
            party,
            cooking,
            additionalRules,
            reviews: reviews?.[0],
            propertyCoverFileUrl: portionCover,
            propertyPictureUrls: portionGallery,
            propertyImages: [...masterImages],
            night,
            time,
            datesPerPortion: datesPerPortion?.[0],
            area,
            subarea,
            neighbourhood,
            floor,
            isTopFloor,
            orientation,
            levels,
            zones,
            propertyStyle,
            constructionYear: constructionYear
              ? Number(constructionYear) || undefined
              : undefined,
            isSuitableForStudents,
            monthlyExpenses: monthlyExpenses
              ? Number(monthlyExpenses) || undefined
              : undefined,
            heatingType,
            heatingMedium,
            energyClass,
            nearbyLocations: nearbyLocationsMap,
            hostedFrom: host,
            longTermMonths,
            lastUpdatedBy,
            lastUpdates,
          };

          const updated = await Properties.findByIdAndUpdate(
            existingPropertyId,
            { $set: updatePayload },
            { new: true, runValidators: true },
          );

          if (!updated) {
            return NextResponse.json(
              { error: "Failed to update property" },
              { status: 500 },
            );
          }

          const ownerSheetUpdate: Record<string, unknown> = {
            VSID: updated.VSID,
            propertyMongoId: existingPropertyId,
            advertListingStatus:
              (ownerSheetRow as { advertListingStatus?: string } | null)
                ?.advertListingStatus === "live"
                ? "live"
                : "listed_draft",
          };
          const existingListedBy = String(
            (ownerSheetRow as { listedBy?: string } | null)?.listedBy ?? "",
          ).trim();
          if (!existingListedBy && listedByEmail) {
            ownerSheetUpdate.listedBy = listedByEmail;
          }

          await unregisteredOwnerShortTerm.findByIdAndUpdate(
            ownerSheetId,
            ownerSheetUpdate,
          );

          return NextResponse.json(
            {
              propertyIds: [updated.VSID],
              mongoIds: [existingPropertyId],
              isLive: updated.isLive,
              shortTermDraft: true,
              ownerSheetId,
              updated: true,
            },
            { status: 200 },
          );
        }
      }

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
          email: normalizedEmail,
          propertyType,
          rentalForm,
          rentalType,
          origin: normalizedOrigin,
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
          generalAmenities: sanitizeAmenities(generalAmenities),
          otherAmenities: sanitizeAmenities(otherAmenities),
          safeAmenities: sanitizeAmenities(safeAmenities),
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
          constructionYear: constructionYear
            ? Number(constructionYear) || undefined
            : undefined,
          isSuitableForStudents,
          monthlyExpenses: monthlyExpenses
            ? Number(monthlyExpenses) || undefined
            : undefined,
          heatingType,
          heatingMedium,
          energyClass,
          nearbyLocations: nearbyLocationsMap,
          hostedFrom: host,
          hostedBy,
          listedOn: ["VacationSaga"],
          lastUpdatedBy: [],
          lastUpdates: [],
          longTermMonths,
          approvalStatus: resolveApprovalStatus(normalizedOrigin),
          isLive: resolvedIsLive,
          ...(shortTermDraft && ownerSheetId
            ? {
                listingSource: "short_term_owner_sheet",
                sourceOwnerSheetId: ownerSheetId,
                ownerOnboarding: {
                  serviceAgreementAcceptedAt: null,
                  partnerAgreementAcceptedAt: null,
                },
                ownerOnboardingComplete: false,
              }
            : {}),
        };

        const newProperty = await Properties.create(propertyData);
        propertyIds.push(newProperty.VSID);
        mongoIds.push(newProperty._id.toString());
      }

      if (shortTermDraft && ownerSheetId && propertyIds.length > 0) {
        const primaryVsid = propertyIds[0];
        const primaryMongoId = mongoIds[0];

        await unregisteredOwnerShortTerm.findByIdAndUpdate(ownerSheetId, {
          VSID: primaryVsid,
          propertyMongoId: primaryMongoId,
          advertListingStatus: "listed_draft",
          listedAt: new Date(),
          listedBy: listedByEmail,
        });

        const ownerRow = await unregisteredOwnerShortTerm
          .findById(ownerSheetId)
          .lean();
        const ownerUser = await Users.findById(userId).select("name email").lean();
        const ownerName =
          String((ownerRow as { name?: string } | null)?.name ?? "") ||
          String((ownerUser as { name?: string } | null)?.name ?? "Owner");
        const emailTo =
          normalizedEmail !== "-"
            ? normalizedEmail
            : String((ownerUser as { email?: string } | null)?.email ?? "");

        let emailSent = false;
        let emailError: string | undefined;
        if (emailTo) {
          try {
            const mailResult = await sendOwnerPropertyRegisteredEmail({
              to: emailTo,
              ownerName,
              propertyName: placeName ?? "Your property",
              vsid: primaryVsid,
              loginEmail: emailTo,
            });
            emailSent = mailResult.success;
            if (!mailResult.success) emailError = mailResult.message;
          } catch (mailErr) {
            console.error("sendOwnerPropertyRegisteredEmail failed:", mailErr);
            emailError =
              mailErr instanceof Error ? mailErr.message : "Email send failed";
          }
        }

        return NextResponse.json(
          {
            propertyIds,
            mongoIds,
            isLive: resolvedIsLive,
            shortTermDraft: true,
            ownerSheetId,
            emailSent,
            emailError,
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        { propertyIds, mongoIds, isLive: resolvedIsLive, shortTermDraft: false },
        { status: 200 },
      );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
