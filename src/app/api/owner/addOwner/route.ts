import { Owners } from "@/models/owner";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    await Owners.create(body);

    return NextResponse.json({ message: "Owner added successfully" }, { status: 201 });
  } catch (err: any) {
    const error = new Error(err);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
