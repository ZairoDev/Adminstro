import { NextRequest, NextResponse } from "next/server";

import Aliases from "@/models/alias";

export async function PATCH(req: NextRequest) {
  const { aliasEmail, body } = await req.json();

  // console.log("alias body: ", aliasEmail, body);

  try {
    const alias = await Aliases.findOneAndUpdate({ aliasEmail: aliasEmail }, body);
    // console.log("alias updated: ", alias);

    return NextResponse.json({ alias }, { status: 201 });
  } catch (err: any) {
    console.log("error in creating alias: ", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
