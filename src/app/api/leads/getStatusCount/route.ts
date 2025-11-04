import {NextRequest,NextResponse} from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function GET(req:NextRequest){
    try{
        const statusPipeline = [
  {
    $match: {
      leadStatus: { $nin: ["rejected","declined" ] },
    },
  },

  {
    $match: {
      messageStatus: {
        $in: ["First", "Second", "Third", "Fourth", "Options", "Visit"],
      },
    },
  },

  // Group by messageStatus and location
  {
    $group: {
      _id: {
        messageStatus: "$messageStatus",
        location: { $ifNull: ["$location", "UnknownLocation"] },
      },
      count: { $sum: 1 },
    },
  },

  // Regroup by messageStatus to build city:count maps
  {
    $group: {
      _id: "$_id.messageStatus",
      cities: {
        $push: {
          k: "$_id.location",
          v: "$count",
        },
      },
    },
  },

  // Convert to { city: count }
  {
    $project: {
      _id: 0,
      messageStatus: "$_id",
      cityCounts: { $arrayToObject: "$cities" },
    },
  },

  // Combine all statuses into one object
  {
    $group: {
      _id: null,
      data: {
        $push: {
          k: "$messageStatus",
          v: "$cityCounts",
        },
      },
    },
  },
  {
    $replaceRoot: {
      newRoot: { $arrayToObject: "$data" },
    },
  },

  // Add empty keys for missing statuses (will show with 0 values)
  {
    $addFields: {
      First: { $ifNull: ["$First", {}] },
      Second: { $ifNull: ["$Second", {}] },
      Third: { $ifNull: ["$Third", {}] },
      Fourth: { $ifNull: ["$Fourth", {}] },
      Options: { $ifNull: ["$Options", {}] },
      Visit: { $ifNull: ["$Visit", {}] },
    },
  },

  // Project in the desired order
  {
    $project: {
      First: 1,
      Second: 1,
      Third: 1,
      Fourth: 1,
      Options: 1,
      Visit: 1,
      _id: 0
    },
  },
];

    const result = await Query.aggregate(statusPipeline);
    console.log("result",result);
    
    return NextResponse.json({
        success: true,
        statusSummary: result[0] || {
          First: {},
          Second: {},
          Third: {},
          Fourth: {},
          Options: {},
          Visit: {}
        },
    })
    }catch(error){
        console.error("Error fetching status count:", error);
        return NextResponse.json(
          { success: false, message: "Error fetching status summary"},
          {status: 500}
        );
    }    
}