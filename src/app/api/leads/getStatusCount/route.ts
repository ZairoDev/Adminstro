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


  {
    $group: {
      _id: {
        messageStatus: "$messageStatus",
        location: { $ifNull: ["$location", "UnknownLocation"] },
      },
      count: { $sum: 1 },
    },
  },

  
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

 
  {
    $project: {
      _id: 0,
      messageStatus: "$_id",
      cityCounts: { $arrayToObject: "$cities" },
    },
  },

  
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