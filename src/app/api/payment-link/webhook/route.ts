import { NextResponse } from "next/server";
import crypto from "crypto";
import Bookings from "@/models/booking";
import { connectDb } from "@/util/db";

export async function POST(req: Request) {
  try {
    await connectDb();

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") as string;

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

    console.log("🔔 Razorpay webhook received:", eventType);

    let booking: any;
    let paymentEntity: any;
    let orderId: string | undefined;

    if (eventType === "payment.captured") {
      paymentEntity = event.payload.payment.entity;
      orderId = paymentEntity.description?.replace("#", "plink_");

      booking = await Bookings.findOne({ "travellerPayment.orderId": orderId });
    } else if (eventType.startsWith("payment_link")) {
      const paymentLinkEntity = event.payload.payment_link?.entity;
      paymentEntity = event.payload.payment?.entity;

      if (!paymentLinkEntity) {
        return NextResponse.json(
          { error: "Missing payment link entity" },
          { status: 400 }
        );
      }
      orderId = paymentLinkEntity.id;
      booking = await Bookings.findOne({ "travellerPayment.orderId": orderId });
    }

    if (!booking) {
      console.warn("⚠️ Booking not found for orderId:", orderId);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Amount paid
    const amountPaid = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;

    // Append payment history if this is a successful payment
    if (eventType === "payment.captured" || eventType === "payment_link.paid") {
      if (!booking.travellerPayment.history)
        booking.travellerPayment.history = [];

      booking.travellerPayment.history.push({
        amount: amountPaid,
        date: paymentEntity?.created_at
          ? new Date(paymentEntity.created_at * 1000)
          : new Date(),
        method: paymentEntity?.method || "Unknown",
        status: "paid",
        linkId: orderId,
        paymentId: paymentEntity?.id || paymentEntity?.id || "",
      });

      // Update main travellerPayment fields
      booking.travellerPayment.paymentId =
        paymentEntity?.id || booking.travellerPayment.paymentId;
      booking.travellerPayment.amountRecieved =
        (booking.travellerPayment.amountRecieved || 0) + amountPaid;
      booking.travellerPayment.currency =
        paymentEntity?.currency || booking.travellerPayment.currency;
      booking.travellerPayment.method =
        paymentEntity?.method || booking.travellerPayment.method;
      booking.travellerPayment.paidAt = paymentEntity?.created_at
        ? new Date(paymentEntity.created_at * 1000)
        : new Date();
      booking.travellerPayment.customerEmail =
        paymentEntity?.email || booking.travellerPayment.customerEmail;
      booking.travellerPayment.customerPhone =
        paymentEntity?.contact || booking.travellerPayment.customerPhone;

      // Compute remaining and status
      const finalAmount = booking.travellerPayment.finalAmount || 0;
      const received = booking.travellerPayment.amountRecieved || 0;
      booking.travellerPayment.amountRemaining = Math.max(
        finalAmount - received,
        0
      );
      booking.travellerPayment.status =
        received === 0
          ? "pending"
          : received < finalAmount
          ? "partial"
          : "paid";
    }

    // Handle failed / cancelled links
    if (
      eventType === "payment_link.expired" ||
      eventType === "payment_link.cancelled"
    ) {
      booking.travellerPayment.status = "failed";
    }

    await booking.save();
    console.log("✅ Booking updated for", eventType, booking._id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
