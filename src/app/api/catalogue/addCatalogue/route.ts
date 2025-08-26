import { NextRequest, NextResponse } from "next/server";

import { CatalogueInterface } from "@/app/dashboard/catalogue/page";
import Catalogue from "@/models/catalogue";

export async function POST(req: NextRequest) {
  const data = (await req.json()) as CatalogueInterface;

  // console.log("data in catalogue: ", data, data.categories[0].properties);

  const newData: any = data;

  newData.categories.forEach((category: any) => {
    category.properties = category.properties.map((property: string) => {
      return { VSID: property, bookedMonths: [] };
    });
  });

  // console.log("new Data: ", newData);

  try {
    const newCatalogue = await Catalogue.create(newData);

    return NextResponse.json({ newCatalogue }, { status: 201 });
  } catch (err: any) {
    const error = new Error(err);
    console.log("error: ", error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
