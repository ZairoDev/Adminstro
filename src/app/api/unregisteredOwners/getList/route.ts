
import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();
export async function POST(req: NextRequest) {
  try{
    await getDataFromToken(req);
    const { filters }: { filters: FiltersInterface; page: number } =
        await req.json();
    const query: Record<string, any> = {};

    // query["availability"]= "Available";

    if (filters.searchType && filters.searchValue)
      query[filters.searchType] = new RegExp(filters.searchValue, "i");

    if (filters.propertyType) query["propertyType"] = filters.propertyType;
    if (filters.rentalType === "Long Term") query["rentalType"] = "Long Term";
  
    if(filters.maxPrice && filters.minPrice) query["price"] = { $gte: filters.minPrice, $lte: filters.maxPrice };
    else if(filters.maxPrice) query["price"] = { $lte: filters.maxPrice };
    else if(filters.minPrice) query["price"] = { $gte: filters.minPrice };
    else if(filters.place) query["location"] = filters.place;

    const data = await unregisteredOwner.find(query);

    return NextResponse.json({data}, {status: 200});
  }catch(err: unknown){
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.log(err);
    return NextResponse.json({error: "Internal server error"}, {status: 500});
  }
}