import { NextResponse } from "next/server";

import Aliases from "@/models/alias";

export async function GET() {
  try {
    const aliases = await Aliases.find();

    return NextResponse.json({ aliases }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
