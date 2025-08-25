import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { targetId: string } }
) {
  await connectDb();
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const monthlyTarget = await MonthlyTarget.findById(params.targetId);
    if (!monthlyTarget) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    console.log("body: ", body);
    if (body.area) {
      const { name, metrolane, zone } = body.areaUpdate;

      if (!name) {
        return NextResponse.json(
          { error: "Area name is required" },
          { status: 400 }
        );
      }

      // ✅ Look for existing area by name
      const existingAreaIndex = monthlyTarget.area.findIndex(
        (a: any) => a.name.toLowerCase() === name.toLowerCase()
      );

      if (existingAreaIndex !== -1) {
        // 🔄 Update existing
        monthlyTarget.area[existingAreaIndex] = {
          ...monthlyTarget.area[existingAreaIndex],
          name: name.trim(),
          metrolane: metrolane?.trim() || "",
          zone: zone?.trim() || "",
        };
      } else {
        // ➕ Add new
        monthlyTarget.area.push({
          name: name.trim(),
          metrolane: metrolane?.trim() || "",
          zone: zone?.trim() || "",
        });
      }

      await monthlyTarget.save();
    } else {
      // Update non-area fields
      await MonthlyTarget.findByIdAndUpdate(params.targetId, body, {
        new: true,
      });
    }

    return NextResponse.json(
      { message: "Target updated successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Update Target Error:", err);
    return NextResponse.json(
      { error: "Unable to update target" },
      { status: 500 }
    );
  }
}
