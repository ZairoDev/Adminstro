import { connectDb } from "@/util/db";
import { Area } from "@/models/area";
import { PipelineStage } from "mongoose";

export async function POST(req: Request) {
  try {
    await connectDb();
    const { location } = await req.json();

    // Build pipeline dynamically
    const pipeline: PipelineStage[] = [];

    // ✅ Add $match only if a specific location is provided (and not "all")
    if (location && location.toLowerCase() !== "all") {
      pipeline.push({
        $match: { city: location },
      });
    }

    // ✅ Project fields for consistent output
    pipeline.push({
      $project: {
        _id: 0,
        area: "$name",
        oneBedroomPrice: { $ifNull: ["$oneBhk", null] },
        twoBedroomPrice: { $ifNull: ["$twoBhk", null] },
        threeBedroomPrice: { $ifNull: ["$threeBhk", null] },
        studioPrice: { $ifNull: ["$studio", null] },
      },
    });

    // ✅ Sort by area name
    pipeline.push({ $sort: { area: 1 } });

    const result = await Area.aggregate(pipeline);

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
