import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";

connectDb();

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const role = String((token as { role?: string }).role ?? "");
    if (role !== "Advert" && role !== "SuperAdmin") {
      return NextResponse.json({ count: 0 });
    }

    const count = await unregisteredOwnerShortTerm.countDocuments({
      advertListingStatus: "pending",
    });

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
