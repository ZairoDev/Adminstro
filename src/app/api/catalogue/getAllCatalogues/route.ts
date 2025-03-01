import Catalogue from "@/models/catalogue";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
  try {
    const allCatalogues = await Catalogue.find({});
    console.log("allCatalogues in backend: ", allCatalogues);
    return NextResponse.json({ allCatalogues: allCatalogues }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
