import { connectDb } from "@/util/db";
import User from "../../../../models/user";
import { NextResponse } from "next/server";

connectDb();

interface RequestBody {
  _id: string;
  profilePic?: string;
  nationality?: string;
  name?: string;
  gender?: string;
  spokenLanguage?: string;
  bankDetails?: string;
  phone?: string;
  address?: string;
}
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body: RequestBody = await request.json();
    console.log("Received body:", body);

    const { _id, ...updateFields } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const updateData: Partial<RequestBody> = {};

    if (updateFields.profilePic)
      updateData.profilePic = updateFields.profilePic;
    if (updateFields.nationality)
      updateData.nationality = updateFields.nationality;
    if (updateFields.name) updateData.name = updateFields.name;
    if (updateFields.gender) updateData.gender = updateFields.gender;
    if (updateFields.spokenLanguage)
      updateData.spokenLanguage = updateFields.spokenLanguage;
    if (updateFields.bankDetails)
      updateData.bankDetails = updateFields.bankDetails;
    if (updateFields.phone) updateData.phone = updateFields.phone;
    if (updateFields.address) updateData.address = updateFields.address;

    console.log("Update data:", updateData);

    const user = await User.findOneAndUpdate(
      { _id },
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "User profile updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating user:", error); 
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
