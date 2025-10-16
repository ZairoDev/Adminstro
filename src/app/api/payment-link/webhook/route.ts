import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Bookings from "@/models/booking";
import { connectDb } from "@/util/db";
import Invoice from "@/models/invoice";
import { generateInvoicePdfBuffer } from "@/components/generatePdfBuffer";

export async function POST(req: Request) {
  try {
    await connectDb();
    // console.log("✅ DB connected");

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") as string;

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing webhook secret" },
        { status: 500 }
      );
    }

    // 🔒 Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event as string;

    const paymentLinkEntity = event.payload?.payment_link?.entity;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      return NextResponse.json(
        { error: "No payment entity found" },
        { status: 400 }
      );
    }

    const paymentId: string | undefined = paymentEntity?.id;
    const method: string | undefined = paymentEntity?.method;
    const amountPaid: number = paymentEntity?.amount
      ? paymentEntity.amount / 100
      : 0;
    const createdAt: Date = paymentEntity?.created_at
      ? new Date(paymentEntity.created_at * 1000)
      : new Date();

    // 🧩 Resolve linkId
    let linkId: string | undefined = paymentLinkEntity?.id;

    if (!linkId && paymentEntity?.description) {
      const desc = String(paymentEntity.description);
      const plinkMatch = desc.match(/plink_[A-Za-z0-9_-]+/);
      if (plinkMatch) {
        linkId = plinkMatch[0];
      } else {
        const rawMatch = desc.match(/[A-Za-z0-9_-]{6,}/);
        if (rawMatch) linkId = `plink_${rawMatch[0]}`;
      }
    }

    if (!linkId) {
      console.warn("⚠️ No linkId found — ignoring webhook");
      return NextResponse.json({ success: true, ignored: true });
    }

    console.log("🧾 Parsed Data →", {
      eventType,
      linkId,
      paymentId,
      amountPaid,
      method,
      createdAt,
    });

    // 🔍 Find booking that contains this payment link
    let booking = await Bookings.findOne({
      "travellerPayment.guests.payments.linkId": linkId,
    });

    let updated = false;

    if (
      booking &&
      [
        "payment_link.paid",
        "payment_link.partially_paid",
        "payment.captured",
      ].includes(eventType)
    ) {
      // Update guest payment record
      await Bookings.updateOne(
        { _id: booking._id, "travellerPayment.guests.payments.linkId": linkId },
        {
          $set: {
            "travellerPayment.guests.$[guest].payments.$[pay].status": "paid",
            "travellerPayment.guests.$[guest].payments.$[pay].paymentId":
              paymentId,
            "travellerPayment.guests.$[guest].payments.$[pay].date": createdAt,
            ...(method
              ? {
                  "travellerPayment.guests.$[guest].payments.$[pay].method":
                    method,
                }
              : {}),
            "travellerPayment.guests.$[guest].payments.$[pay].amount":
              amountPaid,
          },
          $inc: {
            "travellerPayment.guests.$[guest].amountPaid": amountPaid,
          },
        },
        {
          arrayFilters: [
            { "guest.payments.linkId": linkId },
            { "pay.linkId": linkId },
          ],
        }
      );

      // Refresh booking data
      booking = await Bookings.findById(booking._id).lean().exec();
      const guests = booking?.travellerPayment?.guests || [];

      const totalPaid = guests.reduce(
        (sum: number, g: any) => sum + (g.amountPaid || 0),
        0
      );
      const finalAmount = booking?.travellerPayment?.finalAmount || 0;

      const bookingStatus =
        totalPaid === 0
          ? "pending"
          : totalPaid < finalAmount
          ? "partial"
          : "paid";

      await Bookings.updateOne(
        { _id: booking._id },
        {
          $set: {
            "travellerPayment.amountReceived": totalPaid,
            "travellerPayment.status": bookingStatus,
          },
          $push: {
            "travellerPayment.history": {
              amount: amountPaid,
              date: createdAt,
              method: method || "razorpay",
              linkId,
              paymentId,
              status: "paid",
            },
          },
        }
      );

      // Update guest status
      const gIdx = guests.findIndex((g: any) =>
        g.payments?.some((p: any) => p.linkId === linkId)
      );
      if (gIdx !== -1) {
        const g = guests[gIdx];
        const amountDue = g.amountDue || 0;
        const guestStatus =
          g.amountPaid === 0
            ? "pending"
            : g.amountPaid < amountDue
            ? "partial"
            : "paid";

        await Bookings.updateOne(
          {
            _id: booking._id,
            "travellerPayment.guests.payments.linkId": linkId,
          },
          { $set: { "travellerPayment.guests.$[guest].status": guestStatus } },
          { arrayFilters: [{ "guest.payments.linkId": linkId }] }
        );
      }

      updated = true;
    }

    // 🧭 Fallback for history-only match
    if (!updated) {
      booking = await Bookings.findOne({
        "travellerPayment.history.linkId": linkId,
      });
      if (!booking) {
        console.error("❌ Booking not found for linkId:", linkId);
        return NextResponse.json(
          { error: "Booking not found for this link" },
          { status: 404 }
        );
      }

      const currentReceived = booking.travellerPayment?.amountReceived || 0;
      const finalAmount = booking.travellerPayment?.finalAmount || 0;
      const newReceived = currentReceived + amountPaid;
      const newStatus =
        newReceived === 0
          ? "pending"
          : newReceived < finalAmount
          ? "partial"
          : "paid";

      await Bookings.updateOne(
        { _id: booking._id, "travellerPayment.history.linkId": linkId },
        {
          $set: {
            "travellerPayment.amountReceived": newReceived,
            "travellerPayment.status": newStatus,
            "travellerPayment.history.$[h].status": "paid",
            "travellerPayment.history.$[h].paymentId": paymentId,
            "travellerPayment.history.$[h].method": method || "razorpay",
            "travellerPayment.history.$[h].date": createdAt,
            "travellerPayment.history.$[h].amount": amountPaid,
          },
        },
        { arrayFilters: [{ "h.linkId": linkId }] }
      );
    }

    // 🔁 Handle expired/cancelled links
    if (
      ["payment_link.expired", "payment_link.cancelled"].includes(eventType)
    ) {
      await Bookings.updateOne(
        { "travellerPayment.history.linkId": linkId },
        { $set: { "travellerPayment.history.$[h].status": "failed" } },
        { arrayFilters: [{ "h.linkId": linkId }] }
      );
    }

    // 🔍 Fetch full booking data
    const fresh = await Bookings.findOne({
      $or: [
        { "travellerPayment.guests.payments.linkId": linkId },
        { "travellerPayment.history.linkId": linkId },
      ],
    })
      .populate("lead")
      .populate("visit")
      .exec();

      if (fresh) {
        const guestWhoPaid = fresh.travellerPayment?.guests?.find((g: any) =>
          g.payments?.some((p: any) => p.linkId === linkId)
        );

        const customerEmail =
          guestWhoPaid?.email ||
          fresh.travellerPayment?.customerEmail ||
          fresh.lead?.email ||
          "noreply@vacationsaga.com";

        const customerName = guestWhoPaid?.name || fresh.lead?.name || "Guest";
        const bookingStatus = fresh.travellerPayment?.status;

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "zairo.domain@gmail.com",
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        // 🧾 Check if this guest has fully paid their due
        const guestFullyPaid =
          guestWhoPaid &&
          guestWhoPaid.amountPaid >= (guestWhoPaid.amountDue || 0);

        if (guestFullyPaid) {
          // ✅ Guest has paid their full amount — send invoice

          // Generate invoice number
          const lastInvoice = (await Invoice.findOne()
            .sort({ createdAt: -1 })
            .lean()
            .exec()) as { invoiceNumber?: string } | null;

          let nextInvoiceNumber = "ZI-00001";

          if (lastInvoice?.invoiceNumber) {
            const lastNum = Number.parseInt(
              lastInvoice.invoiceNumber.replace("ZI-", ""),
              10
            );
            nextInvoiceNumber = `ZI-${(isNaN(lastNum) ? 0 : lastNum + 1)
              .toString()
              .padStart(5, "0")}`;
          }

          const invoiceData = {
            name: customerName,
            email: customerEmail,
            phoneNumber:
              guestWhoPaid?.phone?.toString() ??
              fresh.lead?.phone?.toString() ??
              "",
            address: guestWhoPaid?.address ?? fresh.lead?.address ?? "",
            amount: guestWhoPaid?.amountPaid ?? 0,
            sgst: 0,
            igst: 0,
            cgst: 0,
            totalAmount: guestWhoPaid?.amountPaid ?? 0,
            status: "paid",
            date: new Date().toISOString().split("T")[0],
            nationality: "Indian",
            checkIn: fresh.checkIn?.date
              ? new Date(fresh.checkIn.date).toISOString().split("T")[0]
              : "",
            checkOut: fresh.checkOut?.date
              ? new Date(fresh.checkOut.date).toISOString().split("T")[0]
              : "",
            bookingType: "Booking Commission",
            companyAddress:
              "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
            invoiceNumber: nextInvoiceNumber,
            sacCode: 9985,
            description: `Booking commission for ${fresh.visit?.VSID ?? ""}`,
          };

          const computed = {
            subTotal: invoiceData.totalAmount,
            total: invoiceData.totalAmount,
            taxes: { sgst: 0, cgst: 0, igst: 0 },
          };

          const pdfBuffer = await generateInvoicePdfBuffer(
            invoiceData,
            computed
          );
          await Invoice.create(invoiceData);

          await transporter.sendMail({
            from: `"Vacation Saga" <zairo.domain@gmail.com>`,
            to: customerEmail,
            subject: "Your Vacation Saga Invoice",
            text: `Hi ${customerName},\n\nThank you for your full payment. Please find your invoice attached.\n\nWarm regards,\nVacation Saga`,
            attachments: [
              {
                filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          });

          console.log(`📧 Invoice sent to ${customerEmail} (guest fully paid)`);
        } else if (guestWhoPaid) {
          // 💰 Partial payment email
          await transporter.sendMail({
            from: `"Vacation Saga" <zairo.domain@gmail.com>`,
            to: customerEmail,
            subject: "Partial Payment Received - Vacation Saga",
            text: `Hi ${customerName},\n\nWe’ve received a partial payment of ₹${amountPaid}.\nOnce the full payment is completed, your official invoice will be sent.\n\nThank you for choosing Vacation Saga!`,
          });

          console.log(`📩 Partial payment mail sent to ${customerEmail}`);
        }
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
