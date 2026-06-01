import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

connectDb();

function resolveEffectiveApprovalStatus(property: {
  approvalStatus?: string;
  origin?: string;
}): string {
  if (property.approvalStatus) {
    return property.approvalStatus;
  }
  const source = (property.origin ?? "").toLowerCase();
  if (source.includes("holidaysera") || source.includes("housingsaga")) {
    return "pending";
  }
  return "approved";
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "VSID";
    const holidayseraOnly = url.searchParams.get("holidayseraOnly") === "true";
    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, unknown> = {};

    if (searchTerm) {
      query[searchType] = regex;
    }

    if (holidayseraOnly) {
      const holidayseraFilter = { origin: { $regex: /holidaysera/i } };
      if (Object.keys(query).length > 0) {
        query = { $and: [query, holidayseraFilter] };
      } else {
        query = holidayseraFilter;
      }
    }

    // HAdmin filter: only Short Term OR hostedFrom = "holidaysera"
    let isHAdmin = false;
    try {
      const payload: any = await getDataFromToken(request).catch(() => null);
      if (payload?.role === "HAdmin") {
        isHAdmin = true;
      }
    } catch (e) {
      // ignore token errors
    }

    if (isHAdmin) {
      const hadminFilter = {
        $or: [
          { rentalType: "Short Term" },
          { hostedFrom: { $regex: /holidaysera/i } },
        ],
      };
      if (Object.keys(query).length > 0) {
        query = { $and: [query, hadminFilter] };
      } else {
        query = hadminFilter;
      }
    }

    const projection = {
      isLive: 1,
      approvalStatus: 1,
      approvalNote: 1,
      approvedBy: 1,
      approvedAt: 1,
      origin: 1,
      hostedFrom: 1,
      hostedBy: 1,
      rentalType: 1,
      propertyCoverFileUrl: 1,
      VSID: 1,
      propertyName: 1,
      city: 1,
      bedrooms: 1,
      bathrooms: 1,
      basePrice: 1,
      basePriceLongTerm: 1,
      commonId: 1,
      _id: 1,
    };

    let allProperties;
    if (!searchTerm && !isHAdmin) {
      allProperties = await Properties.find({}, projection)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    } else {
      allProperties = await Properties.find(query, projection)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    }

    const totalProperties = await Properties.countDocuments(
      !searchTerm && !isHAdmin ? {} : query
    );
    const totalPages = Math.ceil(totalProperties / limit);

    const normalizedProperties = allProperties.map((property: { toObject?: () => Record<string, unknown> }) => {
      const plain =
        typeof property.toObject === "function"
          ? property.toObject()
          : (property as Record<string, unknown>);
      return {
        ...plain,
        effectiveApprovalStatus: resolveEffectiveApprovalStatus({
          approvalStatus: plain.approvalStatus as string | undefined,
          origin: plain.origin as string | undefined,
        }),
      };
    });

    return NextResponse.json({
      data: normalizedProperties,
      page,
      totalPages,
      totalProperties,
    });
  } catch (error: any) {
    console.error("Error in GET request:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch properties from the database",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
