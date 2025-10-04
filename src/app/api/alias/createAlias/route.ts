import { NextRequest, NextResponse } from "next/server";

import Aliases from "@/models/alias";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // console.log("alias body: ", body);

  try {
    const alias = await Aliases.create(body);
    // console.log("alias created: ", alias);

    return NextResponse.json({ alias }, { status: 201 });
  } catch (err: any) {
   // console.log("error in creating alias: ", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
