
import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();
export async function POST(req: NextRequest) {
  try{
    const { filters }: { filters: FiltersInterface; page: number } =
        await req.json();
    const query: Record<string, any> = {};
    if (filters.searchType && filters.searchValue)
      query[filters.searchType] = new RegExp(filters.searchValue, "i");
    // if (filters.beds) query["beds"] = { $gte: filters.beds };
    // if (filters.bedrooms) query["bedrooms"] = { $gte: filters.bedrooms };
    // if (filters.bathroom) query["bathroom"] = { $gte: filters.bathroom };
    if (filters.propertyType) query["propertyType"] = filters.propertyType;
    if (filters.rentalType === "Long Term") query["rentalType"] = "Long Term";
    // if (filters.place.trim()) {
    //   query["$or"] = [
    //     { city: new RegExp(filters.place, "i") },
    //     { state: new RegExp(filters.place, "i") },
    //     { country: new RegExp(filters.place, "i") }, 
    //   ];
    // }
    // if (filters.minPrice && filters.maxPrice) {
    //   query[
    //     filters.rentalType === "Long Term" ? "basePriceLongTerm" : "basePrice"
    //   ] = { $gte: filters.minPrice, $lte: filters.maxPrice };
    // } else {
    //   if (filters.minPrice)
    //     query[
    //       filters.rentalType === "Long Term" ? "basePriceLongTerm" : "basePrice"
    //     ] = { $gte: filters.minPrice };
    //   if (filters.maxPrice)
    //     query[
    //       filters.rentalType === "Long Term" ? "basePriceLongTerm" : "basePrice"
    //     ] = { $lte: filters.maxPrice };
    // }
    if(filters.maxPrice && filters.minPrice) query["price"] = { $gte: filters.minPrice, $lte: filters.maxPrice };
    else if(filters.maxPrice) query["price"] = { $lte: filters.maxPrice };
    else if(filters.minPrice) query["price"] = { $gte: filters.minPrice };
    else if(filters.place) query["location"] = filters.place;
    console.log("query: ", query);
    const data = await unregisteredOwner.find(query);
    console.log(data);  
    return NextResponse.json({data}, {status: 200});
  }catch(err){
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}