/**
 * Finance Invoice Mailer
 *
 * Self-contained nodemailer helper used exclusively by invoiceSendService.
 * Honors FINANCE_INVOICE_EMAIL_DRY_RUN=true for safe development/testing.
 */

import nodemailer from "nodemailer";
import type { FinanceInvoiceClassification } from "@/models/financeInvoice";

/* ------------------------------------------------------------------ */
/*  Transporter (lazy singleton)                                        */
/* ------------------------------------------------------------------ */

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER ?? process.env.EMAIL_USER ?? "",
        pass: process.env.GMAIL_APP_PASSWORD ?? process.env.EMAIL_PASSWORD ?? "",
      },
    });
  }
  return _transporter;
}

/* ------------------------------------------------------------------ */
/*  Email body builder                                                  */
/* ------------------------------------------------------------------ */

function buildEmailHtml(params: {
  guestName: string;
  invoiceNumber: string;
  amountBilled: number;
  currency: string;
  classification: FinanceInvoiceClassification;
  bookingId?: string;
  pendingAmount?: number;
  discountGiven?: number;
}): string {
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: params.currency,
      maximumFractionDigits: 2,
    }).format(n);

  let classificationNote = "";
  if (params.classification === "partial") {
    classificationNote = `<p style="color:#c0392b;font-weight:bold">This is a partial payment. Pending balance: <strong>${fmtCurrency(params.pendingAmount ?? 0)}</strong></p>`;
  } else if (params.classification === "split") {
    classificationNote = `<p>This invoice covers your portion of a shared booking payment.</p>`;
  } else if (params.discountGiven && params.discountGiven > 0) {
    classificationNote = `<p style="color:#27ae60">A discount of <strong>${fmtCurrency(params.discountGiven)}</strong> has been applied to your booking.</p>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#2c3e50;margin:0">Vacation Saga</h1>
    <p style="color:#7f8c8d;margin:4px 0">Create your own saga</p>
  </div>
  <div style="background:#f8f9fa;border-radius:8px;padding:24px;margin-bottom:24px">
    <h2 style="margin:0 0 16px">Invoice ${params.invoiceNumber}</h2>
    <p>Dear <strong>${params.guestName}</strong>,</p>
    <p>Thank you for your payment. Please find your invoice attached.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:8px;border:1px solid #dee2e6;background:#fff;font-weight:bold">Invoice Number</td>
        <td style="padding:8px;border:1px solid #dee2e6;background:#fff">${params.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #dee2e6;background:#fff;font-weight:bold">Amount</td>
        <td style="padding:8px;border:1px solid #dee2e6;background:#fff">${fmtCurrency(params.amountBilled)}</td>
      </tr>
      ${params.bookingId ? `<tr><td style="padding:8px;border:1px solid #dee2e6;background:#fff;font-weight:bold">Booking ID</td><td style="padding:8px;border:1px solid #dee2e6;background:#fff">${params.bookingId}</td></tr>` : ""}
    </table>
    ${classificationNote}
  </div>
  <p style="font-size:13px;color:#7f8c8d">
    For any queries, contact us at <a href="mailto:support@vacationsaga.com">support@vacationsaga.com</a>
    or visit <a href="https://www.vacationsaga.com">www.vacationsaga.com</a>
  </p>
  <hr style="border:none;border-top:1px solid #dee2e6;margin:16px 0">
  <p style="font-size:11px;color:#adb5bd;text-align:center">
    Zairo International Pvt Ltd · GSTIN: 09AABCZ0555F1ZC
  </p>
</body>
</html>`.trim();
}

/* ------------------------------------------------------------------ */
/*  Public API                                                          */
/* ------------------------------------------------------------------ */

export type SendInvoiceEmailParams = {
  to: string;
  guestName: string;
  invoiceNumber: string;
  amountBilled: number;
  currency: string;
  classification: FinanceInvoiceClassification;
  pdfBuffer: Buffer;
  bookingId?: string;
  pendingAmount?: number;
  discountGiven?: number;
};

export type SendInvoiceEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendInvoiceEmail(
  params: SendInvoiceEmailParams,
): Promise<SendInvoiceEmailResult> {
  const isDryRun = process.env.FINANCE_INVOICE_EMAIL_DRY_RUN === "true";

  if (isDryRun) {
    console.log(
      `[Finance Mailer][DRY RUN] Would send invoice ${params.invoiceNumber} to ${params.to}`,
    );
    return { success: true, messageId: `dry-run-${params.invoiceNumber}` };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Vacation Saga" <${process.env.GMAIL_USER ?? process.env.EMAIL_USER ?? ""}>`,
      to: params.to,
      subject: `Your Invoice ${params.invoiceNumber} from Vacation Saga`,
      html: buildEmailHtml({
        guestName: params.guestName,
        invoiceNumber: params.invoiceNumber,
        amountBilled: params.amountBilled,
        currency: params.currency,
        classification: params.classification,
        bookingId: params.bookingId,
        pendingAmount: params.pendingAmount,
        discountGiven: params.discountGiven,
      }),
      attachments: [
        {
          filename: `invoice-${params.invoiceNumber}.pdf`,
          content: params.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown mail error";
    console.error(`[Finance Mailer] Failed to send ${params.invoiceNumber}:`, error);
    return { success: false, error: message };
  }
}
