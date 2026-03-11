import { NextRequest, NextResponse } from "next/server";

import { CatalogueInterface } from "@/app/dashboard/catalogue/page";
import Catalogue from "@/models/catalogue";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    try {
      await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
    }

    const data = (await req.json()) as CatalogueInterface;

    const newData: any = data;
    newData.categories.forEach((category: any) => {
      category.properties = category.properties.map((property: string) => {
        return { VSID: property, bookedMonths: [] };
      });
    });

    const newCatalogue = await Catalogue.create(newData);

    return NextResponse.json({ newCatalogue }, { status: 201 });
  } catch (err: any) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.log("error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
