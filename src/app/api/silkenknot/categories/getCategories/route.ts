import { NextResponse } from "next/server";

import { connectSilkenDb } from "@/util/silken-db";
import { Categories } from "@/models/silken-knot/categories";

connectSilkenDb();

export async function GET() {
  try {
    const categories = await Categories.find({});
    if (!categories) {
      return NextResponse.json({ message: "There are no Categories" }, { status: 200 });
    }

    return NextResponse.json({ data: categories }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
