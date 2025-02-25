import { NextRequest, NextResponse } from "next/server";

import { Properties } from "@/models/property";
import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";

export async function POST(req: NextRequest) {
  const { filters, page }: { filters: FiltersInterface; page: number } = await req.json();

  // console.log("filters: ", filters, filters.dateRange);

  const query: Record<string, any> = {};
  const projection = {
    _id: 1,
    VSID: 1,
    propertyCoverFileUrl: 1,
    basePrice: 1,
    basePriceLongTerm: 1,
    rentalType: 1,
    email: 1,
    city: 1,
    state: 1,
    country: 1,
    pricePerDay: 1,
  };

  if (filters.searchType && filters.searchValue)
    query[filters.searchType] = new RegExp(filters.searchValue, "i");
  if (filters.beds) query["beds"] = { $gte: filters.beds };
  if (filters.bedrooms) query["bedrooms"] = { $gte: filters.bedrooms };
  if (filters.bathroom) query["bathroom"] = { $gte: filters.bathroom };
  if (filters.propertyType) query["propertyType"] = filters.propertyType;
  if (filters.rentalType === "Long Term") query["rentalType"] = "Long Term";
  if (filters.place.trim()) {
    query["$or"] = [
      { city: new RegExp(filters.place, "i") },
      { state: new RegExp(filters.place, "i") },
      { country: new RegExp(filters.place, "i") },
    ];
  }
  if (filters.minPrice && filters.maxPrice) {
    query["basePrice"] = { $gte: filters.minPrice, $lte: filters.maxPrice };
  } else {
    if (filters.minPrice) query["basePrice"] = { $gte: filters.minPrice };
    if (filters.maxPrice) query["basePrice"] = { $lte: filters.maxPrice };
  }

  // console.log("query created: ", query);

  try {
    const filteredProperties = await Properties.find(query, projection)
      .skip((page - 1) * 20)
      .limit(20);

    const totalProperties = await Properties.countDocuments(query);
    if (filters.dateRange) {
      const filteredDocs = getFilteredDocuments(
        filteredProperties,
        filters.dateRange?.from ?? new Date(),
        filters.dateRange?.to ?? new Date(),
        filters.minPrice,
        filters.maxPrice
      );

      return NextResponse.json(
        { filteredProperties: filteredDocs, totalProperties: filteredDocs.length },
        { status: 200 }
      );
    }
    return NextResponse.json({ filteredProperties, totalProperties }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    // console.log("error in filter:", err);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getFilteredDocuments(
  docs: any,
  startDate: Date,
  endDate: Date,
  minPrice: number,
  maxPrice: number
) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return docs.filter((doc: any) => {
    // Iterate through the pricePerDay array (which is an array of months)
    for (let monthIndex = 0; monthIndex < doc.pricePerDay.length; monthIndex++) {
      const monthDays = doc.pricePerDay[monthIndex];

      // Find the start and end date of this month
      const monthStartDate = new Date(start.getFullYear(), monthIndex, 1); //new Date(year,month,day)
      const monthEndDate = new Date(start.getFullYear(), monthIndex + 1, 0);

      // Check if the date range overlaps with the month
      if (start < monthEndDate && end > monthStartDate) {
        // Determine the range of days to check in this month
        const rangeStart = Math.max(start.getDate(), 1); // Ensure it doesn't go below 1
        const rangeEnd = Math.min(end.getDate(), monthDays.length); // Ensure it doesn't go beyond number of days in month

        // Check the price per day for the date range
        for (let day = rangeStart; day <= rangeEnd; day++) {
          const price = monthDays[day - 1]; // day - 1 because array is 0-indexed

          // If the day is booked (price = -1) or not within the price range, exclude this document
          if (price === -1 || price < minPrice || price > maxPrice) {
            return false; // Don't include this document
          }
        }
      }
    }
    return true; // Include this document if it passes all checks
  });
}
