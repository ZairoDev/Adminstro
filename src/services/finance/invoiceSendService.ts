/**
 * Invoice Send Service (Stage 3 of 3)
 *
 * Emails already-generated FinanceInvoice PDFs to their recipients.
 * Does NOT modify the booking ledger or create new invoice records.
 * Each send attempt is independently tracked per invoice.
 *
 * Called by POST /api/finance/send-invoice.
 */

import type { FilterQuery } from "mongoose";
import FinancePayment, { type IFinancePayment } from "@/models/financePayment";
import FinanceInvoice, { type IFinanceInvoice } from "@/models/financeInvoice";
import { generateFinanceInvoicePdf } from "@/services/finance/financeInvoicePdf";
import { sendInvoiceEmail } from "@/services/finance/financeInvoiceMailer";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type SendInvoiceResult = {
  invoiceNumber: string;
  to: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
  messageId?: string;
};

/* ------------------------------------------------------------------ */
/*  Main service                                                        */
/* ------------------------------------------------------------------ */

export async function sendInvoices(
  params: {
    paymentId?: string;
    paymentLinkId?: string;
    invoiceNumbers?: string[];
  },
  auth: { id?: string; name?: string },
): Promise<{ results: SendInvoiceResult[]; payment: IFinancePayment }> {
  const filter: FilterQuery<IFinancePayment> = {};
  if (params.paymentId) filter.paymentId = params.paymentId;
  else if (params.paymentLinkId) filter.paymentLinkId = params.paymentLinkId;
  else throw new Error("paymentId or paymentLinkId is required");

  const payment = await FinancePayment.findOne(filter);
  if (!payment) throw new Error("Payment not found");

  if (payment.invoiceStatus === "not_generated") {
    throw Object.assign(
      new Error("No invoices have been generated for this payment yet"),
      { status: 400, code: "NO_INVOICES" },
    );
  }

  // Load target invoices
  const financePaymentId = payment.paymentId ?? payment.paymentLinkId ?? String(payment._id);
  const invoiceFilter: FilterQuery<IFinanceInvoice> = {
    financePaymentId,
    status: { $in: ["generated", "failed"] },
  };
  if (params.invoiceNumbers?.length) {
    invoiceFilter.invoiceNumber = { $in: params.invoiceNumbers };
  }

  const invoices = await FinanceInvoice.find(invoiceFilter);
  if (invoices.length === 0) {
    throw Object.assign(
      new Error("No sendable invoices found (all may already be sent or superseded)"),
      { status: 404, code: "NOTHING_TO_SEND" },
    );
  }

  const results: SendInvoiceResult[] = [];

  for (const inv of invoices) {
    const to = inv.guestEmail ?? "";
    if (!to) {
      results.push({
        invoiceNumber: inv.invoiceNumber,
        to: "",
        status: "skipped",
        error: "No guest email on invoice",
      });
      continue;
    }

    // Regenerate PDF on demand
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateFinanceInvoicePdf({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.createdAt,
        classification: inv.classification,
        guestName: inv.guestName ?? "—",
        guestEmail: to,
        guestPhone: inv.guestPhone,
        bookingId: inv.bookingId,
        propertyName: inv.propertyName,
        propertyAddress: inv.propertyAddress,
        checkIn: inv.checkIn,
        checkOut: inv.checkOut,
        amountBilled: inv.amountBilled,
        currency: inv.currency,
        discountGiven: inv.discountGiven,
        pendingAmount: inv.pendingAmount,
        splitTotalAmount: inv.splitTotalAmount,
        notes: inv.notes,
      });
    } catch (pdfErr) {
      const msg = pdfErr instanceof Error ? pdfErr.message : "PDF generation failed";
      inv.status = "failed";
      inv.emailError = msg;
      await inv.save();
      results.push({ invoiceNumber: inv.invoiceNumber, to, status: "failed", error: msg });
      continue;
    }

    // Send email
    const emailResult = await sendInvoiceEmail({
      to,
      guestName: inv.guestName ?? "Valued Customer",
      invoiceNumber: inv.invoiceNumber,
      amountBilled: inv.amountBilled,
      currency: inv.currency,
      classification: inv.classification,
      pdfBuffer,
      bookingId: inv.bookingId,
      pendingAmount: inv.pendingAmount ?? undefined,
      discountGiven: inv.discountGiven ?? undefined,
    });

    if (emailResult.success) {
      inv.status = "sent";
      inv.emailedAt = new Date();
      inv.emailError = undefined;
      inv.sentBy = auth.id;
      inv.sentByName = auth.name;
      await inv.save();
      results.push({
        invoiceNumber: inv.invoiceNumber,
        to,
        status: "sent",
        messageId: emailResult.messageId,
      });
    } else {
      inv.status = "failed";
      inv.emailError = emailResult.error;
      await inv.save();
      results.push({
        invoiceNumber: inv.invoiceNumber,
        to,
        status: "failed",
        error: emailResult.error,
      });
    }
  }

  // Roll up invoiceStatus on the payment record
  const allInvoices = await FinanceInvoice.find({
    financePaymentId,
    status: { $ne: "superseded" },
  }).select("status");

  const allSent = allInvoices.length > 0 && allInvoices.every((i) => i.status === "sent");
  if (allSent) {
    payment.invoiceStatus = "sent";
  } else if (results.some((r) => r.status === "failed")) {
    // Keep "generated" so Finance knows some sends need retrying
    payment.invoiceStatus = "generated";
  }
  await payment.save();

  return { results, payment };
}
