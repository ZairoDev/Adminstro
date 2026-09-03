import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/lib/finance/auth";
import { syncRazorpayPaymentsToFinance } from "@/services/finance/razorpaySyncService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const data = await syncRazorpayPaymentsToFinance();
    return NextResponse.json({
      success: true,
      message:
        data.paymentsFetched + data.paymentLinksFetched === 0
          ? `No payments found on this Razorpay ${data.keyMode} account. Confirm the env keys match the dashboard you paid in, then restart the server.`
          : `Synced ${data.upserted} record(s) from Razorpay (${data.keyMode}).`,
      data,
    });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to sync Razorpay payments";
    console.error("POST /api/finance/sync-razorpay", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
