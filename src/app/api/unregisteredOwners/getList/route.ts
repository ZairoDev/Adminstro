
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";

connectDb();
export async function GET(){
  try{
    const data = await unregisteredOwner.find();
    // console.log(data);  
    return NextResponse.json({data}, {status: 200});
  }catch(err){
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}