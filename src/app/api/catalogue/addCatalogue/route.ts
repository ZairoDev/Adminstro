import { NextRequest, NextResponse } from "next/server";

import { CatalogueInterface } from "@/app/dashboard/catalogue/page";
import Catalogue from "@/models/catalogue";

export async function POST(req: NextRequest) {
  const data = (await req.json()) as CatalogueInterface;

  console.log("data in catalogue: ", data);

  try {
    const newCatalogue = new Catalogue(data);
    const temp = await Catalogue.create(data);

    return NextResponse.json({ newCatalogue }, { status: 201 });
  } catch (err: any) {
    const error = new Error(err);
    console.log("error: ", error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
