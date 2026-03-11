import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    try {
      await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const { petId, changedStatus } = await req.json();
    // console.log("lead: ", petId, changedStatus);

    if (!petId || !changedStatus) {
      return NextResponse.json({ error: "Insufficient data" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(petId)) {
      return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
    }

    const updatedLead = await unregisteredOwner.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(petId) },
      { $set: { petStatus: changedStatus } },
      { new: true },
    );

    if (!updatedLead) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "pet status updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("error in status: ", err);
    return NextResponse.json(
      { error: "Error in updating pet status" },
      { status: 500 }
    );
  }
}
