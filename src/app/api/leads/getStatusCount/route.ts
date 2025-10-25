import {NextRequest,NextResponse} from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { stat } from "fs";
// import { connect } from "http2";

connectDb();

export async function GET(req:NextRequest){
    try{
        const statusPipeline = [

  {
    $match: {
      leadStatus: { $ne: "rejected" },
    },
  },


  {
    $match: {
      messageStatus: {
        $in: ["First", "Second", "Third", "Fourth", "Options", "Visit"],
      },
    },
  },

  // 3️⃣ Group by messageStatus and location
  {
    $group: {
      _id: {
        messageStatus: "$messageStatus",
        location: { $ifNull: ["$location", "UnknownLocation"] },
      },
      count: { $sum: 1 },
    },
  },

  // 4️⃣ Regroup by messageStatus to build city:count maps
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

  // 5️⃣ Convert to { city: count }
  {
    $project: {
      _id: 0,
      messageStatus: "$_id",
      cityCounts: { $arrayToObject: "$cities" },
    },
  },

  // 6️⃣ Combine all statuses into one object
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

  // 7️⃣ (Optional) Add empty keys for missing statuses
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
];

    const result = await Query.aggregate(statusPipeline);
    console.log("result",result);
    return NextResponse.json({
        success: true,
        statusSummary: result[0] || {},
    })
    }catch(error){
        console.error("Error fetching status count:", error);
        return NextResponse.json({ success: false, message: "Error fetching status summary"});
        {status: 500}
        
    }    
}