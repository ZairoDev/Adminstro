import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";

connectDb();


export async function DELETE(request: NextRequest) {
     
    const imageUrls = await request.json();

    

    
}
