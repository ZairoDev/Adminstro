import Query from "@/models/query";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try{
    const { phoneNo } = await req.json();

    if (!phoneNo) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }  

    const leads = await Query.findOne({ phoneNo: { $regex: phoneNo, $options: "i" } });
    console.log(leads);
    return NextResponse.json(leads);
  }
  catch(err){
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}