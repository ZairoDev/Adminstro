import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Visits from "@/models/visit";

// Import Query model to ensure it's registered
import "@/models/query"; // Just import to register, don't need to use it

export async function POST(req: NextRequest) {
  try {
    const visits = await Visits.find()
      .populate({
        path: "lead",
        select: "name phoneNo email",
      })
      .sort({ createdAt: -1 });
    
    console.log("visits are here", visits);
    
    const totalVisits = await Visits.countDocuments();
    const totalPages = Math.ceil(totalVisits / 50);
    
    return NextResponse.json(
      { data: visits, totalPages, totalVisits },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("err in getting visits: ", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}