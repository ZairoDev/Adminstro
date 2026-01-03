// app/api/unregisteredOwners/getCounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt, validateLocationAccess } from "@/util/apiSecurity";

connectDb();

export async function POST(req: NextRequest) {
  try {
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

    const { filters, availability, allocations } = await req.json();

    // Build query based on filters
    const query: Record<string, any> = {};
    if (availability) query.availability = availability;

    // Security: Validate location access
    if (filters.place && filters.place.length > 0) {
      if (!isLocationExempt(role)) {
        // For restricted users, validate each requested location
        const userAreas = Array.isArray(assignedArea)
          ? assignedArea.map((a: string) => a.toLowerCase())
          : assignedArea
          ? [String(assignedArea).toLowerCase()]
          : [];

        const validLocations = filters.place.filter((loc: string) =>
          userAreas.includes(String(loc).toLowerCase())
        );

        if (validLocations.length > 0) {
          query.location = { $in: validLocations };
        } else {
          // No valid locations - return empty result
          query.location = { $in: [] };
        }
      } else {
        // Exempt roles can see all requested locations
        query.location = { $in: filters.place };
      }
    } else if (allocations && allocations.length > 0) {
      // Use allocations if provided (should be validated)
      if (!isLocationExempt(role)) {
        const userAreas = Array.isArray(assignedArea)
          ? assignedArea.map((a: string) => a.toLowerCase())
          : assignedArea
          ? [String(assignedArea).toLowerCase()]
          : [];

        const validAllocations = allocations.filter((loc: string) =>
          userAreas.includes(String(loc).toLowerCase())
        );

        if (validAllocations.length > 0) {
          query.location = { $in: validAllocations };
        } else {
          query.location = { $in: [] };
        }
      } else {
        query.location = { $in: allocations };
      }
    } else if (!isLocationExempt(role)) {
      // No location filter requested but user is restricted - apply default location filter
      applyLocationFilter(query, role, assignedArea, undefined);
    }
    if (filters.propertyType) query.propertyType = filters.propertyType;
    if (filters.minPrice) query.price = { ...query.price, $gte: filters.minPrice };
    if (filters.maxPrice) query.price = { ...query.price, $lte: filters.maxPrice };

    // 🔥 Aggregation for counts
    const counts = await unregisteredOwner.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$propertyType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to a lookup object {propertyType: count}
    const result = counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ counts: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}
