import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { cropTransparentPng } from "@/lib/pdf/cropTransparentPng";
import {
  buildSalaryAnnexure,
  ctcInWords,
  formatAnnexureInr,
  type AnnexureAmount,
} from "@/modules/finance/salary-annexure";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const INK = rgb(0.09, 0.09, 0.09);
const MUTED = rgb(0.38, 0.38, 0.38);
const LINE = rgb(0.78, 0.78, 0.78);
const HAIRLINE = rgb(0.88, 0.88, 0.88);
const PAPER = rgb(0.965, 0.965, 0.965);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.82, 0.09, 0.11);
const BLACK = rgb(0.07, 0.07, 0.07);

const COMPANY = "Zairo International";
const LEGAL_NAME = "Zairo International Private Limited";
const CIN = "CIN U93090UP2017PTC089137";

export type SalaryAnnexureInput = {
  employeeName: string;
  designation: string;
  effectiveFrom: string;
  formNumber: string;
  /** Name of the office selected for this candidate, such as "Noida Office". */
  corporateOfficeName: string;
  corporateOfficeAddress: string;
  registeredOfficeAddress: string;
  annualCtcRupees: number;
  authorizedSignatoryName: string;
  authorizedSignatoryTitle: string;
  authorizedSignature?: Uint8Array | Buffer;
  candidateSignature?: Uint8Array | Buffer;
  signedOn?: string;
};

function pdfText(value: string): string {
  return value
    .replace(/\u20B9/g, "Rs.")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\xFF]/g, "");
}

function wrapLines(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const safe = pdfText(text).replace(/\s+/g, " ").trim();
  if (!safe) return [];
  const words = safe.split(" ");
  const lines: string[] = [];
  let current = "";

  const pushLongWord = (word: string) => {
    let chunk = "";
    for (const char of word) {
      const trial = chunk + char;
      if (chunk && font.widthOfTextAtSize(trial, size) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = trial;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
    } else {
      pushLongWord(word);
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
): void {
  const safe = pdfText(text);
  if (!safe) return;
  page.drawText(safe, { x, y, size, font, color });
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
): void {
  const safe = pdfText(text);
  if (!safe) return;
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: right - width, y, size, font, color });
}

function ordinalDate(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const month = date.toLocaleString("en-US", { month: "long" });
  return `${day}${suffix} ${month} ${date.getFullYear()}`;
}

function addressLines(font: PDFFont, body: string, size: number, maxWidth: number): string[] {
  const parts = body.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) return wrapLines(font, body, size, maxWidth);
  const locality = `${parts.slice(-3, -1).join(", ")} ${parts[parts.length - 1]}`.replace(/\s+/g, " ");
  const street = parts.slice(0, -3).join(", ");
  return [
    ...(street ? wrapLines(font, street, size, maxWidth) : []),
    ...wrapLines(font, locality, size, maxWidth),
  ];
}

function withoutCountry(address: string): { body: string; country: string } {
  const trimmed = address.replace(/\s+/g, " ").trim();
  const match = trimmed.match(/^(.*?)(?:,\s*)?(India)\s*$/i);
  if (match?.[1]) return { body: match[1].replace(/,\s*$/, "").trim(), country: "India" };
  return { body: trimmed, country: "India" };
}

async function embedLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "Zairo.png"));
    return await pdf.embedPng(cropTransparentPng(bytes));
  } catch (error) {
    console.error("Salary annexure logo could not be embedded:", error);
    return null;
  }
}

async function embedSignature(pdf: PDFDocument, bytes: Uint8Array | Buffer | undefined): Promise<PDFImage | null> {
  if (!bytes || bytes.length === 0) return null;
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try {
    return await pdf.embedPng(data);
  } catch {
    try {
      return await pdf.embedJpg(data);
    } catch {
      return null;
    }
  }
}

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

type MoneyRow = {
  label: string;
  monthly: string;
  yearly: string;
  tone: "item" | "strong" | "total" | "section";
};

function compensationNotes(figures: string, words: string): string[] {
  return [
    `The above salary structure represents an annual Cost to Company (CTC) of ${figures} (${words}).`,
    "Basic Salary is fixed at 50% of the annual CTC. The remaining amount is distributed among House Rent Allowance, City Compensatory Allowance, Grade Allowance and Other Allowance.",
    "Provident Fund (PF), employer PF contribution, PF administration charges and mediclaim / group medical insurance are not included in this compensation structure.",
    "Monthly take-home shown above is the gross monthly salary before any applicable tax or other statutory deductions, if applicable.",
    "The above structure is subject to applicable statutory provisions and any future changes in law or company policy.",
  ];
}

export async function renderSalaryAnnexurePdf(input: SalaryAnnexureInput): Promise<Uint8Array> {
  const annexure = buildSalaryAnnexure(input.annualCtcRupees);
  const figures = formatAnnexureInr(annexure.annualCtcPaise);
  const words = ctcInWords(annexure.annualCtcPaise);
  const money = (amount: AnnexureAmount) => ({
    monthly: formatAnnexureInr(amount.monthlyPaise),
    yearly: formatAnnexureInr(amount.yearlyPaise),
  });

  const rows: MoneyRow[] = [
    { label: "Basic", ...money(annexure.basic), tone: "item" },
    { label: "House Rent Allowance", ...money(annexure.houseRentAllowance), tone: "item" },
    { label: "City Compensatory Allowance", ...money(annexure.cityCompensatoryAllowance), tone: "item" },
    { label: "Grade Allowance", ...money(annexure.gradeAllowance), tone: "item" },
    { label: "Other Allowance", ...money(annexure.otherAllowance), tone: "item" },
    { label: "Monthly Emoluments", ...money(annexure.emoluments), tone: "strong" },
    { label: "Less: Employee PF", monthly: "Not Applicable", yearly: "Not Applicable", tone: "item" },
    { label: "Monthly Take Home", ...money(annexure.takeHome), tone: "strong" },
    { label: "Other Benefits", monthly: "", yearly: "", tone: "section" },
    {
      label: "Employer's PF Contribution and Admin Charges",
      monthly: "Nil",
      yearly: "Nil",
      tone: "item",
    },
    { label: "Mediclaim / Group Medical Insurance", monthly: "Nil", yearly: "Nil", tone: "item" },
    { label: "Total Other Benefits", monthly: "Nil", yearly: "Nil", tone: "strong" },
    { label: "Total Cost to the Company (CTC)", ...money(annexure.totalCtc), tone: "total" },
  ];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  const logo = await embedLogo(pdf);
  const authorizedSignature = await embedSignature(pdf, input.authorizedSignature);
  const candidateSignature = await embedSignature(pdf, input.candidateSignature);
  const signedOn = ordinalDate(input.signedOn);

  const margin = 36;
  const right = PAGE_WIDTH - margin;
  const width = right - margin;

  const headerHeight = 72;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: WHITE,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight - 3,
    width: PAGE_WIDTH,
    height: 3,
    color: RED,
  });

  if (logo) {
    const logoHeight = 46;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    const logoY = PAGE_HEIGHT - headerHeight + (headerHeight - logoHeight) / 2;
    page.drawRectangle({
      x: 18,
      y: logoY - 4,
      width: logoWidth + 12,
      height: logoHeight + 8,
      color: WHITE,
    });
    page.drawImage(logo, {
      x: 24,
      y: logoY,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    drawText(page, "ZAIRO", margin, PAGE_HEIGHT - 34, fonts.bold, 16, INK);
    const zairoWidth = fonts.bold.widthOfTextAtSize("ZAIRO", 16);
    drawText(page, "INTERNATIONAL", margin + zairoWidth + 8, PAGE_HEIGHT - 32, fonts.bold, 8, RED);
    drawText(page, "Private Limited", margin, PAGE_HEIGHT - 52, fonts.regular, 8, MUTED);
  }

  drawRight(page, "HR / FORM", right, PAGE_HEIGHT - 30, fonts.regular, 8, MUTED);
  drawRight(page, input.formNumber || "SA", right, PAGE_HEIGHT - 48, fonts.bold, 10, INK);

  let y = PAGE_HEIGHT - headerHeight - 22;
  const columnGap = 18;
  const columnWidth = (width - columnGap) / 2;

  const drawOffice = (x: number, label: string, officeName: string, address: string) => {
    const { body, country } = withoutCountry(address);
    drawText(page, label, x, y, fonts.bold, 7, RED);
    drawText(page, officeName || COMPANY, x, y - 14, fonts.bold, 9, INK);
    const lines = addressLines(fonts.regular, body || "Address to be updated", 8, columnWidth);
    lines.slice(0, 3).forEach((line, index) => {
      drawText(page, line, x, y - 28 - index * 11, fonts.regular, 8, MUTED);
    });
    const used = Math.min(lines.length, 3);
    drawText(page, country, x, y - 28 - used * 11, fonts.regular, 8, INK);
    return 28 + (used + 1) * 11;
  };

  const leftHeight = drawOffice(
    margin,
    "CORPORATE OFFICE",
    input.corporateOfficeName,
    input.corporateOfficeAddress,
  );
  const rightHeight = drawOffice(
    margin + columnWidth + columnGap,
    "REGISTERED OFFICE",
    COMPANY,
    input.registeredOfficeAddress,
  );
  const officeHeight = Math.max(leftHeight, rightHeight);
  page.drawLine({
    start: { x: margin + columnWidth + columnGap / 2, y: y + 4 },
    end: { x: margin + columnWidth + columnGap / 2, y: y - officeHeight + 8 },
    thickness: 0.4,
    color: LINE,
  });

  y -= officeHeight + 18;
  const title = "Salary Annexure";
  const titleSize = 16;
  const titleWidth = fonts.bold.widthOfTextAtSize(title, titleSize);
  drawText(page, title, margin + (width - titleWidth) / 2, y, fonts.bold, titleSize, INK);
  const ruleWidth = 42;
  page.drawRectangle({
    x: margin + (width - ruleWidth) / 2,
    y: y - 8,
    width: ruleWidth,
    height: 2,
    color: RED,
  });
  const subtitle = "Monthly and yearly compensation structure";
  const subtitleWidth = fonts.regular.widthOfTextAtSize(subtitle, 8);
  drawText(page, subtitle, margin + (width - subtitleWidth) / 2, y - 22, fonts.regular, 8, MUTED);

  y -= 38;
  const metaHeight = 36;
  page.drawRectangle({
    x: margin,
    y: y - metaHeight,
    width,
    height: metaHeight,
    color: PAPER,
  });
  const metaColumns: Array<[string, string]> = [
    ["EMPLOYEE NAME", input.employeeName || "-"],
    ["DESIGNATION", input.designation || "-"],
    ["EFFECTIVE FROM", input.effectiveFrom || "-"],
  ];
  const metaWidth = width / 3;
  metaColumns.forEach(([label, value], index) => {
    const x = margin + index * metaWidth + 10;
    const maxValueWidth = metaWidth - 20;
    drawText(page, label, x, y - 13, fonts.bold, 6.5, MUTED);
    const valueSize = fonts.bold.widthOfTextAtSize(pdfText(value), 9) <= maxValueWidth ? 9 : 8;
    const valueLines = wrapLines(fonts.bold, value, valueSize, maxValueWidth);
    const shown = valueLines.length > 1 ? `${valueLines[0]}...` : valueLines[0] || "-";
    drawText(page, shown, x, y - 27, fonts.bold, valueSize, INK);
  });

  y -= metaHeight + 16;

  const labelWidth = width * 0.56;
  const amountWidth = (width - labelWidth) / 2;
  const monthlyRight = margin + labelWidth + amountWidth - 10;
  const yearlyRight = right - 10;
  const rowHeight = 16.5;
  const tableHeaderHeight = 18;

  const tableTop = y;
  page.drawRectangle({
    x: margin,
    y: y - tableHeaderHeight,
    width,
    height: tableHeaderHeight,
    color: BLACK,
  });
  const headerBaseline = y - tableHeaderHeight + (tableHeaderHeight - 7.5) / 2 + 0.5;
  drawText(page, "Salary Components", margin + 10, headerBaseline, fonts.bold, 7.5, WHITE);
  drawRight(page, "Monthly (INR)", monthlyRight, headerBaseline, fonts.bold, 7.5, WHITE);
  drawRight(page, "Yearly (INR)", yearlyRight, headerBaseline, fonts.bold, 7.5, WHITE);
  y -= tableHeaderHeight;
  const bodyTop = y;
  let totalTop = y;

  rows.forEach((row) => {
    const height = row.tone === "section" ? 18 : row.tone === "total" ? 20 : rowHeight;
    if (row.tone === "total") totalTop = y;
    const bottom = y - height;
    if (row.tone === "strong") {
      page.drawRectangle({ x: margin, y: bottom, width, height, color: PAPER });
    }
    if (row.tone === "section") {
      page.drawRectangle({ x: margin, y: bottom, width, height, color: rgb(0.93, 0.93, 0.93) });
    }
    if (row.tone === "total") {
      page.drawRectangle({ x: margin, y: bottom, width, height, color: BLACK });
    }

    const color = row.tone === "total" ? WHITE : row.tone === "section" ? MUTED : INK;
    const font = row.tone === "item" ? fonts.regular : fonts.bold;
    const size = row.tone === "section" ? 7 : row.tone === "total" ? 8.5 : 8;
    const baseline = bottom + (height - size) / 2 + 1;
    drawText(page, row.label, margin + 10, baseline, font, size, color);
    if (row.monthly) drawRight(page, row.monthly, monthlyRight, baseline, font, size, color);
    if (row.yearly) drawRight(page, row.yearly, yearlyRight, baseline, font, size, color);

    if (row.tone !== "total") {
      page.drawLine({
        start: { x: margin, y: bottom },
        end: { x: right, y: bottom },
        thickness: 0.35,
        color: HAIRLINE,
      });
    }
    y = bottom;
  });

  page.drawLine({
    start: { x: margin + labelWidth, y: totalTop },
    end: { x: margin + labelWidth, y: bodyTop },
    thickness: 0.35,
    color: LINE,
  });
  page.drawLine({
    start: { x: margin + labelWidth + amountWidth, y: totalTop },
    end: { x: margin + labelWidth + amountWidth, y: bodyTop },
    thickness: 0.35,
    color: LINE,
  });
  page.drawRectangle({
    x: margin,
    y,
    width,
    height: tableTop - y,
    borderColor: BLACK,
    borderWidth: 0.9,
  });

  y -= 22;
  drawText(page, "COMPENSATION NOTES", margin, y, fonts.bold, 8, INK);
  page.drawRectangle({ x: margin, y: y - 5, width: 28, height: 1.5, color: RED });
  y -= 16;

  compensationNotes(figures, words).forEach((note) => {
    const lines = wrapLines(fonts.regular, note, 7.5, width - 14);
    lines.forEach((line, index) => {
      if (index === 0) {
        page.drawRectangle({ x: margin, y: y + 1, width: 3.5, height: 3.5, color: RED });
      }
      drawText(page, line, margin + 12, y, fonts.regular, 7.5, INK);
      y -= 10;
    });
    y -= 3;
  });

  y -= 6;
  const consent =
    "I grant my consent to the above salary structure, which has been explained to me, and I accept the same.";
  const consentLines = wrapLines(fonts.italic, consent, 8, width - 16);
  const consentHeight = consentLines.length * 11 + 12;
  page.drawRectangle({
    x: margin,
    y: y - consentHeight,
    width,
    height: consentHeight,
    color: PAPER,
  });
  page.drawRectangle({
    x: margin,
    y: y - consentHeight,
    width: 2.5,
    height: consentHeight,
    color: RED,
  });
  consentLines.forEach((line, index) => {
    drawText(page, line, margin + 12, y - 16 - index * 11, fonts.italic, 8, INK);
  });
  y -= consentHeight + 20;

  const signGap = 16;
  const signWidth = (width - signGap) / 2;
  const signTop = y;

  const drawSignatory = (
    x: number,
    heading: string,
    name: string,
    title: string,
    signature: PDFImage | null,
    showDate: boolean,
  ) => {
    drawText(page, heading, x, signTop, fonts.bold, 7, RED);
    const lineY = signTop - 48;
    if (signature) {
      const maxWidth = 148;
      const maxHeight = 34;
      const scale = Math.min(maxWidth / signature.width, maxHeight / signature.height);
      const drawWidth = signature.width * scale;
      const drawHeight = signature.height * scale;
      page.drawImage(signature, {
        x,
        y: lineY + 6,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      page.drawLine({
        start: { x, y: lineY },
        end: { x: x + signWidth - 12, y: lineY },
        thickness: 0.6,
        color: INK,
      });
    }
    drawText(page, `Name: ${name || "____________________"}`, x, lineY - 14, fonts.regular, 8, INK);
    if (title) drawText(page, title, x, lineY - 26, fonts.regular, 7.5, MUTED);
    if (showDate) {
      const dateText = signedOn ? `Date: ${signedOn}` : "Date: ____________________";
      drawText(page, dateText, x, lineY - 40, fonts.regular, 8, INK);
    }
  };

  drawSignatory(
    margin,
    "AUTHORIZED SIGNATORY",
    input.authorizedSignatoryName,
    input.authorizedSignatoryTitle,
    authorizedSignature,
    false,
  );
  drawSignatory(
    margin + signWidth + signGap,
    "CANDIDATE NAME & SIGNATURE",
    input.employeeName,
    "",
    candidateSignature,
    true,
  );

  page.drawLine({
    start: { x: margin, y: 32 },
    end: { x: right, y: 32 },
    thickness: 0.4,
    color: LINE,
  });
  drawText(
    page,
    "This annexure forms part of the offer letter.",
    margin,
    20,
    fonts.regular,
    7,
    MUTED,
  );
  drawRight(page, `${LEGAL_NAME}  |  ${CIN}`, right, 20, fonts.regular, 7, MUTED);

  return pdf.save();
}
