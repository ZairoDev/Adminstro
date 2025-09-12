// app/api/unregisteredOwners/getCounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { useAuthStore } from "@/AuthStore";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { filters, availability ,allocations} = await req.json();

    // Build query based on filters
    const query: Record<string, any> = {};
    if (availability) query.availability = availability;
    if (filters.place && filters.place.length > 0) {
  query.location = { $in: filters.place };
} else if (allocations && allocations.length > 0) {
  query.location = { $in: allocations };
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
