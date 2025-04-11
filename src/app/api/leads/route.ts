import Query from "@/models/query";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { filters } = await req.json();
    console.log("Request Body:", filters);

    const searchFilters: Record<string, any> = {};

    for (const key in filters) {
      const value = filters[key];
      if (typeof value === "number") {
        searchFilters[key] = { $gte: value };
      } else if (typeof value === "string") {
        searchFilters[key] = new RegExp(value, "i");
      }
    }

    const leads = await Query.find(searchFilters);
    console.log(leads, leads.length);

    return NextResponse.json(leads, { status: 200 });
  } catch (err) {
    // Here you can handle the request and send a response
    return NextResponse.json({ error: "Unable to filter leads" }, { status: 401 });
  }
}
