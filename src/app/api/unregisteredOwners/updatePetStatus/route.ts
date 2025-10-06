import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { petId, changedStatus } = await req.json();
    // console.log("lead: ", petId, changedStatus);

    if (!petId || !changedStatus) {
      return NextResponse.json({ error: "Insufficient data" }, { status: 400 });
    }

    const updatedLead = await unregisteredOwner.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(petId) },
      { $set: { petStatus: changedStatus } }
    );

    return NextResponse.json(
      { message: "pet status updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("error in status: ", err);
    return NextResponse.json(
      { error: "Error in updating pet status" },
      { status: 401 }
    );
  }
}
