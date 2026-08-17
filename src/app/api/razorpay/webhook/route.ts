import { NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/services/finance/razorpayWebhookService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const result = await processRazorpayWebhook({
      rawBody,
      signature,
      headers: req.headers,
    });

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (error) {
    console.error("Razorpay webhook fatal error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 200 },
    );
  }
}
