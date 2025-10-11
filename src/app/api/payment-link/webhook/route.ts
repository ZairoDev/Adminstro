import { NextResponse } from "next/server";
import crypto from "crypto";
import Bookings from "@/models/booking";
import { connectDb } from "@/util/db";
import nodemailer from "nodemailer";
import { generateInvoicePdf } from "@/app/dashboard/invoice/components/invoice-pdf";
import { ComputedTotals, InvoiceData } from "@/app/dashboard/invoice/page";
import { generateInvoicePdfBuffer } from "@/components/generatePdfBuffer";
import Invoice from "@/models/invoice";
import { Invoices } from "razorpay/dist/types/invoices";
 // 👈 we'll create this next

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

      booking = await Bookings.findOne({ "travellerPayment.orderId": orderId }).populate("lead").exec();
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
    console.log("amountPaid: ", booking);

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

    // 🧾 Send invoice or email notice
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "zairo.domain@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const lastInvoice = (await Invoice.findOne({})
      .sort({ createdAt: -1 })
      .lean()
      .exec()) as any;

      let nextInvoiceNumber = "ZI-00001"; // default if no previous invoice

      if (lastInvoice?.invoiceNumber) {
        // Extract numeric part
        const lastNumber = parseInt(
          lastInvoice.invoiceNumber.replace("ZI-", ""),
          10
        );
        // Increment and pad with leading zeros
        nextInvoiceNumber = `ZI-${(lastNumber + 1)
          .toString()
          .padStart(5, "0")}`;
      }
    if (booking.travellerPayment.status === "paid") {
      console.log("📦 Full payment detected, sending invoice...");

      // Compute invoice data just like in frontend
      const invoiceData: InvoiceData = {
        name: booking.lead.name ?? "",
        email: booking.travellerPayment.customerEmail ?? "",
        phoneNumber: booking.lead.phoneNo?.toString() ?? "",
        address: booking.lead.address ?? "",
        amount: booking.travellerPayment.finalAmount ?? 0,
        sgst: 0,
        igst: 0,
        cgst: 0,
        totalAmount: booking.travellerPayment.finalAmount ?? 0,
        status: "paid",
        date: booking.createdAt
          ? booking.createdAt.toISOString().split("T")[0]
          : "",
        nationality: "Indian",
        checkIn: booking.checkIn?.date
          ? booking.checkIn.date.toISOString().split("T")[0]
          : "",
        checkOut: booking.checkOut?.date
          ? booking.checkOut.date.toISOString().split("T")[0]
          : "",
        bookingType: "Booking Commission",
        companyAddress:
          "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
        invoiceNumber: nextInvoiceNumber,
        sacCode: 9985,
        description: `Booking commission for ${booking.visit?.VSID ?? ""}`,
      };

      const computed: ComputedTotals = {
        subTotal: invoiceData.totalAmount,
        total: invoiceData.totalAmount,
        taxes: {
          sgst: 0,
          cgst: 0,
          igst: 0,
        },
      };

      const invoice  = await Invoice.create(invoiceData);


      // ✅ Generate the invoice buffer (using your pdfmake layout)
      const pdfBuffer = await generateInvoicePdfBuffer(invoiceData, computed);

      await transporter.sendMail({
        from: `"Vacation Saga" <${process.env.EMAIL_USER}>`,
        to: invoiceData.email,
        subject: "Your Vacation Saga Invoice",
        text: `Hi ${invoiceData.name},\n\nThank you for your full payment. Please find your invoice attached.`,
        attachments: [
          {
            filename: `Invoice-${booking.name}-${booking._id}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      console.log("📩 Invoice sent to:", invoiceData.email);
    } else if (booking.travellerPayment.status === "partial") {
      console.log("📦 Partial payment detected, sending notice...");

      await transporter.sendMail({
        from: `"Vacation Saga" <zairo.domain@gmail.com>`,
        to: booking.email,
        subject: "Partial Payment Received - Vacation Saga",
        text: `Hi ${booking.name},\n\nWe’ve received a partial payment of ${booking.travellerPayment.amountRecieved}.
You’ll receive your invoice once the full payment is made.\n\nThank you!`,
      });

      console.log(
        "📩 Partial payment email sent to:",
        booking.travellerPayment.customerEmail
      );
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
