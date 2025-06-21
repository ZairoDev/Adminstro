import { Owners } from "@/models/owner";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = await getDataFromToken(req);

  const newBody = {
    ...body,
    createdBy: token.email,
  };

  try {
    await Owners.create(newBody);

    return NextResponse.json(
      { message: "Owner added successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    const error = new Error(err);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
