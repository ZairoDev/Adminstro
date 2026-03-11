import { NextRequest, NextResponse } from "next/server";
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

    const { catalogueId, VSID, selectedMonths } = await req.json();
    if (!catalogueId || !VSID || !Array.isArray(selectedMonths)) {
      return NextResponse.json(
        { error: "catalogueId, VSID, and selectedMonths are required" },
        { status: 400 },
      );
    }

    const catalogue = await Catalogue.findById(catalogueId);
    if (!catalogue) {
      return NextResponse.json({ error: "Catalogue not found" }, { status: 404 });
    }

    let isUpdated = false;

    catalogue.categories.forEach(
      (category: { properties: { VSID: string; bookedMonths: string[] }[] }) => {
        category.properties.forEach((property) => {
          if (property.VSID === VSID) {
            // console.log("VSID matched: ", VSID);
            property.bookedMonths = selectedMonths; // Update only bookedMonths
            isUpdated = true;
          }
        });
      }
    );

    // console.log("catalogue updated: ", catalogue.categories[0].properties);

    const updatedCatalogue = await catalogue.save();

    // console.log("updatedCatalogue: ", updatedCatalogue.categories[0].properties);

    return NextResponse.json({ updatedCatalogue }, { status: 201 });
  } catch (err: any) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.log("error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
