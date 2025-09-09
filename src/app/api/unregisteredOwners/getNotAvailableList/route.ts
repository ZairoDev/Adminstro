
import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();
export async function POST(req: NextRequest) {
  try{
    const { filters , page=1 , limit=50}  : { filters: FiltersInterface; page: number ; limit: number} =
        await req.json();
    const query: Record<string, any> = {};

    query["availability"]= "Not Available";

    if (filters.searchType && filters.searchValue)
      query[filters.searchType] = new RegExp(filters.searchValue, "i");

    if (filters.propertyType) query["propertyType"] = filters.propertyType;
    if (filters.rentalType === "Long Term") query["rentalType"] = "Long Term";
     if(filters.place) query["location"] = filters.place;
    if(filters.area) query["area"] = filters.area;
  
    if(filters.maxPrice && filters.minPrice) query["price"] = { $gte: filters.minPrice, $lte: filters.maxPrice };
    else if(filters.maxPrice) query["price"] = { $lte: filters.maxPrice };
    else if(filters.minPrice) query["price"] = { $gte: filters.minPrice };
    // else if(filters.place) query["location"] = filters.place;
    // console.log("query: ", query);

    const skip = (page - 1) * limit;

    const data = await unregisteredOwner.find(query).skip(skip).limit(limit).lean();
     const total = await unregisteredOwner.countDocuments(query);
    // console.log(data);  
    return NextResponse.json({data,total    }, {status: 200});
  }catch(err){
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}