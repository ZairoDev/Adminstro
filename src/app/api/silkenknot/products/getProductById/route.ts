import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/utils/db";
import { Products } from "@/models/products";

connectDb();

// const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
// let cachedCategories: any = null;
// let lastFetchedTime = 0;

export async function POST(req: NextRequest) {
  const { productId } = await req.json();

  try {
    // const currentTime = Date.now();

    // if (cachedCategories && currentTime - lastFetchedTime < CACHE_DURATION) {
    //   console.log("Serving categories from cache");
    //   return NextResponse.json({ data: cachedCategories }, { status: 200 });
    // }

    const product = await Products.findById(productId);

    if (!product) {
      return NextResponse.json(
        { message: "There are no Product for this category" },
        { status: 200 }
      );
    }

    // cachedCategories = categoriesWithSubcategories;
    // lastFetchedTime = currentTime;

    return NextResponse.json({ data: product }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
