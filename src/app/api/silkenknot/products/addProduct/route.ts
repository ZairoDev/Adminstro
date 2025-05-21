import { NextRequest, NextResponse } from "next/server";

import { Products } from "@/models/silken-knot/products";

export async function POST(req: NextRequest) {
  const productBody = await req.json();

  try {
    const product = await Products.create(productBody);
    return NextResponse.json(
      { message: "Product added successfully", product },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Failed to add product" }, { status: 500 });
  }
}
