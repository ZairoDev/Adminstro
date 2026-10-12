import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/modules/finance/access";
import { getFinanceOverview } from "@/modules/finance/services/payment.service";

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();
    const data = await getFinanceOverview();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error("GET /api/finance/overview", error);
    return NextResponse.json(
      { success: false, message: "Failed to load overview" },
      { status: 500 },
    );
  }
}
