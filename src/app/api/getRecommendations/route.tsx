import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import mongoose, { PipelineStage } from "mongoose";
import { connectDb } from "@/util/db";
import { Area } from "@/models/area";

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

    // 1️⃣ Fetch the query document
    const queryDoc = await Query.findById(id);
    if (!queryDoc) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    const query = queryDoc.toObject();
    const bedType = query.typeOfProperty;

    // 2️⃣ Build base matchStage (no availability filter yet)
    const baseMatchStage: Record<string, any> = {
      ...(bedType ? { propertyType: bedType } : {}),
    };

    if (query.location) {
      baseMatchStage.location = { $regex: query.location, $options: "i" };
    }

    // 3️⃣ Handle area, zone, metroZone logic
    if (query.area) {
      baseMatchStage.area = { $regex: query.area, $options: "i" };
    } else if (query.zone || query.metroZone) {
      const areaFilter: Record<string, any> = {};
      if (query.zone) areaFilter.zone = { $regex: query.zone, $options: "i" };
      if (query.metroZone)
        areaFilter.metroZone = { $regex: query.metroZone, $options: "i" };

      const matchingAreas = await Area.find(areaFilter).select("name");
      const areaNames = matchingAreas.map((a: any) => a.name);

      if (areaNames.length > 0) {
        baseMatchStage.area = { $in: areaNames };
      } else {
        // No matching areas -> no recommendations
        return NextResponse.json({
          success: true,
          available: [],
          unavailable: [],
          totalAvailable: 0,
          totalUnavailable: 0,
        });
      }
    }

    // 🔄 Helper to build pipeline for availability type
    const buildPipeline = (availability: string): PipelineStage[] => [
      {
        $match: {
          ...baseMatchStage,
          availability,
          $expr: {
            $and: [
              { $gte: [{ $toDouble: "$price" }, query.minBudget - 50] },
              { $lte: [{ $toDouble: "$price" }, query.maxBudget + 50] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$area",
          count: { $sum: 1 },
          properties: { $push: "$$ROOT" },
        },
      },
      { $sort: { count: -1 } },
    ];

    // 4️⃣ Run pipeline for both Available & Not Available
    const [availableResults, unavailableResults] = await Promise.all([
      unregisteredOwner.aggregate(buildPipeline("Available")),
      unregisteredOwner.aggregate(buildPipeline("Not Available")), // or "Unavailable"
    ]);

    // Flatten properties for easier access
    const allAvailable = availableResults.flatMap((g) => g.sampleProperties);
    const allUnavailable = unavailableResults.flatMap(
      (g) => g.sampleProperties
    );

    console.log(
      `Generated ${allAvailable.length} available and ${allUnavailable.length} unavailable recommendations for query ${id}`
    );

    return NextResponse.json({
      success: true,
      available: availableResults,
      unavailable: unavailableResults,
    });
  } catch (error: any) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
