import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/lib/finance/auth";
import { listWebhookLogsQuerySchema } from "@/schemas/razorpayWebhookLog.schema";
import { listWebhookLogs } from "@/services/finance/webhookLogService";

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listWebhookLogsQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await listWebhookLogs(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error("GET /api/finance/webhook-logs", error);
    return NextResponse.json(
      { success: false, message: "Failed to list webhook logs" },
      { status: 500 },
    );
  }
}
