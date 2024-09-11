// import { NextRequest, NextResponse } from "next/server";
// import { Property } from "@/models/listing";
// import { connectDb } from "@/util/db";
// import { Types } from "mongoose";

// connectDb();

// export async function DELETE(request: NextRequest) {
//   try {

//     const url = new URL(request.url);
//     const id = url.searchParams.get("id");

//     const { url: imageUrl, index, type } = await request.json();

//     if (!imageUrl || typeof index === "undefined" || !type) {
//       return NextResponse.json(
//         { message: "Missing required data" },
//         { status: 400 }
//       );
//     }

//     if (!id || !Types.ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { message: "Invalid property ID" },
//         { status: 400 }
//       );
//     }

//     const property = await Property.findById(id);
//     if (!property) {
//       return NextResponse.json(
//         { message: "Property not found" },
//         { status: 404 }
//       );
//     }

//     let updatedField: string | string[] = "";
//     switch (type) {
//       case "propertyCoverFileUrl":
//         if (property.propertyCoverFileUrl === imageUrl) {
//           updatedField = "";
//         }
//         break;
//       case "propertyPictureUrls":
//         updatedField = property.propertyPictureUrls.filter(
//           (imgUrl: string, i: number) => i !== index
//         );
//         break;
//       case "portionCoverFileUrls":
//         updatedField = property.portionCoverFileUrls.filter(
//           (imgUrl: string, i: number) => i !== index
//         );
//         break;
//       case "portionPictureUrls":
//         updatedField = property.portionPictureUrls.map(
//           (portion: string[], i: number) =>
//             i === index
//               ? portion.filter((imgUrl: string) => imgUrl !== imageUrl)
//               : portion
//         );
//         break;
//       default:
//         return NextResponse.json(
//           { message: "Invalid type provided" },
//           { status: 400 }
//         );
//     }

//     await Property.updateOne(
//       { _id: id },
//       {
//         $set: {
//           [type]: updatedField,
//         },
//       }
//     );

//     return NextResponse.json(
//       { message: "Image deleted successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error deleting image:", error);
//     return NextResponse.json(
//       { message: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";
import { Types } from "mongoose";

connectDb();

export async function DELETE(request: NextRequest) {
  try {
    const {
      id,
      url: imageUrl,
      index,
      portionIndex,
      type,
    } = await request.json();

    console.log(id, imageUrl, index, portionIndex, type);

    if (!id || !imageUrl || typeof index === "undefined" || !type) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }
    console.log('check 1');

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid property ID" },
        { status: 400 }
      );
    }
    console.log('check 2');

    const property = await Property.findById(id);
    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }
    console.log('check 3');

    let updatedField: any = "";
    switch (type) {
      case "propertyCoverFileUrl":
        if (property.propertyCoverFileUrl === imageUrl) {
          updatedField = "";
        }
        break;
      case "propertyPictureUrls":
        updatedField = property.propertyPictureUrls.filter(
          (imgUrl: string, i: number) => i !== index
        );
        break;
      case "portionCoverFileUrls":
        updatedField = property.portionCoverFileUrls.map(
          (imgUrl: string, i: number) => (i === index ? "" : imgUrl)
        );
        break;
      case "portionPictureUrls":
        if (typeof portionIndex === "undefined") {
          return NextResponse.json(
            { error: "Missing portionIndex for portionPictureUrls" },
            { status: 400 }
          );
        }
        updatedField = property.portionPictureUrls.map(
          (portion: string[], i: number) =>
            i === portionIndex
              ? portion.filter((imgUrl: string, j: number) => j !== index)
              : portion
        );
        break;
    //   default:
    //     return NextResponse.json(
    //       { error: "Invalid type provided" },
    //       { status: 400 }
    //     );
    }
    console.log('check 4');

    await Property.updateOne(
      { _id: id },
      {
        $set: {
          [type]: updatedField,
        },
      }
    );

    return NextResponse.json(
      { message: "Image deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
