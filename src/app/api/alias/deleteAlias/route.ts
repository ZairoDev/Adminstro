import Aliases from "@/models/alias";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const aliasEmail = searchParams.get("aliasEmail");

  try {
    await Aliases.findOneAndDelete({ aliasEmail });

    return NextResponse.json({ message: "Alias delete successfully" }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
