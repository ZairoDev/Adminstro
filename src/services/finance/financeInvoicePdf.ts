/**
 * Finance Invoice PDF Generator
 *
 * Self-contained — does NOT import from /dashboard/invoice or generatePdfBuffer.
 * Mirrors the same visual layout (logo, header, bank details, footer) for consistency.
 */

import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FinanceInvoiceClassification } from "@/models/financeInvoice";

const COMPANY = {
  title: "Vacation Saga",
  tagline: "Create your own saga",
  legalName: "Zairo International Pvt Ltd",
  gstin: "GSTIN: 09AABCZ0555F1ZC",
  cin: "CIN: U93090UP2017PTCO89137",
  address: "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
  bank: {
    bankName: "IDFC FIRST",
    accountName: "ZAIRO INTERNATIONAL PRIVATE LIMITED",
    accountNumber: "10031778526",
    ifsc: "IDFB0021271",
    swift: "IDFBINBBMUM",
    branch: "Kanpur Branch",
  },
  website: "www.vacationsaga.com",
  support: "support@vacationsaga.com",
};

export type FinanceInvoiceData = {
  invoiceNumber: string;
  invoiceDate: Date;
  classification: FinanceInvoiceClassification;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestAddress?: string;
  bookingId?: string;
  propertyName?: string;
  propertyAddress?: string;
  checkIn?: Date;
  checkOut?: Date;
  amountBilled: number;
  currency: string;
  discountGiven?: number;
  pendingAmount?: number;
  splitTotalAmount?: number;
  notes?: string;
};

function formatCurrency(amount: number, currency: string): string {
  // Helvetica (WinAnsi) cannot encode "₹" — use ASCII-safe format
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

function formatDate(d?: Date | null): string {
  if (!d) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Strip characters Helvetica/WinAnsi cannot encode */
function toWinAnsiSafe(text: string): string {
  return text
    .replace(/\u20B9/g, "Rs.")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, "?");
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize(t: string, s: number): number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateFinanceInvoicePdf(data: FinanceInvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const draw = (
    text: string,
    opts: {
      x: number;
      y: number;
      size: number;
      font: typeof regular;
      color?: ReturnType<typeof rgb>;
    },
  ) => {
    page.drawText(toWinAnsiSafe(text), opts);
  };

  /* -------- Logo (from public/vs.png — same as legacy invoice generator) -------- */
  let logoDims = { width: 0, height: 0 };
  try {
    const logoPath = path.join(process.cwd(), "public", "vs.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBuffer));
      logoDims = logoImage.scale(0.3);
      page.drawImage(logoImage, {
        x: 50,
        y: height - 40 - logoDims.height + 26,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
  } catch {
    /* logo optional */
  }

  const textStartX = 50 + logoDims.width + 10;
  draw(COMPANY.title, { x: textStartX, y: height - 50, size: 18, font: bold });
  draw(COMPANY.tagline, { x: textStartX, y: height - 65, size: 12, font: regular });

  const companyX = width - 250;
  draw(COMPANY.legalName, { x: companyX, y: height - 50, size: 14, font: regular });
  draw(COMPANY.gstin, { x: companyX, y: height - 65, size: 12, font: regular });
  draw(COMPANY.cin, { x: companyX, y: height - 80, size: 12, font: regular });
  const addressLines = wrapText(`Address: ${COMPANY.address}`, regular, 10, 200);
  addressLines.forEach((line, i) => {
    draw(line, { x: companyX, y: height - 95 - i * 12, size: 10, font: regular });
  });

  /* -------- Bill To + Invoice Info -------- */
  const sectionStartY = height - 155;

  draw("Bill To", { x: 50, y: sectionStartY, size: 14, font: bold });
  const billItems = [
    `Name: ${data.guestName || "-"}`,
    data.guestEmail ? `Email: ${data.guestEmail}` : null,
    data.guestPhone ? `Phone: ${data.guestPhone}` : null,
    data.guestAddress ? `Address: ${data.guestAddress}` : null,
  ].filter(Boolean) as string[];

  let billY = sectionStartY - 20;
  for (const item of billItems) {
    draw(item, { x: 50, y: billY, size: 12, font: regular });
    billY -= 15;
  }

  const rightX = width - 220;
  let rightY = sectionStartY;
  draw("Finance Invoice", { x: rightX, y: rightY, size: 14, font: bold });
  rightY -= 20;
  draw(`Invoice No: ${data.invoiceNumber}`, { x: rightX, y: rightY, size: 12, font: regular });
  rightY -= 15;
  draw(`Date: ${formatDate(data.invoiceDate)}`, { x: rightX, y: rightY, size: 12, font: regular });
  rightY -= 30;

  const paidStatus = data.classification === "partial" ? "PARTIALLY PAID" : "PAID";
  draw(paidStatus, {
    x: rightX,
    y: rightY,
    size: 20,
    font: bold,
    color: rgb(0.95, 0.4, 0.1),
  });

  /* -------- Table -------- */
  const tableStartY = sectionStartY - 130;
  const tableX = 50;
  const tableWidth = width - 100;
  const colWidths = [0.45 * tableWidth, 0.25 * tableWidth, 0.15 * tableWidth, 0.15 * tableWidth];
  const rowH = 18;

  const drawLine = (y: number, thickness = 0.5) => {
    page.drawLine({
      start: { x: tableX, y },
      end: { x: tableX + tableWidth, y },
      thickness,
      color: rgb(0.2, 0.2, 0.2),
    });
  };

  const drawRow = (texts: string[], y: number, isBold = false) => {
    let x = tableX + 8;
    texts.forEach((text, i) => {
      draw(text, { x, y: y - 16, size: 11, font: isBold ? bold : regular });
      x += colWidths[i];
    });
  };

  drawRow(["Description", "Booking", "", "Amount"], tableStartY, true);
  drawLine(tableStartY - 6, 1.2);

  const descriptionLabel =
    data.classification === "split"
      ? "Travel Package (Split - Your Share)"
      : data.classification === "partial"
        ? "Travel Package (Partial Payment)"
        : "Travel Package (Full Payment)";

  const baseRows: [string, string, string, string][] = [
    [descriptionLabel, data.bookingId ?? "-", "", formatCurrency(data.amountBilled, data.currency)],
    [`Check In: ${formatDate(data.checkIn ?? null)}`, "", "", ""],
    [`Check Out: ${formatDate(data.checkOut ?? null)}`, "", "", ""],
  ];

  baseRows.forEach((r, i) => {
    const y = tableStartY - rowH * (i + 1);
    drawRow(r, y);
    drawLine(y - 6);
  });

  /* -------- Totals -------- */
  const totalStartY = tableStartY - rowH * 4;
  const totalsRightX = tableX + colWidths[0] + colWidths[1];

  const standardTotals: [string, string][] = [
    ["Sub Total:", formatCurrency(data.amountBilled, data.currency)],
    ["SGST:", formatCurrency(0, data.currency)],
    ["CGST:", formatCurrency(0, data.currency)],
    ["IGST:", formatCurrency(0, data.currency)],
    ["Total:", formatCurrency(data.amountBilled, data.currency)],
  ];

  standardTotals.forEach(([label, amount], i) => {
    const y = totalStartY - i * rowH;
    draw(label, { x: totalsRightX + 10, y: y - 16, size: 12, font: bold });
    draw(amount, { x: totalsRightX + colWidths[2] + 10, y: y - 16, size: 12, font: bold });
    drawLine(y - 6);
  });
  drawLine(totalStartY - 6);

  let extraY = totalStartY - standardTotals.length * rowH - 16;

  if (data.classification === "complete" && data.discountGiven && data.discountGiven > 0) {
    draw(`Discount Given: ${formatCurrency(data.discountGiven, data.currency)}`, {
      x: totalsRightX + 10,
      y: extraY,
      size: 11,
      font: regular,
      color: rgb(0.1, 0.55, 0.1),
    });
    extraY -= 16;
  }

  if (data.classification === "partial" && data.pendingAmount !== undefined) {
    draw(`Pending Amount: ${formatCurrency(data.pendingAmount, data.currency)}`, {
      x: totalsRightX + 10,
      y: extraY,
      size: 11,
      font: bold,
      color: rgb(0.8, 0.3, 0.0),
    });
    extraY -= 16;
  }

  if (data.classification === "split" && data.splitTotalAmount !== undefined) {
    draw(`Total Booking Payment: ${formatCurrency(data.splitTotalAmount, data.currency)}`, {
      x: totalsRightX + 10,
      y: extraY,
      size: 11,
      font: regular,
    });
    extraY -= 16;
  }

  /* -------- Bank Details -------- */
  let bankY = extraY - 20;
  draw("Bank Details", { x: 50, y: bankY, size: 12, font: bold });
  bankY -= 15;
  const bankLines = [
    `Bank Name: ${COMPANY.bank.bankName}`,
    `Account Name: ${COMPANY.bank.accountName}`,
    `Account Number: ${COMPANY.bank.accountNumber}`,
    `IFSC: ${COMPANY.bank.ifsc}`,
    `SWIFT: ${COMPANY.bank.swift}`,
    `Branch: ${COMPANY.bank.branch}`,
  ];
  for (const line of bankLines) {
    draw(line, { x: 50, y: bankY, size: 10, font: regular });
    bankY -= 12;
  }

  /* -------- Footer -------- */
  const footerText = `For TERMS AND CONDITIONS please visit our website. For any other assistance contact us on: ${COMPANY.support} | ${COMPANY.website}`;
  const footerSize = 8;
  const footerLineH = 10;
  const maxW = width - 100;
  const footerLines = wrapText(footerText, regular, footerSize, maxW);
  footerLines.forEach((line, i) => {
    const safe = toWinAnsiSafe(line);
    const lineWidth = regular.widthOfTextAtSize(safe, footerSize);
    const x = (width - lineWidth) / 2;
    const y = 20 + (footerLines.length - 1 - i) * footerLineH;
    draw(line, { x, y, size: footerSize, font: regular });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
