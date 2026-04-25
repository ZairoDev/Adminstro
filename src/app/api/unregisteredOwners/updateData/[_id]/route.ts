import { unregisteredOwner } from "@/models/unregisteredOwner";
import { Properties } from "@/models/property";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function PUT(
  req: NextRequest,
  { params }: { params: { _id: string } }
) {
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const body = await req.json();
    const { field, value, unavailableUntil } = body;

    const data = await unregisteredOwner.findById(params._id);
    if (!data) {
      return NextResponse.json({ message: "Data not found" }, { status: 404 });
    }

    // Trim phone number if needed
    if (field === "phoneNumber") {
      data[field] = value.trim();
    } 
    // Handle imageUrls separately (append instead of overwrite)
    else if (field === "imageUrls" && Array.isArray(value)) {
      data.imageUrls = [...data.imageUrls, ...value];
    } 
    else {
      data[field] = value;
    }

    if (field === "availability") {
      if (value === "Not Available") {
        if (!unavailableUntil) {
          return NextResponse.json(
            { message: "unavailableUntil is required for Not Available" },
            { status: 400 },
          );
        }
        const parsedDate = new Date(unavailableUntil);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { message: "Invalid unavailableUntil date" },
            { status: 400 },
          );
        }
        parsedDate.setHours(23, 59, 59, 999);
        data.unavailableUntil = parsedDate;
      } else if (value === "Available") {
        data.unavailableUntil = null;
      }
    }

    await data.save();

    // Sync availability status to properties collection if VSID exists
    if (field === "availability" && data.VSID && data.VSID.trim() !== "") {
      await Properties.updateOne(
        { VSID: data.VSID },
        { $set: { availability: value } }
      );
    }

    return NextResponse.json({ message: "Data updated successfully" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function DELETE(req:NextRequest,{params}:{params:{_id:string}}){ 
  const { _id } = params;
  try{
    const data = await unregisteredOwner.findByIdAndDelete(_id);
    return NextResponse.json({ message: "Data deleted successfully" }, { status: 200 });
  }
  catch(err){
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}