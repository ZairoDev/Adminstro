import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import Query from "@/models/query";
import Visits from "@/models/visit";
import Bookings from "@/models/booking";

export const dynamic = "force-dynamic";
export const revalidate = 0;

connectDb();

export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [leads, visits, sales] = await Promise.all([
      Query.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Visits.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Bookings.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
    ]);

    return NextResponse.json({ leads, visits, sales }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status }
      );
    }
    console.error("Error in GET /api/monthly-target/actual-stats:", err);
    return NextResponse.json(
      { error: "Unable to fetch actual stats" },
      { status: 500 }
    );
  }
}
