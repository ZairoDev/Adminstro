import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import { PDFArray, PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import Bookings from "@/models/booking";
import { connectDb } from "@/util/db";
import documents from "razorpay/dist/types/documents";

// ✅ Updated Owner type with idNumber
export type Owner = {
  name: string;
  email: string;
  phoneNo: string;
  idNumber?: string;
  documents: string[];
};

type RequestBody = {
  amount: number;
  finalPrice?: number;
  name: string;
  email: string;
  phone: string;
  description?: string;
  bookingId?: string;
  booking_Id?: string;
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  guests?: Owner[];
  checkIn?: string;
  checkOut?: string;
  paymentType?: "full" | "partial" | "remaining" | "split";
  partialAmount?: number;
  rentPayable: number;
  depositPaid: number;
};

// --- RAZORPAY INIT ---
function getRazorpay() {
  if (!process.env.RAZORPAY_API_KEY || !process.env.RAZORPAY_API_SECRET) {
    throw new Error("Missing Razorpay credentials");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY!,
    key_secret: process.env.RAZORPAY_API_SECRET!,
  });
}

// --- PDF GENERATOR ---
async function generatePdfBuffer(data: {
  amount: number;
  finalPrice?: number;
  link: string;
  description?: string;
  bookingId?: string;
  booking_Id?: string;
  guests?: Owner[];
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  paymentType?: string;
  partialAmount?: number;      
}) {
  const {
    amount,
    finalPrice,
    link,
    description,
    bookingId,
    booking_Id,
    numberOfPeople,
    propertyOwner,
    address,
    checkIn,
    checkOut,
    guests = [],
    paymentType,
  } = data;

  const pdfDoc = await PDFDocument.create();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = pageHeight - 100;
  const baseFontSize = 12;
  const gray = (v: number) => rgb(v, v, v);
  const brand = rgb(1, 0.55, 0); // Vacation Saga orange

  const drawCentered = (
    text: string,
    size = baseFontSize,
    useBold = false,
    color = rgb(0, 0, 0)
  ) => {
    const usedFont = useBold ? bold : font;
    const textWidth = usedFont.widthOfTextAtSize(text, size);
    const x = (pageWidth - textWidth) / 2;
    page.drawText(text, { x, y, size, font: usedFont, color });
    y -= size + 8;
  };

  const drawLabelValue = (label: string, value: string) => {
    const leftX = 50;
    const gapX = 200;
    page.drawText(label, { x: leftX, y, size: baseFontSize, font: bold });
    page.drawText(value || "-", { x: gapX, y, size: baseFontSize, font });
    y -= baseFontSize + 8;
  };

  // === Header ===
  const bannerHeight = 90;
  page.drawRectangle({
    x: 0,
    y: pageHeight - bannerHeight,
    width: pageWidth,
    height: bannerHeight,
    color: brand,
  });

  // === Logo ===
  try {
    const logoPath = path.join(process.cwd(), "public", "vs.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBuffer));
      const scale = Math.min(160 / logoImage.width, 60 / logoImage.height);
      const w = logoImage.width * scale;
      const h = logoImage.height * scale;
      page.drawImage(logoImage, {
        x: (pageWidth - w) / 2,
        y: pageHeight - bannerHeight + (bannerHeight - h) / 2,
        width: w,
        height: h,
      });
    }
  } catch (err) {
    console.error("Logo not found, skipping:", err);
  }

  y = pageHeight - bannerHeight - 40;
  drawCentered("Booking Confirmation / Payment Request", 18, true);

  // Divider
  page.drawRectangle({
    x: 50,
    y: y + 6,
    width: pageWidth - 100,
    height: 1,
    color: gray(0.75),
  });
  y -= 18;

  // === Booking Details ===
  drawLabelValue("Booking ID", booking_Id ?? "-");

  // 🟠 If owners exist → skip guest name/email/phone in main section
  // if (guests.length === 0) {
  //   drawLabelValue("Guest Name", name || "-");
  //   drawLabelValue("Phone", phone || "-");
  //   drawLabelValue("Email", email || "-");
  // }

  drawLabelValue("Total Amount (INR)", `${amount}`);
  drawLabelValue("Paid Amount (INR)", `${finalPrice?.toFixed(2) ?? "-"}`);
  drawLabelValue(
    "Number of People",
    numberOfPeople ? String(numberOfPeople) : "-"
  );
  drawLabelValue("Description", description || "-");
  drawLabelValue("Property Owner", propertyOwner || "-");
  drawLabelValue("Address", address || "-");
  drawLabelValue("Check-in", checkIn || "-");
  drawLabelValue("Check-out", checkOut || "-");
  y -= 20;

  // === Owners Section ===
  if (guests.length > 0) {
    page.drawText("Guest(s) Details:", {
      x: 50,
      y,
      size: baseFontSize + 1,
      font: bold,
    });
    y -= baseFontSize + 6;

    guests.forEach((owner, i) => {
      drawLabelValue(`Guest ${i + 1} Name`, owner.name);
      drawLabelValue(`Email`, owner.email);
      drawLabelValue(`Phone`, owner.phoneNo);
      drawLabelValue(`ID Number`, owner.idNumber || "-");
      y -= 10;
    });
    y -= 10;
  }

  // === Payment Link ===
  const payNowText = "Pay Now";
  const textWidth = font.widthOfTextAtSize(payNowText, baseFontSize);

  page.drawText(payNowText, {
    x: 50,
    y,
    size: baseFontSize,
    font,
    color: rgb(0.1, 0.3, 0.85),
  });

  // Create a clickable annotation for the text
  const linkAnnotation = page.doc.context.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of("Link"),
    Rect: page.doc.context.obj([50, y, 50 + textWidth, y + baseFontSize]),
    Border: page.doc.context.obj([0, 0, 0]), // removes underline box
    A: page.doc.context.obj({
      Type: PDFName.of("Action"),
      S: PDFName.of("URI"),
      URI: PDFString.of(link),
    }),
  });

  // Get or create the Annots array for the page
  let annots = page.node.Annots();

  if (!annots) {
    annots = page.doc.context.obj([]);
    page.node.set(PDFName.of("Annots"), annots);
  }

  // Append the annotation to the page
  (annots as PDFArray).push(linkAnnotation);
  y -= baseFontSize + 16;

  // === Company Info ===
  const infoLines = [
    "Website: www.vacationsaga.com",
    "Company: ZAIRO INTERNATIONAL PRIVATE LIMITED",
    "CIN: U93090UP2017PTC089137",
    "Email: info@vacationsaga.com / support@vacationsaga.com",
    "Concerned Person: Miss. Ankita Nigam",
  ];

  infoLines.forEach((t) => {
    page.drawText(t, { x: 50, y, size: 10, font, color: gray(0.2) });
    y -= 14;
  });

  y -= 20;
  page.drawText("Signature:", { x: 50, y, size: baseFontSize, font: bold });
  y -= 36;

  try {
    const signPath = path.join(process.cwd(), "public", "sign.png");
    if (fs.existsSync(signPath)) {
      const buff = fs.readFileSync(signPath);
      const img = await pdfDoc.embedPng(new Uint8Array(buff));
      const s = Math.min(140 / img.width, 60 / img.height);
      const w = img.width * s;
      const h = img.height * s;
      page.drawImage(img, { x: 50, y, width: w, height: h });
      y -= h + 10;
    }
  } catch (err) {
    console.warn("Signature image not found:", err);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}


// --- NODEMAILER TRANSPORTER ---
function createTransporter() {
  if (!process.env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "zairo.domain@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// --- MAIN API HANDLER ---
export async function POST(req: Request) {
  try {
    await connectDb();

    const body = (await req.json()) as RequestBody;
    const {
      amount,
      description,
      bookingId,
      numberOfPeople,
      propertyOwner,
      address,
      guests = [],
      checkIn,
      checkOut,
      paymentType = "full",
      partialAmount,
      rentPayable,
      depositPaid,
    } = body;

    if (!amount || !guests.length) {
      return NextResponse.json(
        { error: "Missing required fields or guests" },
        { status: 400 }
      );
    }
    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 }
      );  
    }

    const razorpay = getRazorpay();
    const transporter = createTransporter();

    // Compute finalAmount for this link
    let finalAmount = amount;
    if (paymentType === "partial") {
      if (!partialAmount || partialAmount <= 0) {
        return NextResponse.json(
          { error: "Invalid partial amount" },
          { status: 400 }
        );
      }
      finalAmount = partialAmount;
    } else if (paymentType === "remaining") {
      // API caller should compute remaining before calling; we accept it as provided
      finalAmount = amount;
    }

    // Split payment: generate one link per guest and update guests + history
    if (paymentType === "split") {
      const perGuest = +(amount / guests.length).toFixed(2);
      const createdLinks: Array<{
        name: string;
        email: string;
        linkId: string;
        link: string;
        amount: number;
      }> = [];

      for (const guest of guests) {
        const resp: any = await razorpay.paymentLink.create({
          amount: Math.round(perGuest * 100),
          currency: "INR",
          description: description ?? "Payment Request",
          customer: {
            name: guest.name,
            email: guest.email,
            contact: guest.phoneNo,
          },
          notify: { sms: true, email: true },
          reminder_enable: true,
          notes: { purpose: "split" },
        });
        const shortUrl = resp.short_url ?? resp.url ?? "";
        if (!shortUrl) continue;

        // Email PDF per guest (optional)
        if (transporter) {
          const pdfBuffer = await generatePdfBuffer({
            amount: perGuest,
            link: shortUrl,
            description,
            bookingId,
            numberOfPeople,
            propertyOwner,
            address,
            checkIn,
            checkOut,
            guests: [guest],
          });
          await transporter.sendMail({
            from: '"Vacation Saga" <zairo.domain@gmail.com>',
            to: guest.email,
            subject: `Payment Request - ${bookingId}`.trim(),
            html: `
              <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
                <div style="background-color: #004aad; color: white; padding: 14px 24px; font-size: 20px; font-weight: bold; border-radius: 6px 6px 0 0;">
                  Vacation Saga
                </div>
          
                <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 6px 6px;">
                  <p>Hey ${guest.name},</p>
          
                  <p>Thank you for booking your stay with <strong>Vacation Saga</strong>.</p>
          
                  <p>Here are the booking details for your upcoming stay in <strong>${
              address || "Greece"
                  }</strong> from 
                  <strong>${checkIn || "TBA"}</strong> to <strong>${
              checkOut || "TBA"
            }</strong>.</p>
          
                  <p><strong>Price Breakdown:</strong></p>
                  <ul style="margin-left: 16px;">
                    <li>Deposit Paid: <strong>€${depositPaid ?? 0}</strong></li>
                    <li>Rent Payable: <strong>€${rentPayable ?? 0}</strong></li>
                    <li>Commission Payable: <strong>€${
                      amount ?? 0
                    }</strong></li>
                  </ul>
          
                  <p>In order to complete the agency fees, kindly follow the link below:</p>
                  <p>
                    <a href="${shortUrl}" 
                       style="background-color:#004aad; color:white; text-decoration:none; padding:10px 20px; border-radius:5px; display:inline-block;">
                       Pay Now
                    </a>
                  </p>
          
                  <p>Once you pay the commission, you will receive a paid invoice.</p>
                  <p>Please find your contract attached below.</p>
          
                  <p>Hope we are able to serve you better!</p>
          
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
                filename: `booking-details-${guest.name}.pdf`,
                content: pdfBuffer,
              },
            ],
          });
          
        }

        createdLinks.push({
          name: guest.name,
          email: guest.email,
          linkId: resp.id,
          link: shortUrl,
          amount: perGuest,
        });
      }
      const guestUpdates = guests.map((g, i) => ({
        name: g.name,
        email: g.email,
        phone: g.phoneNo,
        amountDue: perGuest,
        amountPaid: 0,
        status: "pending",
        documents:g.documents,
        payments: [
          {
            amount: perGuest,
            linkId: createdLinks[i].linkId,
            status: "pending",
            method: "split",
            date: new Date(),
          },
        ],
      }));

      const historyUpdates = guestUpdates.map((g) => ({
        amount: g.amountDue,
        method: "split",
        paidBy: g.email,
        linkId: g.payments[0].linkId,
        status: "pending",
        date: new Date(),
      }));

      // Update booking: set paymentType, guests with amountDue, and history entries
      await Bookings.findByIdAndUpdate(
        bookingId,
        {
          $set: {
            "travellerPayment.paymentType": "split",
            "travellerPayment.status": "pending",
            "travellerPayment.guests": guestUpdates,
            "travellerPayment.finalAmount": amount, // total split base amount
            "travellerPayment.rentPayable": rentPayable,
            "travellerPayment.depositPaid": depositPaid,
          },
          $push: {
            "travellerPayment.history": { $each: historyUpdates },
          },
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: "Split payment links created and emailed to guests.",
        links: createdLinks,
      });
    }

    // Full/partial/remaining: one link for all
    const mainGuest = guests[0];
    const resp: any = await razorpay.paymentLink.create({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      description: description ?? "Payment Request",
      customer: {
        name: mainGuest.name,
        email: mainGuest.email,
        contact: mainGuest.phoneNo,
      },
      notify: { sms: true, email: true },
      reminder_enable: true,
      notes: { purpose: paymentType },
    });

    const link = resp.short_url ?? resp.url ?? "";
    if (!link) throw new Error("Failed to generate payment link");

    if (transporter) {
      const pdfBuffer = await generatePdfBuffer({
        amount: finalAmount,
        link,
        description,
        bookingId,
        numberOfPeople,
        propertyOwner,
        address,
        checkIn,
        checkOut,
        guests,
      });
      await transporter.sendMail({
        from: '"Vacation Saga" <zairo.domain@gmail.com>',
        to: mainGuest.email,
        subject: `Payment Request - ${bookingId}`.trim(),
        html: `
          <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
            <div style="background-color: #004aad; color: white; padding: 14px 24px; font-size: 20px; font-weight: bold; border-radius: 6px 6px 0 0;">
              Vacation Saga
            </div>
      
            <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 6px 6px;">
              <p>Hey ${mainGuest.name},</p>
      
              <p>Thank you for booking your stay with <strong>Vacation Saga</strong>.</p>
      
              <p>Here are the booking details for your upcoming stay in <strong>${
                address || "Greece"
              }</strong> from 
              <strong>${checkIn || "TBA"}</strong> to <strong>${
          checkOut || "TBA"
        }</strong>.</p>
      
              <p><strong>Price Breakdown:</strong></p>
              <ul style="margin-left: 16px;">
                <li>Deposit Paid: <strong>€${depositPaid ?? 0}</strong></li>
                <li>Rent Payable: <strong>€${rentPayable ?? 0}</strong></li>
                <li>Commission Payable: <strong>€${amount ?? 0}</strong></li>
              </ul>
      
              <p>In order to complete the agency fees, kindly follow the link below:</p>
              <p>
                <a href="${link}" 
                   style="background-color:#004aad; color:white; text-decoration:none; padding:10px 20px; border-radius:5px; display:inline-block;">
                   Pay Now
                </a>
              </p>
      
              <p>Once you pay the commission, you will receive a paid invoice.</p>
              <p>Please find your contract attached below.</p>
      
              <p>Hope we are able to serve you better!</p>
      
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
            filename: `booking-details-${mainGuest.name}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
    }

    const guestUpdates = guests.map((g) => ({
      name: g.name,
      email: g.email,
      phone: g.phoneNo,
      amountDue: finalAmount,
      amountPaid: 0,
      status: "pending",
      documents: g.documents,
      payments: [
        {
          amount: finalAmount,
          linkId: resp.id,
          status: "pending",
          method: paymentType,
          date: new Date(),
        },
      ],
    }));

    // Update booking: set paymentType and push pending history
    await Bookings.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          "travellerPayment.paymentType": paymentType,
          "travellerPayment.status": "pending",
          "travellerPayment.guests": guestUpdates,
          "travellerPayment.rentPayable": rentPayable,
          "travellerPayment.depositPaid": depositPaid,
        },
        $push: {
          "travellerPayment.history": {
            amount: finalAmount,
            method: paymentType,
            paidBy: mainGuest.email,
            linkId: resp.id,
            status: "pending",
            date: new Date(),
          },
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Payment link created and email sent successfully.",
      link,
    });
  } catch (err: any) {
    console.error("❌ /api/payment-link error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
