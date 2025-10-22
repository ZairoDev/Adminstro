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

    if (!booking) {
      // Fallback: check if link exists in history only
      booking = await Bookings.findOne({
        "travellerPayment.history.linkId": linkId,
      });
    }

    if (!booking) {
      console.error("❌ Booking not found for linkId:", linkId);
      return NextResponse.json(
        { error: "Booking not found for this link" },
        { status: 404 }
      );
    }

    // Handle payment captured/paid events
    if (
      [
        "payment_link.paid",
        "payment_link.partially_paid",
        "payment.captured",
      ].includes(eventType)
    ) {
      // Find which guest made this payment
      const guestIndex = booking.travellerPayment.guests.findIndex((g: any) =>
        g.payments?.some((p: any) => p.linkId === linkId)
      );

      if (guestIndex !== -1) {
        const guest = booking.travellerPayment.guests[guestIndex];

        // Update the specific payment entry in guest's payments array
        const paymentIndex = guest.payments.findIndex(
          (p: any) => p.linkId === linkId
        );

        if (paymentIndex !== -1) {
          // Update payment status and details
          booking.travellerPayment.guests[guestIndex].payments[paymentIndex] = {
            ...guest.payments[paymentIndex],
            status: "paid",
            paymentId: paymentId || "",
            date: createdAt,
            method: method || guest.payments[paymentIndex].method,
            amount: amountPaid,
          };

          // Update guest's total amountPaid
          const previousPaid = Number(guest.amountPaid || 0);
          const previousPaymentAmount = Number(
            guest.payments[paymentIndex].amount || 0
          );

          // Add the difference (in case amount changed)
          booking.travellerPayment.guests[guestIndex].amountPaid =
            previousPaid - previousPaymentAmount + amountPaid;

          // Update guest status
          const guestAmountPaid =
            booking.travellerPayment.guests[guestIndex].amountPaid;
          const guestAmountDue = Number(guest.amountDue || 0);

          if (guestAmountPaid >= guestAmountDue) {
            booking.travellerPayment.guests[guestIndex].status = "paid";
          } else if (guestAmountPaid > 0) {
            booking.travellerPayment.guests[guestIndex].status = "partial";
          } else {
            booking.travellerPayment.guests[guestIndex].status = "pending";
          }
        }
      }

      // Update history entry
      const historyIndex = booking.travellerPayment.history.findIndex(
        (h: any) => h.linkId === linkId
      );

      if (historyIndex !== -1) {
        booking.travellerPayment.history[historyIndex] = {
          ...booking.travellerPayment.history[historyIndex],
          status: "paid",
          paymentId: paymentId || "",
          date: createdAt,
          method:
            method || booking.travellerPayment.history[historyIndex].method,
          amount: amountPaid,
        };
      } else {
        // Add new history entry if not found
        const guestEmail =
          guestIndex !== -1
            ? booking.travellerPayment.guests[guestIndex].email
            : "";

        booking.travellerPayment.history.push({
          amount: amountPaid,
          date: createdAt,
          method: method || "razorpay",
          paidBy: guestEmail,
          linkId: linkId,
          paymentId: paymentId || "",
          status: "paid",
        });
      }

      // Calculate total amount received from all paid history entries
      const totalPaid = booking.travellerPayment.history
        .filter((h: any) => h.status === "paid")
        .reduce((sum: number, h: any) => sum + (Number(h.amount) || 0), 0);

      booking.travellerPayment.amountReceived = totalPaid;

      // Update overall booking status
      const finalAmount = Number(booking.travellerPayment.finalAmount || 0);
      if (totalPaid === 0) {
        booking.travellerPayment.status = "pending";
      } else if (totalPaid < finalAmount) {
        booking.travellerPayment.status = "partial";
      } else {
        booking.travellerPayment.status = "paid";
      }

      // Mark nested fields as modified
      booking.markModified("travellerPayment.guests");
      booking.markModified("travellerPayment.history");
      booking.markModified("travellerPayment");

      await booking.save();
      console.log("✅ Payment updated successfully");
    }

    // 🔁 Handle expired/cancelled links
    if (
      ["payment_link.expired", "payment_link.cancelled"].includes(eventType)
    ) {
      const historyIndex = booking.travellerPayment.history.findIndex(
        (h: any) => h.linkId === linkId
      );

      if (historyIndex !== -1) {
        booking.travellerPayment.history[historyIndex].status = "failed";
        booking.markModified("travellerPayment.history");
        await booking.save();
      }

      // Also update guest payment status
      const guestIndex = booking.travellerPayment.guests.findIndex((g: any) =>
        g.payments?.some((p: any) => p.linkId === linkId)
      );

      if (guestIndex !== -1) {
        const paymentIndex = booking.travellerPayment.guests[
          guestIndex
        ].payments.findIndex((p: any) => p.linkId === linkId);

        if (paymentIndex !== -1) {
          booking.travellerPayment.guests[guestIndex].payments[
            paymentIndex
          ].status = "failed";
          booking.markModified("travellerPayment.guests");
          await booking.save();
        }
      }
    }

    // 🔍 Fetch fresh booking data with populated fields
    const fresh = await Bookings.findById(booking._id)
      .populate("lead")
      .populate("visit")
      .exec();

    if (fresh && eventType === "payment_link.paid") {
      const guestWhoPaid = fresh.travellerPayment?.guests?.find((g: any) =>
        g.payments?.some((p: any) => p.linkId === linkId)
      );

      const customerEmail =
        guestWhoPaid?.email ||
        fresh.travellerPayment?.customerEmail ||
        fresh.lead?.email ||
        "noreply@vacationsaga.com";

      const customerName = guestWhoPaid?.name || fresh.lead?.name || "Guest";

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "zairo.domain@gmail.com",
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      // 🧾 Check if this guest has fully paid their due
      const guestAmountPaid = Number(guestWhoPaid?.amountPaid || 0);
      const guestAmountDue = Number(guestWhoPaid?.amountDue || 0);
      const guestFullyPaid = guestWhoPaid && guestAmountPaid >= guestAmountDue;

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
          address:
            guestWhoPaid?.address ?? fresh.lead?.address ?? fresh.address ?? "",
          amount: guestAmountPaid,
          sgst: 0,
          igst: 0,
          cgst: 0,
          totalAmount: guestAmountPaid,
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
          description: `Booking commission for ${
            fresh.visit?.VSID ?? fresh.bookingId ?? ""
          }`,
        };

        const computed = {
          subTotal: invoiceData.totalAmount,
          total: invoiceData.totalAmount,
          taxes: { sgst: 0, cgst: 0, igst: 0 },
        };

        const pdfBuffer = await generateInvoicePdfBuffer(invoiceData, computed);
        await Invoice.create(invoiceData);

        await transporter.sendMail({
          from: `"Vacation Saga" <zairo.domain@gmail.com>`,
          to: customerEmail,
          subject: "Your Vacation Saga Invoice",
          html: `
            <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
              <div style="background-color: #004aad; color: white; padding: 14px 24px; font-size: 20px; font-weight: bold; border-radius: 6px 6px 0 0;">
                Vacation Saga
              </div>
        
              <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 6px 6px;">
                <p>Hi ${customerName},</p>
        
                <p>Thank you for your payment of <strong>₹${guestAmountPaid}</strong>.</p>
        
                <p>Your payment has been successfully processed. Please find your official invoice attached.</p>
        
                <p><strong>Invoice Number:</strong> ${
                  invoiceData.invoiceNumber
                }</p>
                <p><strong>Booking ID:</strong> ${fresh.bookingId || "N/A"}</p>
        
                <p>If you have any questions, please don't hesitate to contact us.</p>
        
                <p style="margin-top: 24px;">Best regards,<br/>
                <strong>VS Team</strong><br/>
                Vacation Saga</p>
        
                <hr style="margin: 24px 0;" />
                <p style="font-size: 13px; color: #666;">
                  <strong>Director:</strong> Zaid Bin Hashmat<br/>
                  <strong>Zairo International Pvt Ltd</strong><br/>
                  +91 9598023492<br/>
                  Skype: Zaid860
                </p>
              </div>
            </div>
          `,
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
        const remaining = guestAmountDue - guestAmountPaid;

        await transporter.sendMail({
          from: `"Vacation Saga" <zairo.domain@gmail.com>`,
          to: customerEmail,
          subject: "Partial Payment Received - Vacation Saga",
          html: `
            <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
              <div style="background-color: #004aad; color: white; padding: 14px 24px; font-size: 20px; font-weight: bold; border-radius: 6px 6px 0 0;">
                Vacation Saga
              </div>
        
              <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 6px 6px;">
                <p>Hi ${customerName},</p>
        
                <p>We've received your payment of <strong>₹${amountPaid}</strong>.</p>
        
                <p><strong>Payment Summary:</strong></p>
                <ul style="margin-left: 16px;">
                  <li>Amount Paid: <strong>₹${guestAmountPaid}</strong></li>
                  <li>Total Due: <strong>₹${guestAmountDue}</strong></li>
                  <li>Remaining Balance: <strong>₹${remaining.toFixed(
                    2
                  )}</strong></li>
                </ul>
        
                <p>Once the full payment is completed, your official invoice will be sent.</p>
        
                <p>Thank you for choosing Vacation Saga!</p>
        
                <p style="margin-top: 24px;">Best regards,<br/>
                <strong>VS Team</strong><br/>
                Vacation Saga</p>
        
                <hr style="margin: 24px 0;" />
                <p style="font-size: 13px; color: #666;">
                  <strong>Director:</strong> Zaid Bin Hashmat<br/>
                  <strong>Zairo International Pvt Ltd</strong><br/>
                  +91 9598023492<br/>
                  Skype: Zaid860
                </p>
              </div>
            </div>
          `,
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
