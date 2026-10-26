import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SalaryComponentAmount } from "@/modules/finance/salary-structure";
import { rupeesInWords } from "@/modules/finance/rupees-in-words";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 28;
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

const EMPLOYER = {
  legalName: "Zairo International Pvt Ltd",
  addressLine1: "117/N/70, 3rd Floor, Kakadeo",
  addressLine2: "Kanpur - 208025, UP, India",
  cin: "CIN: U93090UP2017PTCO89137",
  gstin: "GSTIN: 09AABCZ0555F1ZC",
  pan: "PAN: AABCZ0555F",
};

export type SalarySlipDocument = {
  monthKey: string;
  monthLabel: string;
  slipNumber: string;
  periodLabel: string;
  employeeName: string;
  employeeCode: string | null;
  role: string;
  organization: string;
  empType: string;
  dateOfJoining: string | null;
  email: string;
  phone: string;
  accountNo: string;
  ifsc: string;
  address: string;
  components: SalaryComponentAmount[];
  gross: number;
  lossOfPayDays: number;
  lossOfPayAmount: number;
  generatedOn: string;
};

function toWinAnsi(value: string): string {
  return value
    .replace(/\u20B9/g, "Rs.")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, "");
}

function money(amount: number): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDays(days: number): string {
  return Number.isInteger(days) ? String(days) : String(Math.round(days * 100) / 100);
}

function displayDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function maskAccount(account: string, ifsc: string): string {
  const digits = account.replace(/\s+/g, "");
  if (!digits) return "-";
  const visible = digits.length <= 4 ? digits : digits.slice(-4);
  const masked = digits.length <= 4 ? visible : `XXXX XXXX ${visible}`;
  return ifsc ? `${masked} (${ifsc})` : masked;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
): void {
  page.drawText(toWinAnsi(text), { x, y, size, font, color: BLACK });
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  font: PDFFont,
  size: number,
): void {
  const safe = toWinAnsi(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: right - width, y, size, font, color: BLACK });
}

function clip(font: PDFFont, text: string, size: number, maxWidth: number): string {
  const safe = toWinAnsi(text);
  if (!safe) return "";
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let end = safe.length;
  while (end > 0 && font.widthOfTextAtSize(`${safe.slice(0, end)}...`, size) > maxWidth) {
    end -= 1;
  }
  return end > 0 ? `${safe.slice(0, end)}...` : safe.slice(0, 1);
}

function rule(page: PDFPage, x1: number, y: number, x2: number): void {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: 0.6,
    color: BLACK,
  });
}

function box(page: PDFPage, x: number, y: number, width: number, height: number): void {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: BLACK,
    borderWidth: 0.7,
    color: WHITE,
  });
}

type Fonts = { regular: PDFFont; bold: PDFFont };

function drawDetailTable(
  page: PDFPage,
  fonts: Fonts,
  x: number,
  top: number,
  width: number,
  title: string,
  rows: Array<[string, string]>,
): number {
  const titleHeight = 16;
  const rowHeight = 15;
  const height = titleHeight + rows.length * rowHeight;
  const bottom = top - height;
  box(page, x, bottom, width, height);
  rule(page, x, top - titleHeight, x + width);
  drawText(page, title, x + 6, top - 11, fonts.bold, 9);
  rows.forEach(([label, value], index) => {
    const baseline = top - titleHeight - index * rowHeight - 11;
    drawText(page, label, x + 6, baseline, fonts.regular, 8);
    drawText(page, ":", x + 102, baseline, fonts.regular, 8);
    drawText(
      page,
      clip(fonts.regular, value || "-", 8, width - 118),
      x + 110,
      baseline,
      fonts.regular,
      8,
    );
    if (index < rows.length - 1) {
      rule(page, x, top - titleHeight - (index + 1) * rowHeight, x + width);
    }
  });
  return bottom;
}

function drawMoneyTable(
  page: PDFPage,
  fonts: Fonts,
  x: number,
  top: number,
  width: number,
  title: string,
  rows: Array<{ label: string; amount: string; strong?: boolean }>,
  total: { label: string; amount: string },
): number {
  const titleHeight = 16;
  const headerHeight = 16;
  const rowHeight = 15;
  const height = titleHeight + headerHeight + (rows.length + 1) * rowHeight;
  const bottom = top - height;
  const amountRight = x + width - 8;
  box(page, x, bottom, width, height);
  rule(page, x, top - titleHeight, x + width);
  drawText(page, title, x + 6, top - 11, fonts.bold, 9);

  const headerY = top - titleHeight - 11;
  drawText(page, "Component", x + 6, headerY, fonts.bold, 8);
  drawRight(page, "Amount (Rs.)", amountRight, headerY, fonts.bold, 8);
  rule(page, x, top - titleHeight - headerHeight, x + width);

  rows.forEach((row, index) => {
    const baseline = top - titleHeight - headerHeight - index * rowHeight - 11;
    const font = row.strong ? fonts.bold : fonts.regular;
    drawText(page, clip(font, row.label, 8, width - 90), x + 6, baseline, font, 8);
    drawRight(page, row.amount, amountRight, baseline, font, 8);
    rule(page, x, top - titleHeight - headerHeight - (index + 1) * rowHeight, x + width);
  });

  const totalY = top - titleHeight - headerHeight - rows.length * rowHeight - 11;
  drawText(page, total.label, x + 6, totalY, fonts.bold, 8);
  drawRight(page, total.amount, amountRight, totalY, fonts.bold, 8);
  return bottom;
}

export async function buildSalarySlipPdf(slip: SalarySlipDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  const right = PAGE_WIDTH - MARGIN;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const columnGap = 8;
  const columnWidth = (contentWidth - columnGap) / 2;

  drawText(page, "SALARY SLIP", MARGIN, PAGE_HEIGHT - 36, bold, 16);
  drawText(page, slip.monthLabel, MARGIN, PAGE_HEIGHT - 52, regular, 11);

  drawRight(page, EMPLOYER.legalName, right, PAGE_HEIGHT - 24, bold, 8);
  drawRight(page, EMPLOYER.addressLine1, right, PAGE_HEIGHT - 35, regular, 7);
  drawRight(page, EMPLOYER.addressLine2, right, PAGE_HEIGHT - 45, regular, 7);
  drawRight(page, EMPLOYER.cin, right, PAGE_HEIGHT - 56, regular, 7);
  drawRight(page, EMPLOYER.pan, right, PAGE_HEIGHT - 66, regular, 7);
  drawRight(page, EMPLOYER.gstin, right, PAGE_HEIGHT - 76, regular, 7);

  rule(page, MARGIN, PAGE_HEIGHT - 86, right);

  const employeeRows: Array<[string, string]> = [
    ["Employee ID", slip.employeeCode || "-"],
    ["Employee Name", slip.employeeName],
    ["Designation", slip.role || "-"],
    ["Department", slip.organization || "-"],
    ["Date of Joining", displayDate(slip.dateOfJoining)],
    ["Employment Type", slip.empType || "-"],
    ["Phone", slip.phone || "-"],
  ];
  const payrollRows: Array<[string, string]> = [
    ["Pay Period", slip.periodLabel],
    ["Payslip No.", slip.slipNumber],
    ["Pay Frequency", "Monthly"],
    ["Loss of Pay Days", formatDays(slip.lossOfPayDays)],
    ["Bank Account", maskAccount(slip.accountNo, "")],
    ["IFSC", slip.ifsc || "-"],
    ["Email", slip.email || "-"],
  ];

  let top = PAGE_HEIGHT - 96;
  const detailsBottom = Math.min(
    drawDetailTable(page, fonts, MARGIN, top, columnWidth, "Employee Details", employeeRows),
    drawDetailTable(
      page,
      fonts,
      MARGIN + columnWidth + columnGap,
      top,
      columnWidth,
      "Payroll Details",
      payrollRows,
    ),
  );

  const earningRows = slip.components.map((component) => ({
    label: component.label,
    amount: money(component.amount),
  }));
  const netPay = Math.round((slip.gross - slip.lossOfPayAmount) * 100) / 100;
  const deductionRows = [
    {
      label: `Loss of Pay (${formatDays(slip.lossOfPayDays)} days)`,
      amount: money(slip.lossOfPayAmount),
    },
    ...Array.from({ length: Math.max(0, earningRows.length - 1) }, () => ({
      label: "",
      amount: "",
    })),
  ];

  top = detailsBottom - 10;
  const tablesBottom = Math.min(
    drawMoneyTable(
      page,
      fonts,
      MARGIN,
      top,
      columnWidth,
      "Earnings",
      earningRows,
      { label: "Total Earnings (Gross)", amount: money(slip.gross) },
    ),
    drawMoneyTable(
      page,
      fonts,
      MARGIN + columnWidth + columnGap,
      top,
      columnWidth,
      "Deductions",
      deductionRows,
      { label: "Total Deductions", amount: money(slip.lossOfPayAmount) },
    ),
  );

  top = tablesBottom - 10;
  const summaryRows: Array<[string, string]> = [
    ["Gross Salary (A)", money(slip.gross)],
    ["Total Deductions (B)", money(slip.lossOfPayAmount)],
    ["Net Pay (A - B)", money(netPay)],
  ];
  const noteRows: Array<[string, string]> = [
    ["Loss of pay days", formatDays(slip.lossOfPayDays)],
    ["Loss of pay amount", money(slip.lossOfPayAmount)],
    ["Net payable", money(netPay)],
  ];
  const summaryBottom = Math.min(
    drawDetailTable(page, fonts, MARGIN, top, columnWidth, "Salary Summary", summaryRows),
    drawDetailTable(
      page,
      fonts,
      MARGIN + columnWidth + columnGap,
      top,
      columnWidth,
      "Notes",
      noteRows,
    ),
  );

  const wordsTop = summaryBottom - 8;
  box(page, MARGIN, wordsTop - 28, contentWidth, 28);
  drawText(page, "Amount in Words:", MARGIN + 6, wordsTop - 12, bold, 8);
  drawText(page, rupeesInWords(netPay), MARGIN + 6, wordsTop - 23, regular, 8);

  const footerY = 36;
  rule(page, MARGIN, footerY + 22, right);
  drawText(
    page,
    "This is a computer-generated salary slip and does not require a signature.",
    MARGIN,
    footerY + 10,
    regular,
    7,
  );
  drawText(page, "For any queries, please contact the HR Department.", MARGIN, footerY, regular, 7);
  drawRight(page, "Authorised Signatory", right, footerY + 10, bold, 8);
  drawRight(page, EMPLOYER.legalName, right, footerY, regular, 7);

  return pdf.save();
}
