
import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { FiltersInterfaces } from "@/app/spreadsheet/FilterBar";
import { Area } from "@/models/area";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt, validateLocationAccess } from "@/util/apiSecurity";

connectDb();
export async function POST(req: NextRequest) {
  try{
    // Get user token for authorization
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: string = (token.role || "") as string;
    const assignedArea: string | string[] | undefined = 
      token.allotedArea 
        ? (Array.isArray(token.allotedArea) 
            ? token.allotedArea 
            : typeof token.allotedArea === "string" 
            ? token.allotedArea 
            : undefined)
        : undefined;

    const { filters , page=1 , limit=50}  : { filters: FiltersInterfaces; page: number ; limit: number} =
        await req.json();
    const query: Record<string, any> = {};
    
  
    query["availability"]= "Available";
    // console.log("filters: ", filters);
    if (filters.searchType && filters.searchValue)
      query[filters.searchType] = new RegExp(filters.searchValue, "i");

    if (filters.propertyType) query["propertyType"] = filters.propertyType;
    // if (filters.rentalType === "Long Term") query["rentalType"] = "Long Term";
    if (filters.place) {
      const locations = filters.place.flat().filter(loc => typeof loc === 'string');

      if (filters.isImportant) {
        query["isImportant"] = "Important";
      }

      if (filters.isPinned) {
        query["isPinned"] = "Pinned";
      }

      // Security: Validate requested locations against user's assigned areas
      if (locations.length > 0) {
        if (!isLocationExempt(role)) {
          // For restricted users, filter to only their assigned locations
          const userAreas = Array.isArray(assignedArea)
            ? assignedArea.map((a: string) => a.toLowerCase())
            : assignedArea
            ? [String(assignedArea).toLowerCase()]
            : [];

          const validLocations = locations.filter((loc: string) =>
            userAreas.includes(loc.toLowerCase())
          );

          if (validLocations.length > 0) {
            query["$or"] = validLocations.map((loc: string) => ({
              location: { $regex: new RegExp(`^${loc}$`, "i") }
            }));
          } else {
            // No valid locations - return empty result
            query["$or"] = [{ location: { $in: [] } }];
          }
        } else {
          // Exempt roles can see all requested locations
          query["$or"] = locations.map((loc: string) => ({
            location: { $regex: new RegExp(`^${loc}$`, "i") }
          }));
        }
      }
    } else if (!isLocationExempt(role)) {
      // No location filter requested but user is restricted - apply default location filter
      applyLocationFilter(query, role, assignedArea, undefined);
    }
     if (filters.area?.length) {
      // exact match any of selected areas (case-insensitive)
      query["area"] = { $in: filters.area.map((a) => new RegExp(`^${a}$`, "i")) };
    }
     if (filters.place && filters.zone) {
      const areasInZone = await Area.find({ zone: filters.zone })
        .select("name")
        .lean();

      const areaNames = areasInZone.map((a) => a.name);
      // console.log("Areas in selected zone:", areaNames);

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
      // console.log("Areas in selected zone:", areaNames);

      // If we found areas in that zone, filter owners by those areas
      if (areaNames.length > 0) {
        query.area = { $in: areaNames };
      }
    }
    if (filters.minPrice || filters.maxPrice) {
      query["$expr"] = { $and: [] };

      const priceField = {
        $convert: {
          input: { $trim: { input: "$price" } },
          to: "double",
          onError: null, // skip invalid values
          onNull: null, // skip null values
        },
      };

      if (filters.minPrice) {
        query["$expr"].$and.push({
          $gte: [priceField, filters.minPrice],
        });
      }

      if (filters.maxPrice) {
        query["$expr"].$and.push({
          $lte: [priceField, filters.maxPrice],
        });
      }
    }
    
    const skip = (page - 1) * limit;

let data;
if (filters.sortByPrice) {
  // ✅ Use aggregation when sorting by price (string → number conversion)
  data = await unregisteredOwner.aggregate([
    { $match: query },
    {
      $addFields: {
        numericPrice: {
          $convert: {
            input: { $trim: { input: "$price" } },
            to: "double",
            onError: null,
            onNull: null,
          },
        },
      },
    },
    { $sort: { numericPrice: filters.sortByPrice === "asc" ? 1 : -1 , _id:-1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);
} else {
  // ✅ Normal sorting by creation date
  data = await unregisteredOwner
    .find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .sort({ createdAt: -1 , _id:-1});
}

     const total = await unregisteredOwner.countDocuments(query);
    // console.log(data);
    return NextResponse.json({data,total    }, {status: 200});
  }catch(err){
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}