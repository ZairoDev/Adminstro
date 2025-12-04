import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Boosters } from "@/models/propertyBooster";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDb();
    const property = await Boosters.findById(params.id);

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDb();
    const body = await req.json();
    
    const { title, description, images } = body;

    const property = await Boosters.findByIdAndUpdate(
      params.id,
      {
        ...(title && { title }),
        ...(description && { description }),
        ...(images && { images }),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
