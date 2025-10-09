import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import Bookings from "@/models/booking";
import Query from "@/models/query";

type RequestBody = {
  amount: number;
  finalPrice?: number;
  name: string;
  email: string;
  phone: string;
  description?: string;
  bookingId?: string;
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  email_id?: string; // ✅ new optional field
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
  name: string;
  email: string;
  phone: string;
  amount: number;
  finalPrice?: number;
  link: string;
  description?: string;
  bookingId?: string;
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
}) {
  const {
    name,
    email,
    phone,
    amount,
    finalPrice,
    link,
    description,
    bookingId,
    numberOfPeople,
    propertyOwner,
    address,
    checkIn,
    checkOut,
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
  const brand = rgb(1, 0.55, 0); // Vacation Saga brand orange

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
    page.drawText(value, { x: gapX, y, size: baseFontSize, font });
    y -= baseFontSize + 8;
  };

  // === Header Banner ===
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

  // === Title ===
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

  // === Content ===
  page.drawText(`Dear ${name},`, { x: 50, y, size: baseFontSize, font });
  y -= baseFontSize + 10;
  page.drawText(
    "Thank you for booking with us. Here are your reservation details:",
    {
      x: 50,
      y,
      size: baseFontSize,
      font,
    }
  );
  y -= baseFontSize + 12;

  const sectionTopY = y + 12;
  const sectionLeftX = 40;
  const sectionWidth = pageWidth - 80;

  drawLabelValue("Booking ID", bookingId ?? "-");
  drawLabelValue("Guest Name", name || "-");
  drawLabelValue("Phone", phone || "-");
  drawLabelValue("Email", email || "-");
  drawLabelValue("Total Amount (INR)", `₹ ${finalPrice?.toFixed(2)}`);
  drawLabelValue("Paid Amount (INR)", `${amount}`);
  drawLabelValue(
    "Number of People",
    numberOfPeople ? String(numberOfPeople) : "-"
  );
  drawLabelValue("Description", description || "-");
  drawLabelValue("Property Owner", propertyOwner || "-");
  drawLabelValue("Address", address || "-");
  drawLabelValue("Check-in", checkIn || "-");
  drawLabelValue("Check-out", checkOut || "-");

  // Border around section
  page.drawRectangle({
    x: sectionLeftX,
    y: y - 10,
    width: sectionWidth,
    height: sectionTopY - (y - 10),
    borderColor: gray(0.8),
    borderWidth: 1,
  });
  y -= 30;

  // Payment link
  page.drawText("Please complete your payment using the link below:", {
    x: 50,
    y,
    size: baseFontSize,
    font: bold,
  });
  y -= baseFontSize + 6;
  page.drawText(link, {
    x: 50,
    y,
    size: baseFontSize,
    font,
    color: rgb(0.1, 0.3, 0.85),
  });
  y -= baseFontSize + 16;

  // Company info
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
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing Gmail app password in env");
  }

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
    const body = (await req.json()) as RequestBody;
    const { amount, name, email, phone, description, bookingId, email_id } =
      body;

    // 🧩 Validation
    if (!amount || !name || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 💳 Razorpay setup
    const razorpay = getRazorpay();

    // 🧾 Create payment link
    const paymentLinkResponse: any = await razorpay.paymentLink.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      description: description ?? "Payment Request",
      customer: { name, email, contact: phone },
      notify: { sms: true, email: true },
      reminder_enable: true,
      notes: { purpose: description ?? "Payment" },
    });

    const shortUrl =
      paymentLinkResponse.short_url ?? paymentLinkResponse.url ?? "";
    if (!shortUrl) {
      return NextResponse.json(
        { error: "Failed to generate payment link" },
        { status: 500 }
      );
    }

    // === ✅ Update booking record according to new schema ===
    const updateData: any = {
      "travellerPayment.orderId": paymentLinkResponse.id,
      "travellerPayment.status": "pending",
      "travellerPayment.method": "link",
      "travellerPayment.currency": "INR",
      "travellerPayment.customerEmail": email,
      "travellerPayment.customerPhone": phone,

      // Optionally, append a pending entry in history
      $push: {
        "travellerPayment.history": {
          amount: amount,
          method: "link",
          linkId: paymentLinkResponse.id,
          status: "pending",
          date: new Date(),
        },
      },
    };

    // ✅ Update email in booking if provided
    if (email_id) updateData.email = email_id;
    else if (email) updateData.email = email;

    await Bookings.findByIdAndUpdate(bookingId, { $set: updateData });

    // === 📄 Generate PDF invoice ===
    const pdfBuffer = await generatePdfBuffer({
      name,
      email,
      phone,
      amount,
      link: shortUrl,
      description,
      bookingId,
      numberOfPeople: body.numberOfPeople,
      propertyOwner: body.propertyOwner,
      address: body.address,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    });

    // === ✉️ Send email ===
    const transporter = createTransporter();
    await transporter.sendMail({
      from: "zairo.domain@gmail.com",
      to: email,
      subject: `Payment Request / Invoice - ${bookingId ?? ""}`.trim(),
      text: `Hi ${name},\n\nPlease find attached your payment invoice.\n\nComplete your payment using this link: ${shortUrl}\n\nThanks,\nVacation Saga`,
      attachments: [
        {
          filename: `invoice-${Date.now()}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    // ✅ Final response
    return NextResponse.json({
      success: true,
      message: "Payment link created, email sent, and booking updated",
      link: shortUrl,
    });
  } catch (err: any) {
    console.error("❌ /api/payment-link error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

