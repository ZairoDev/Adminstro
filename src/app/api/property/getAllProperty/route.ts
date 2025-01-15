import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";

export const dynamic = "force-dynamic";

connectDb();

export async function GET(request: NextRequest) {
  // try {
  //   const url = new URL(request.url);
  //   const page = Number(url.searchParams.get("page")) || 1;
  //   const limit = Number(url.searchParams.get("limit")) || 12;
  //   const skip = (page - 1) * limit;
  //   const totalCount = await Properties.distinct("commonId").exec();
  //   const totalProperties = totalCount.length;
  //   const totalPages = Math.ceil(totalProperties / limit);
  //   const properties = await Properties.aggregate([
  //     {
  //       $group: {
  //         _id: "$commonId",
  //         commonProperties: { $push: "$$ROOT" },
  //       },
  //     },
  //     {
  //       $sort: {
  //         _id: -1,
  //       },
  //     },
  //     {
  //       $project: {
  //         commonId: "$_id",
  //         commonProperties: {
  //           $map: {
  //             input: "$commonProperties",
  //             as: "property",
  //             in: {
  //               VSID: "$$property.VSID",
  //               commonId: "$$property.commonId",
  //               propertyCoverFileUrl: "$$property.propertyCoverFileUrl",
  //               userId: "$$property.userId",
  //               hostedFrom: "$$property.hostedFrom",
  //               hostedBy: "$$property.hostedBy",
  //               basePrice: "$$property.basePrice",
  //             },
  //           },
  //         },
  //       },
  //     },
  //     { $skip: skip },
  //     { $limit: limit },
  //   ]);
  //   if (!properties || properties.length === 0) {
  //     return NextResponse.json(
  //       { error: "No Properties found" },
  //       { status: 404 }
  //     );
  //   }
  //   return NextResponse.json(
  //     {
  //       properties,
  //       totalProperties,
  //       totalPages,
  //       currentPage: page,
  //     },
  //     { status: 200 }
  //   );
  // } catch (err: any) {
  //   console.log("error in fetching properties: ", err);
  //   return NextResponse.json({ error: err.message }, { status: 500 });
  // }

  try {
    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "VSID";
    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    if (searchTerm) {
      query[searchType] = regex;
    }

    const projection = {
      isLive: 1,
      hostedFrom: 1,
      hostedBy: 1,
      propertyCoverFileUrl: 1,
      VSID: 1,
      basePrice: 1,
      commonId: 1,
      _id: 1,
    };
    let allProperties;
    if (!searchTerm) {
      allProperties = await Properties.find({}, projection)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    } else {
      allProperties = await Properties.find(query, projection).sort({
        _id: -1,
      });
    }

    if (allProperties.length === 0) {
      const totalCount = await Properties.countDocuments();
    }
    const totalProperties = await Properties.countDocuments(query);
    const totalPages = Math.ceil(totalProperties / limit);
    return NextResponse.json({
      data: allProperties,
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
