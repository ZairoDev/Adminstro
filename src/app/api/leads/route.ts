import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const assignedArea = token.allotedArea;

    const { filters, page } = await req.json();
    const skip = (page - 1) * 50;
    console.log("Request Body:", filters);

    if (assignedArea) {
      filters.location = assignedArea;
    }

    console.log("filters: ", filters);

    const searchFilters: Record<string, any> = {};

    for (const key in filters) {
      const value = filters[key];
      if (typeof value === "number") {
        searchFilters[key] = { $gte: value };
      } else if (typeof value === "string") {
        if (key === "leadQualityByReviewer") {
          searchFilters[key] = value;
        } else {
          searchFilters[key] = new RegExp(value, "i");
        }
      }
    }
    console.log("search filters: ", searchFilters);
    // const leads = await Query.find(searchFilters).skip(skip).limit(12);
    const leads = await Query.find(searchFilters);
    // const totalQueries = await Query.countDocuments(searchFilters);
    // const totalPages = Math.ceil(totalQueries / 12);
    console.log(leads.length);

    // return NextResponse.json(
    //   {
    //     data: leads,
    //     page,
    //     totalPages,
    //     totalQueries,
    //   },
    //   { status: 200 }
    // );

    return NextResponse.json(leads, { status: 200 });
  } catch (err) {
    // Here you can handle the request and send a response
    return NextResponse.json(
      { error: "Unable to filter leads" },
      { status: 401 }
    );
  }
}
