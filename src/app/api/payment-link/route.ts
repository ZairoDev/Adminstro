import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import Bookings from "@/models/booking";

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
  // A4 page
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helpers
  let y = pageHeight - 100;
  const baseFontSize = 12;
  const gray = (v: number) => rgb(v, v, v);
  const brand = rgb(1, 0.55, 0); // orange brand color

  const drawCentered = (
    text: string,
    size = baseFontSize,
    useBold = false,
    color = rgb(0, 0, 0),
    offsetY = 0
  ) => {
    const usedFont = useBold ? bold : font;
    const textWidth = usedFont.widthOfTextAtSize(text, size);
    const x = (pageWidth - textWidth) / 2;
    page.drawText(text, { x, y: y + offsetY, size, font: usedFont, color });
    y -= size + 8;
  };

  const drawLabelValue = (
    label: string,
    value: string,
    size = baseFontSize
  ) => {
    const leftX = 50;
    const gapX = 200;
    page.drawText(label, {
      x: leftX,
      y,
      size,
      font: bold,
      color: rgb(0, 0, 0),
    });
    page.drawText(value, { x: gapX, y, size, font: font, color: gray(0) });
    y -= size + 8;
  };

  // === Header banner ===
  const bannerHeight = 90;
  page.drawRectangle({
    x: 0,
    y: pageHeight - bannerHeight,
    width: pageWidth,
    height: bannerHeight,
    color: brand,
  });

  // === Centered Logo ===
  // Try placeholder PNG bundled in project; fallbacks handled gracefully
  try {
    const logoPath = path.join(process.cwd(), "public", "vs.png");
    const logoBuffer = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBuffer));

    // Scale to a "decent" size while preserving aspect ratio
    const maxLogoW = 160;
    const maxLogoH = 60;
    const scale = Math.min(
      maxLogoW / logoImage.width,
      maxLogoH / logoImage.height
    );
    const logoW = logoImage.width * scale;
    const logoH = logoImage.height * scale;

    const logoX = (pageWidth - logoW) / 2;
    const logoY = pageHeight - bannerHeight + (bannerHeight - logoH) / 2;

    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  } catch (err) {
    console.error("❌ Logo not found, skipping:", err);
  }

  // Reset Y for content below banner
  y = pageHeight - bannerHeight - 40;

  // Title
  drawCentered(
    "Booking Confirmation / Payment Request",
    18,
    true,
    rgb(0, 0, 0)
  );

  // Divider
  page.drawRectangle({
    x: 50,
    y: y + 6,
    width: pageWidth - 100,
    height: 1,
    color: gray(0.75),
  });
  y -= 12;

  // Greeting
  page.drawText(`Dear ${name},`, {
    x: 50,
    y,
    size: baseFontSize,
    font,
    color: rgb(0, 0, 0),
  });
  y -= baseFontSize + 8;
  page.drawText(
    "Thank you for booking with us. Your reservation details are listed below:",
    {
      x: 50,
      y,
      size: baseFontSize,
      font,
      color: rgb(0, 0, 0),
    }
  );
  y -= baseFontSize + 14;

  // Details section container (subtle border)
  const sectionTopY = y + 8;
  const sectionLeftX = 40;
  const sectionWidth = pageWidth - 80;

  // Details
  drawLabelValue("Booking ID", bookingId ?? "-");
  drawLabelValue(
    "Number of People",
    numberOfPeople != null ? String(numberOfPeople) : "-"
  );
  drawLabelValue("Guest Name", name || "-");
  drawLabelValue("Phone Number", phone || "-");
  drawLabelValue("Email Address", email || "-");
  drawLabelValue("Amount (INR)", `${amount}`);
  drawLabelValue("Description", description || "-");
  drawLabelValue("Property Owner’s Name", propertyOwner || "-");
  drawLabelValue("Property Address", address || "-");
  drawLabelValue("Check-in Date", checkIn || "-");
  drawLabelValue("Check-out Date", checkOut || "-");

  // Draw section border after details are rendered
  page.drawRectangle({
    x: sectionLeftX,
    y: y - 10,
    width: sectionWidth,
    height: sectionTopY - (y - 10),
    borderColor: gray(0.8),
    borderWidth: 1,
    // color: rgb(1, 1, 1),
  });

  y -= 24;

  // Payment link
  page.drawText("Please complete your payment using the link below:", {
    x: 50,
    y,
    size: baseFontSize,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= baseFontSize + 6;

  // Make the link stand out in blue
  page.drawText(link, {
    x: 50,
    y,
    size: baseFontSize,
    font,
    color: rgb(0.1, 0.3, 0.85),
  });
  y -= baseFontSize + 16;

  // Company info (subtle)
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

  y -= 10;
  page.drawText("Signature:", {
    x: 50,
    y,
    size: baseFontSize,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 36;

  // === Signature image with fallback ===
  const tryEmbedImage = async (relPath: string) => {
    const abs = path.join(process.cwd(), relPath);
    if (!fs.existsSync(abs)) return null;
    const buff = fs.readFileSync(abs);
    const isPng = relPath.toLowerCase().endsWith(".png");
    try {
      return isPng
        ? await pdfDoc.embedPng(new Uint8Array(buff))
        : await pdfDoc.embedJpg(new Uint8Array(buff));
    } catch {
      return null;
    }
  };

  try {
    // try custom sign.png first, then fallback to placeholder-user.jpg
    const signatureImage =
      (await tryEmbedImage(path.join("public", "sign.png"))) ||
      (await tryEmbedImage(path.join("public", "placeholder-user.jpg")));

    if (signatureImage) {
      const maxW = 140;
      const maxH = 60;
      const s = Math.min(
        maxW / signatureImage.width,
        maxH / signatureImage.height
      );
      const w = signatureImage.width * s;
      const h = signatureImage.height * s;
      page.drawImage(signatureImage, { x: 50, y: y, width: w, height: h });
      y -= h + 10;
    } else {
      console.warn("No signature image found, skipping signature image.");
    }
  } catch (err) {
    console.error("Signature image error, skipping:", err);
  }

  // Footer line
  page.drawRectangle({
    x: 50,
    y: 40,
    width: pageWidth - 100,
    height: 1,
    color: gray(0.85),
  });

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

    await Bookings.findByIdAndUpdate(body.bookingId, {
      $set: {
        "payment.orderId": paymentLinkResponse.id,
        "payment.status": "pending",
      },
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
