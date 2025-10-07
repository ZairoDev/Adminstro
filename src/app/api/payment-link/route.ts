import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

type RequestBody = {
  amount: number;
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
};

function getRazorpay() {
  if (!process.env.RAZORPAY_API_KEY || !process.env.RAZORPAY_API_SECRET) {
    throw new Error("Missing Razorpay credentials");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY!,
    key_secret: process.env.RAZORPAY_API_SECRET!,
  });
}

async function generatePdfBuffer(data: {
  name: string;
  email: string;
  phone: string;
  amount: number;
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
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 12;
  let y = 760;

  // === 🔶 ORANGE BANNER HEADER ===
  const bannerHeight = 50;
  const bannerColor = rgb(1, 0.55, 0); // orange color (R=1,G=0.55,B=0)
  page.drawRectangle({
    x: 0,
    y: 841.89 - bannerHeight,
    width: 595.28,
    height: bannerHeight,
    color: bannerColor,
  });

  // Centered "Vacation Saga" text
  const title = "Vacation Saga";
  const textWidth = bold.widthOfTextAtSize(title, 20);
  const textX = (595.28 - textWidth) / 2;
  const textY = 841.89 - bannerHeight / 2 - 7;
  page.drawText(title, {
    x: textX,
    y: textY,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1), // white text
  });

  // === CONTENT BELOW HEADER ===
  y = 760;

  const drawText = (
    text: string,
    options?: { bold?: boolean; color?: [number, number, number] }
  ) => {
    const usedFont = options?.bold ? bold : font;
    const color = options?.color ? rgb(...options.color) : rgb(0, 0, 0);
    page.drawText(text, { x: 50, y, size: fontSize, font: usedFont, color });
    y -= 18;
  };

  drawText("Booking Confirmation", { bold: true });
  y -= 6;

  if (bookingId) drawText(`Booking ID: ${bookingId}`);
  else drawText("Booking ID: -");

  y -= 8;
  drawText(`Dear ${name},`);
  drawText(
    "We congratulate you and thank you for booking through us; the details of the reservation are here under:"
  );
  y -= 8;

  const details: Array<[string, string]> = [
    ["Number of People", numberOfPeople != null ? String(numberOfPeople) : "-"],
    ["Guest Name", name || "-"],
    ["Phone Number", phone || "-"],
    ["Email Address", email || "-"],
    ["Amount", `${amount}`],
    ["Description", description || "-"],
    ["Property Owner’s Name", propertyOwner || "-"],
    ["Property Address", address || "-"],
    ["Check in date", checkIn || "-"],
    ["Check out date", checkOut || "-"],
  ];

  details.forEach(([label, value]) => {
    drawText(`${label}:`, { bold: true });
    drawText(`   ${value}`);
  });

  y -= 4;
  drawText("Please complete your payment using the link below:", {
    bold: true,
  });
  drawText(link);

  y -= 8;
  drawText("Website Name: www.vacationsaga.com");
  drawText("Company Name: ZAIRO INTERNATIONAL PRIVATE LIMITED");
  drawText("CIN Number: U93090UP2017PTC089137");
  drawText("Email address: info@vacationsaga.com or support@vacationsaga.com");

  y -= 12;
  drawText("Concerned Person from Vacation Saga: Miss. Ankita Nigam");

  y -= 24;
  drawText("Signature:", { bold: true });
  y -= 40;

  // === 🖋 SIGNATURE IMAGE ===
  try {
    const signaturePath = path.join(process.cwd(), "public", "sign.png");
    const signatureBuffer = fs.readFileSync(signaturePath);
    const signatureImage = await pdfDoc.embedPng(
      new Uint8Array(signatureBuffer)
    );

    const imgWidth = 120;
    const imgHeight = 50;

    page.drawImage(signatureImage, {
      x: 50,
      y: y,
      width: imgWidth,
      height: imgHeight,
    }); 
  } catch (err) {
    console.error("Signature image not found, skipping...");
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function createTransporter() {
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing Gmail app password in environment variables");
  }
  console.log(
    "Creating transporter with user:",
    process.env.gmail_user,
    "and password:",
    process.env.GMAIL_APP_PASSWORD
  );
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "zairo.domain@gmail.com", // your fixed Gmail account
      pass: process.env.GMAIL_APP_PASSWORD, // app password stored in .env
    },
  });
}


export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { amount, name, email, phone, description } = body;

    if (!amount || !name || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpay();

    // Create payment link
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

    console.log("shortUrl: ", shortUrl);

    // Generate PDF
    const pdfBuffer = await generatePdfBuffer({
      name,
      email,
      phone,
      amount,
      link: shortUrl,
      description,
      bookingId: body.bookingId,
      numberOfPeople: body.numberOfPeople,
      propertyOwner: body.propertyOwner,
      address: body.address,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    });

    // Send email with PDF
    const transporter = createTransporter();
    const mailOptions = {
      from: "zairo.domain@gmail.com",
      to: email,
      subject: `Payment Request / Invoice - ${body.bookingId ?? ""}`.trim(),
      text: `Hi ${name},\n\nPlease find attached your payment invoice. Complete payment using the link: ${shortUrl}\n\nThanks,\nVacation Saga`,
      attachments: [
        {
          filename: `invoice-${Date.now()}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: "Payment link created and PDF emailed to customer",
      link: shortUrl,
    });
  } catch (err: any) {
    console.error("[v0] /api/payment-link error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
