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
      const { name, zone, transportation, price } = body.area;

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
        // 🔄 Update existing area
        monthlyTarget.area[existingAreaIndex] = {
          ...monthlyTarget.area[existingAreaIndex]._doc, // keep old values
          name: name.trim(),
          zone: zone?.trim() || "",
          transportation: {
            ...monthlyTarget.area[existingAreaIndex].transportation,
            ...transportation, // e.g. metroZone, tram, subway, bus
          },
          price: {
            ...monthlyTarget.area[existingAreaIndex].price,
            ...price, // e.g. studio, sharedSpot, sharedRoom, apartment
            apartment: {
              ...monthlyTarget.area[existingAreaIndex].price?.apartment,
              ...price?.apartment,
            },
          },
        };
      } else {
        // ➕ Add new area
        monthlyTarget.area.push({
          name: name.trim(),
          zone: zone?.trim() || "",
          transportation: {
            metroZone: transportation?.metroZone || "",
            tram: transportation?.tram || "",
            subway: transportation?.subway || "",
            bus: transportation?.bus || "",
          },
          price: {
            studio: price?.studio || 0,
            sharedSpot: price?.sharedSpot || 0,
            sharedRoom: price?.sharedRoom || 0,
            apartment: {
              oneBhk: price?.apartment?.oneBhk || 0,
              twoBhk: price?.apartment?.twoBhk || 0,
              threeBhk: price?.apartment?.threeBhk || 0,
            },
          },
        });
      }

      await monthlyTarget.save();
    } else {
      // Update non-area fields directly
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
