import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

interface RequestBody {
  _id: string;
  profilePic?: string;
  nationality?: string;
  name?: string;
  gender?: string;
  spokenLanguage?: string;
  isActive?: boolean;
  isfeatured?: boolean;
  phone?: string;
  address?: string;
  aadhar?: string;
  accountNo?: number;
  alias?: string;
  country?: string;
  experience?: string;
  ifsc?: string;
  role?: string;
  assignedCountry?: string;
  allotedArea?: string[];
  salary?: number;
  empType?: string;
  duration?: string;
  isLocked?: boolean;
  password?: string;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await getDataFromToken(request);

    if (data.role != "SuperAdmin" && data.role != "HR") {
      return NextResponse.json(
        { error: "Unauthorized. Only SuperAdmin can edit employees." },
        { status: 403 }
      );
    }

    const body: RequestBody = await request.json();
    // console.log(body, "Body will print here");

    const { _id, ...updateFields } = body;
    if (!_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const updateData: Partial<RequestBody> = {};

    if (Object.keys(updateFields).includes("isActive")) {
      updateData.isActive = updateFields.isActive;
    }
    if (Object.keys(updateFields).includes("isfeatured")) {
      updateData.isfeatured = updateFields.isfeatured;
    }
    if (updateFields.profilePic)
      updateData.profilePic = updateFields.profilePic;
    if (updateFields.nationality)
      updateData.nationality = updateFields.nationality;
    if (updateFields.name) updateData.name = updateFields.name;
    if (updateFields.gender) updateData.gender = updateFields.gender;
    if (updateFields.spokenLanguage)
      updateData.spokenLanguage = updateFields.spokenLanguage;
    if (updateFields.phone) updateData.phone = updateFields.phone;
    if (updateFields.address) updateData.address = updateFields.address;
    if (updateFields.aadhar) updateData.aadhar = updateFields.aadhar;
    if (updateFields.accountNo) updateData.accountNo = updateFields.accountNo;
    if (updateFields.alias) updateData.alias = updateFields.alias;
    if (updateFields.country) updateData.country = updateFields.country;
    if (updateFields.experience)
      updateData.experience = updateFields.experience;
    if (updateFields.ifsc) updateData.ifsc = updateFields.ifsc;
    if (updateFields.role) updateData.role = updateFields.role;
    if (updateFields.assignedCountry)
      updateData.assignedCountry = updateFields.assignedCountry;
    if (updateFields.allotedArea)
      updateData.allotedArea = updateFields.allotedArea;
    if (updateFields.salary) updateData.salary = updateFields.salary;
    if (updateFields.empType) updateData.empType = updateFields.empType;
    if (updateFields.duration) updateData.duration = updateFields.duration;
    if (Object.keys(updateFields).includes("isLocked")) {
      updateData.isLocked = updateFields.isLocked;
    }

    const user = await Employees.findOneAndUpdate(
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
