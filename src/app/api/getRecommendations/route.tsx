import { NextRequest, NextResponse } from "next/server";
// import dbConnect from "@/lib/dbConnect";
import Query from "@/models/query";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import mongoose, { PipelineStage } from "mongoose";
import { connectDb } from "@/util/db";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "queryId is required" },
        { status: 400 }
      );
    }

    // Fetch the query document
    const queryDoc = await Query.findById(id);
    if (!queryDoc) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    // Convert query to plain object
    const query = queryDoc.toObject();

    // Map noOfBeds to a string property type (only if needed)
    const bedType =
      query.noOfBeds && query.typeOfProperty === "Apartment"
        ? `${query.noOfBeds} Bedroom`
        : query.typeOfProperty;

    // Build the aggregation pipeline
    const pipeline: PipelineStage[] = [
      {
        $addFields: {
          priceNum: { $toDouble: "$price" },
        },
      },
      {
        $match: {
          availability: "Available",
          ...(query.location
            ? { location: { $regex: query.location, $options: "i" } }
            : {}),
          ...(query.area
            ? { area: { $regex: query.area, $options: "i" } }
            : {}),
          ...(bedType ? { propertyType: bedType } : {}),
          priceNum: { $gte: query.minBudget, $lte: query.maxBudget },
        },
      },
      {
        $group: {
          _id: "$area",
          count: { $sum: 1 },
          sampleProperties: { $push: "$$ROOT" },
        },
      },
      { $sort: { count: -1 } },
    ];

    const recommendations = await unregisteredOwner.aggregate(pipeline);
    console.log("recommendations: ", recommendations);
    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
