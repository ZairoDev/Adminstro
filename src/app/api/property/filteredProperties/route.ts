import { NextRequest, NextResponse } from "next/server";

import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { Properties } from "@/models/property";

export async function POST(req: NextRequest) {
  const { filters, page }: { filters: FiltersInterface; page: number } = await req.json();

  console.log("filters: ", filters);

  const query: Record<string, any> = {};
  const projection = {
    _id: 1,
    VSID: 1,
    propertyCoverFileUrl: 1,
    basePrice: 1,
  };

  if (filters.searchType && filters.searchValue)
    query[filters.searchType] = new RegExp(filters.searchValue, "i");
  if (filters.beds) query["beds"] = { $gte: filters.beds };
  if (filters.bedrooms) query["bedrooms"] = { $gte: filters.bedrooms };
  if (filters.bathroom) query["bathroom"] = { $gte: filters.bathroom };
  if (filters.propertyType) query["propertyType"] = filters.propertyType;
  if (filters.minPrice && filters.maxPrice) {
    query["basePrice"] = { $gte: filters.minPrice, $lte: filters.maxPrice };
  } else {
    if (filters.minPrice) query["basePrice"] = { $gte: filters.minPrice };
    if (filters.maxPrice) query["basePrice"] = { $lte: filters.maxPrice };
  }

  console.log("query created: ", query);

  try {
    const filteredProperties = await Properties.find(query, projection)
      .skip((page - 1) * 20)
      .limit(20);
    const totalProperties = await Properties.countDocuments(query);

    console.log("filtered Properties: ", filteredProperties);

    return NextResponse.json({ filteredProperties, totalProperties }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
