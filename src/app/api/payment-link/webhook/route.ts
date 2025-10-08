import { NextResponse } from "next/server";
import crypto from "crypto";
import Bookings from "@/models/booking";
import { connectDb } from "@/util/db";

export async function POST(req: Request) {
  try {
    await connectDb();

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") as string;

    console.log("🔔 Razorpay webhook received");
    console.log("Raw body:", body);

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("❌ Invalid Razorpay signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    console.log("Event Type:", eventType);
    console.log("Full Event:", JSON.stringify(event, null, 2));

    const paymentLinkEntity = event.payload?.payment_link?.entity;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentLinkEntity) {
      console.warn("⚠️ Payment link entity missing in webhook payload");
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const booking = await Bookings.findOne({
      "payment.orderId": paymentLinkEntity.id,
    });

    if (!booking) {
      console.warn(
        "⚠️ Booking not found for payment link:",
        paymentLinkEntity.id
      );
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (eventType === "payment_link.paid") {
      booking.payment.status = "paid";
      booking.payment.paymentId = paymentEntity?.id ?? "";
      booking.payment.paidAt = new Date();
      booking.payment.remainingAmount = 0;
      booking.travellerPayment.amountRecieved = paymentEntity?.amount
        ? paymentEntity.amount / 100
        : booking.travellerPayment.amountRecieved;

      await booking.save();
      console.log("✅ Booking payment updated:", booking._id);
    } else if (
      eventType === "payment_link.expired" ||
      eventType === "payment_link.cancelled"
    ) {
      booking.payment.status = "failed";
      await booking.save();
      console.log(`⚠️ Payment link ${eventType} for booking:`, booking._id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
