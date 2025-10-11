import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Boosters } from "@/models/propertyBooster";

// POST: Create a new property
export async function POST(req: Request) {
  try {
    await connectDb();
    const body = await req.json();

    const { title,location, description, images, createdBy } = body;

    if (!title ||!location|| !description || !images?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const property = await Boosters.create({
      title,
      location,
      description,
      images,
      createdBy,
    });

    return NextResponse.json(property, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: Fetch all properties
export async function GET() {
  try {
    await connectDb();
    const properties = await Boosters.find({});
    return NextResponse.json(properties);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
