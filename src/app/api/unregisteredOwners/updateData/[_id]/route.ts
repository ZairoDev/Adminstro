import { unregisteredOwner } from "@/models/unregisteredOwner";
import { Properties } from "@/models/property";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { _id: string } }
) {
  try {
    const body = await req.json();
    const { field, value } = body;

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