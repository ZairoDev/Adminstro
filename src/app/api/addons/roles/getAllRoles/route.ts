import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Role from "@/models/role";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
    await connectDb();
    const roles = await Role.find({}).sort({ role: 1, department: 1 }).lean();
    // console.log(`Fetched ${roles.length} roles from database`);
    // console.log(`Roles:`, roles.map(r => ({ role: r.role, department: r.department, origin: r.origin, _id: r._id })));
    
    const response = NextResponse.json({ data: roles }, { status: 200 });
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error fetching roles:", err);
    return NextResponse.json(
      { error: "Unable to fetch roles" },
      { status: 500 }
    );
  }
}
