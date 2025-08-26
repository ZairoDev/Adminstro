import { NextRequest, NextResponse } from "next/server";
import Catalogue from "@/models/catalogue";

export async function POST(req: NextRequest) {
  const { catalogueId, VSID, selectedMonths } = await req.json();

  // console.log("data in catalogue: ", catalogueId, VSID, selectedMonths);

  try {
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
    const error = new Error(err);
    console.log("error: ", error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
