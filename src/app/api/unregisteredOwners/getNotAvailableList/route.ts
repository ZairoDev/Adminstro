import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { FiltersInterfaces } from "@/app/dashboard/spreadsheet/FilterBar";
import { Area } from "@/models/area";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();
export async function POST(req: NextRequest) {
  try {
    const {
      filters,
      page = 1,
      limit = 50,
    }: {
      filters: FiltersInterfaces;
      page: number;
      limit: number;
    } = await req.json();
    const query: Record<string, any> = {};

    query["availability"] = "Not Available";
    console.log("filters: ", filters);
    if (filters.searchType && filters.searchValue)
      query[filters.searchType] = new RegExp(filters.searchValue, "i");

    if (filters.propertyType) query["propertyType"] = filters.propertyType;
    // if (filters.rentalType === "Long Term") query["rentalType"] = "Long Term";
    if (filters.place) {
      const locations = filters.place
        .flat()
        .filter((loc) => typeof loc === "string");

      if (locations.length > 0) {
        query["$or"] = locations.map((loc) => ({
          location: { $regex: new RegExp(`^${loc}$`, "i") },
        }));
      }
    }
    if (filters.area) query["area"] = filters.area;
    if (filters.place && filters.zone) {
      const areasInZone = await Area.find({ zone: filters.zone })
        .select("name")
        .lean();

      const areaNames = areasInZone.map((a) => a.name);
      console.log("Areas in selected zone:", areaNames);

      // If we found areas in that zone, filter owners by those areas
      if (areaNames.length > 0) {
        query.area = { $in: areaNames };
      }
    }
    if (filters.place && filters.metroZone) {
      const areasInMetroZone = await Area.find({ metroZone: filters.metroZone })
        .select("name")
        .lean();

      const areaNames = areasInMetroZone.map((a) => a.name);
      console.log("Areas in selected zone:", areaNames);

      // If we found areas in that zone, filter owners by those areas
      if (areaNames.length > 0) {
        query.area = { $in: areaNames };
      }
    }
    if (filters.maxPrice && filters.minPrice)
      query["price"] = { $gte: filters.minPrice, $lte: filters.maxPrice };
    else if (filters.maxPrice) query["price"] = { $lte: filters.maxPrice };
    else if (filters.minPrice) query["price"] = { $gte: filters.minPrice };

    const skip = (page - 1) * limit;

    const data = await unregisteredOwner
      .find(query)
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await unregisteredOwner.countDocuments(query);
    // console.log(data);
    return NextResponse.json({ data, total }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
