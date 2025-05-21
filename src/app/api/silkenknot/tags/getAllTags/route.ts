import { NextResponse } from "next/server";

import { Tags } from "@/models/tags";
import { connectDb } from "@/utils/db";

connectDb();

// const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
// let cachedCategories: any = null;
// let lastFetchedTime = 0;

export async function GET() {
  try {
    // const currentTime = Date.now();

    // if (cachedCategories && currentTime - lastFetchedTime < CACHE_DURATION) {
    //   console.log("Serving categories from cache");
    //   return NextResponse.json({ data: cachedCategories }, { status: 200 });
    // }

    const tags = await Tags.find({});

    if (!tags) {
      return NextResponse.json({ message: "There are no Tags" }, { status: 200 });
    }

    // cachedCategories = categoriesWithSubcategories;
    // lastFetchedTime = currentTime;

    return NextResponse.json({ data: tags }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
