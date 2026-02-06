import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Roles from "@/models/role";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // Check authorization - allow all authenticated users to view roles
    // (needed for candidate portal functionality)
    const token = await getDataFromToken(req);
    if (!token || typeof token !== "object" || !("role" in token)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 403 }
      );
    }

    await connectDb();
    const roles = await Roles.find().select("roleName isActive _id").sort({ roleName: 1 });
    const response = NextResponse.json({ success: true, data: roles }, { status: 200 });

    // Tell browser/CDN to never cache this response
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to fetch roles" },
      { status: 401 }
    );
  }
}
