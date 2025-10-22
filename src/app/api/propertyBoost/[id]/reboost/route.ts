import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Boosters } from "@/models/propertyBooster"; // adjust path as needed

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    await connectDb();

    // Find the property and set reboost to true along with lastReboostedAt timestamp
    const property = await Boosters.findByIdAndUpdate(
      id,
      { 
        reboost: true,
        lastReboostedAt: new Date()
      },
      { new: true }
    );

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Property successfully reboosted",
      property,
      lastReboostedAt: property.lastReboostedAt
    });
  } catch (error: any) {
    console.error("Error reboosting property:", error);
    return NextResponse.json(
      { error: "Failed to reboost property" },
      { status: 500 }
    );
  }
}
