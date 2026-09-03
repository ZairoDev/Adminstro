import { NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/services/finance/razorpayWebhookService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser/tunnel check — Razorpay only POSTs. Open this URL to confirm the Dev Tunnel reaches the app. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/razorpay/webhook",
    message:
      "Razorpay webhook is live. In Razorpay Dashboard (Test) → Settings → Webhooks, set this URL and the same secret as RAZORPAY_WEBHOOK_SECRET.",
  });
}

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
