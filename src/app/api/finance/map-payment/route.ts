import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/lib/finance/auth";
import { mapPaymentBodySchema } from "@/schemas/financePayment.schema";
import { mapPayment } from "@/services/finance/financePaymentService";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFinanceAccess(request);
    await connectDb();

    const body = await request.json();
    const parsed = mapPaymentBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid body",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (!parsed.data.paymentId && !parsed.data.paymentLinkId) {
      return NextResponse.json(
        {
          success: false,
          message: "paymentId or paymentLinkId is required",
        },
        { status: 400 },
      );
    }

    const data = await mapPayment({
      ...parsed.data,
      mappedBy: auth.id ?? "unknown",
      mappedByName: auth.name ?? auth.email,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const authErr = financeAuthErrorResponse(error);
    if (authErr.status === 401 || authErr.status === 403) {
      return NextResponse.json(authErr.body, { status: authErr.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to map payment";
    const status =
      message.includes("not found") || message.includes("required")
        ? 404
        : 500;
    console.error("POST /api/finance/map-payment", error);
    return NextResponse.json({ success: false, message }, { status });
  }
}
