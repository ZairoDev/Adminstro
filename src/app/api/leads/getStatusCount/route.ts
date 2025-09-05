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
        $group: {
          _id: "$messageStatus",
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          First: {
            $sum: { $cond: [{ $eq: ["$_id", "First"] }, "$count", 0] },
          },
          Second: {
            $sum: { $cond: [{ $eq: ["$_id", "Second"] }, "$count", 0] },
          },
          Third: {
            $sum: { $cond: [{ $eq: ["$_id", "Third"] }, "$count", 0] },
          },
          Fourth: {
            $sum: { $cond: [{ $eq: ["$_id", "Fourth"] }, "$count", 0] },
          },
          Options: {
            $sum: { $cond: [{ $eq: ["$_id", "Options"] }, "$count", 0] },
          },
          Visit: {
            $sum: { $cond: [{ $eq: ["$_id", "Visit"] }, "$count", 0] },
          },
          None: {
            $sum: { $cond: [{ $eq: ["$_id", "None"] }, "$count", 0] },
          },
          Null: {
            $sum: { $cond: [{ $eq: ["$_id", null] }, "$count", 0] },
          },
        },
      },
      {
        $project: { _id: 0 },
      },
    ];

    const result = await Query.aggregate(statusPipeline);

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