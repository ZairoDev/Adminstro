import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";

connectDb();

export async function POST(request: NextRequest) {
  const reqBody = await request.json();
  const { pId, data } = reqBody;
  console.log("data in delete images: ", pId, data);

  try {
    const property = await Properties.findById(pId);

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    ["propertyCoverFileUrl", "propertyPictureUrls"].forEach((key) => {
      data[key]?.forEach((index: number) => {
        if (index >= 0 && index < property[key].length) {
          if (key === "propertyCoverFileUrl") {
            property[key] = property[key].replace(property[key], "");
          }
          if (property[key][index] != undefined) {
            property[key][index] = "";
          }
        }
      });
    });

    property["propertyPictureUrls"] = property["propertyPictureUrls"].filter(
      (item: string) => item != ""
    );

    await property.save(); //! saving the property after deleting the images

    return NextResponse.json({ status: 200 });
  } catch (err: any) {
    console.log("error in api: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
