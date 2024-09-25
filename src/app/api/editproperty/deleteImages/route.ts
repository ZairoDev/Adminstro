import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(request: NextRequest) {
  const reqBody = await request.json();
  const { pId, data } = reqBody;

  try {
    const property = await Property.findById(pId);

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    [
      "propertyCoverFileUrl",
      "propertyPictureUrls",
      "portionCoverFileUrls",
    ].forEach((key) => {
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

    data["portionPictureUrls"]?.forEach(
      (portionString: string, portionIndex: number) => {
        if (portionString.includes("1")) {
          for (let i = 0; i < portionString.length; i++) {
            if (portionString[i] == "1")
              property["portionPictureUrls"][portionIndex][i] = "";
          }
        }
      }
    );

    property["portionPictureUrls"]?.forEach((portionImagesArray: string[]) => {
      portionImagesArray = portionImagesArray.filter(
        (item: string) => item != ""
      );
    });

    await property.save(); //! saving the property after deleting the images

    return NextResponse.json({ status: 200 });
  } catch (err: any) {
    console.log("error in api: ", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
