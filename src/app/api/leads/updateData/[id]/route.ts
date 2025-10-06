import Query from "@/models/query";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest,{ params }: { params: { id: string } }) {
  try{

    const body = await req.json();
    // console.log("body: ", body);
    const { id } = params;
    // console.log("_id: ", params);
    const data = await Query.findById( id );
    if (data) {
      data[body.field] = body.value;
      await data.save();
      return NextResponse.json({ message: "Data updated successfully" }, { status: 200 });
    }
    return NextResponse.json({ message: "Data not found" }, { status: 404 });
  }
  catch(err){
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}