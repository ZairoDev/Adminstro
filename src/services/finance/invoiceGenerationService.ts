/**
 * Invoice Generation Service (Stage 2 of 3)
 *
 * Validates payment mapping, applies booking-ledger effects, creates
 * FinanceInvoice records and PDF data structures, but does NOT email anything.
 *
 * Called by POST /api/finance/generate-invoice.
 */

import type { FilterQuery } from "mongoose";
import FinancePayment, { type IFinancePayment } from "@/models/financePayment";
import FinanceInvoice, { type IFinanceInvoice } from "@/models/financeInvoice";
import { getNextFinanceInvoiceNumber } from "@/lib/finance/invoiceCounter";
import type { GenerateInvoiceBody } from "@/schemas/financePayment.schema";
import {
  applyCompletePayment,
  applyPartialPayment,
  applySplitPayments,
  getBookingInvoiceContext,
  type GuestLedgerSnapshot,
} from "@/services/finance/bookingLedgerService";

/* ------------------------------------------------------------------ */
/*  Public output shape                                                 */
/* ------------------------------------------------------------------ */

export type PublicFinanceInvoice = {
  id: string;
  invoiceNumber: string;
  financePaymentId: string | null;
  bookingId: string | null;
  guestId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  classification: string;
  amountBilled: number;
  currency: string;
  discountGiven: number | null;
  pendingAmount: number | null;
  splitGroupId: string | null;
  splitTotalAmount: number | null;
  amountDueSnapshot: number | null;
  status: string;
  generatedBy: string | null;
  generatedByName: string | null;
  notes: string | null;
  createdAt: Date;
};

export function toPublicInvoice(doc: IFinanceInvoice): PublicFinanceInvoice {
  return {
    id: String(doc._id),
    invoiceNumber: doc.invoiceNumber,
    financePaymentId: doc.financePaymentId ?? null,
    bookingId: doc.bookingId ?? null,
    guestId: doc.guestId ?? null,
    guestName: doc.guestName ?? null,
    guestEmail: doc.guestEmail ?? null,
    guestPhone: doc.guestPhone ?? null,
    classification: doc.classification,
    amountBilled: doc.amountBilled,
    currency: doc.currency,
    discountGiven: doc.discountGiven ?? null,
    pendingAmount: doc.pendingAmount ?? null,
    splitGroupId: doc.splitGroupId ?? null,
    splitTotalAmount: doc.splitTotalAmount ?? null,
    amountDueSnapshot: doc.amountDueSnapshot ?? null,
    status: doc.status,
    generatedBy: doc.generatedBy ?? null,
    generatedByName: doc.generatedByName ?? null,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function resolvePaymentFilter(params: {
  paymentId?: string;
  paymentLinkId?: string;
}): FilterQuery<IFinancePayment> {
  if (params.paymentId) return { paymentId: params.paymentId };
  if (params.paymentLinkId) return { paymentLinkId: params.paymentLinkId };
  throw new Error("paymentId or paymentLinkId is required");
}

async function markPreviousInvoicesSuperseded(financePaymentId: string): Promise<void> {
  await FinanceInvoice.updateMany(
    { financePaymentId, status: { $in: ["generated", "sent", "failed"] } },
    { $set: { status: "superseded" } },
  );
}

function resolveStayDates(params: {
  bookingCheckIn: Date | null;
  bookingCheckOut: Date | null;
  bodyCheckIn?: Date;
  bodyCheckOut?: Date;
}): { checkIn: Date; checkOut: Date } {
  const checkIn = params.bookingCheckIn ?? params.bodyCheckIn ?? null;
  const checkOut = params.bookingCheckOut ?? params.bodyCheckOut ?? null;

  if (!checkIn || !checkOut) {
    throw Object.assign(
      new Error(
        "Check-in and check-out dates are required. Provide them on the booking or when generating the invoice.",
      ),
      { status: 400, code: "MISSING_STAY_DATES" },
    );
  }

  if (checkOut.getTime() < checkIn.getTime()) {
    throw Object.assign(
      new Error("Check-out date must be on or after check-in date."),
      { status: 400, code: "INVALID_STAY_DATES" },
    );
  }

  return { checkIn, checkOut };
}

async function createInvoiceDoc(params: {
  financePaymentId: string;
  financePaymentObjectId: string;
  snapshot: GuestLedgerSnapshot;
  amountBilled: number;
  currency: string;
  classification: "complete" | "partial" | "split";
  discountGiven?: number;
  discountReason?: string;
  pendingAmount?: number;
  splitGroupId?: string;
  splitTotalAmount?: number;
  amountDueSnapshot?: number;
  generatedBy?: string;
  generatedByName?: string;
  notes?: string;
  bookingId?: string;
  propertyName?: string;
  propertyAddress?: string;
  checkIn?: Date;
  checkOut?: Date;
}): Promise<IFinanceInvoice> {
  const invoiceNumber = await getNextFinanceInvoiceNumber();
  return await FinanceInvoice.create({
    invoiceNumber,
    financePaymentId: params.financePaymentId,
    financePaymentObjectId: params.financePaymentObjectId,
    bookingObjectId: params.snapshot.guestId, // overridden below
    bookingId: params.bookingId,
    guestId: params.snapshot.guestId,
    guestName: params.snapshot.guestName,
    guestEmail: params.snapshot.guestEmail,
    guestPhone: params.snapshot.guestPhone,
    classification: params.classification,
    amountBilled: params.amountBilled,
    currency: params.currency,
    discountGiven: params.discountGiven,
    discountReason: params.discountReason,
    pendingAmount: params.pendingAmount,
    splitGroupId: params.splitGroupId,
    splitTotalAmount: params.splitTotalAmount,
    amountDueSnapshot: params.amountDueSnapshot,
    status: "generated",
    generatedBy: params.generatedBy,
    generatedByName: params.generatedByName,
    notes: params.notes,
    propertyName: params.propertyName,
    propertyAddress: params.propertyAddress,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
  });
}

/* ------------------------------------------------------------------ */
/*  Main service function                                               */
/* ------------------------------------------------------------------ */

export async function generateInvoice(
  body: GenerateInvoiceBody,
  auth: { id?: string; name?: string },
): Promise<{ payment: IFinancePayment; invoices: PublicFinanceInvoice[] }> {
  const filter = resolvePaymentFilter(body);
  const payment = await FinancePayment.findOne(filter);
  if (!payment) throw new Error("Payment not found");

  // Step 1: Must be mapped before generating an invoice
  if (!payment.mapped) {
    throw Object.assign(
      new Error("Payment must be mapped to a booking before generating an invoice"),
      { status: 400, code: "NOT_MAPPED" },
    );
  }

  // Step 2: Guard against accidental regeneration
  if (payment.invoiceStatus !== "not_generated" && !body.regenerate) {
    throw Object.assign(
      new Error(
        `Invoice already ${payment.invoiceStatus}. Pass regenerate=true to regenerate.`,
      ),
      { status: 409, code: "INVOICE_EXISTS" },
    );
  }

  // Step 3: Mark previous invoices as superseded if regenerating
  const financePaymentId = payment.paymentId ?? payment.paymentLinkId ?? String(payment._id);
  if (body.regenerate && payment.invoiceNumbers?.length) {
    await markPreviousInvoicesSuperseded(financePaymentId);
  }

  const currency = payment.currency ?? "INR";
  const bookingObjectId = payment.bookingObjectId ?? "";
  const bookingId = payment.bookingId ?? "";
  const paymentId = payment.paymentId;
  const paymentLinkId = payment.paymentLinkId;

  if (!bookingId) {
    throw Object.assign(new Error("Payment has no booking linked"), {
      status: 400,
      code: "NO_BOOKING",
    });
  }

  const bookingContext = await getBookingInvoiceContext(bookingId);
  const { checkIn, checkOut } = resolveStayDates({
    bookingCheckIn: bookingContext.checkIn,
    bookingCheckOut: bookingContext.checkOut,
    bodyCheckIn: body.checkIn,
    bodyCheckOut: body.checkOut,
  });

  const propertyName = bookingContext.propertyName ?? undefined;
  const propertyAddress = bookingContext.propertyAddress ?? undefined;

  const invoiceDocs: IFinanceInvoice[] = [];

  /* ---- Complete ---- */
  if (body.classification === "complete") {
    if (!payment.guestId) {
      throw new Error("No guest mapped to this payment. Map a primary guest first.");
    }

    const snapshot = await applyCompletePayment({
      bookingObjectId,
      guestId: payment.guestId,
      paidAmount: payment.amount,
      paymentId,
      paymentLinkId,
      discountReason: body.discountReason,
    });

    const inv = await createInvoiceDoc({
      financePaymentId,
      financePaymentObjectId: String(payment._id),
      snapshot,
      amountBilled: payment.amount,
      currency,
      classification: "complete",
      discountGiven: snapshot.discountGiven > 0 ? snapshot.discountGiven : undefined,
      discountReason: body.discountReason,
      amountDueSnapshot: snapshot.amountDue + snapshot.discountGiven,
      generatedBy: auth.id,
      generatedByName: auth.name,
      notes: body.notes,
      bookingId,
      propertyName,
      propertyAddress,
      checkIn,
      checkOut,
    });
    invoiceDocs.push(inv);

    payment.discountGiven = snapshot.discountGiven;
    payment.paymentClassification = "complete";

  /* ---- Partial ---- */
  } else if (body.classification === "partial") {
    if (!payment.guestId) {
      throw new Error("No guest mapped to this payment. Map a primary guest first.");
    }

    const snapshot = await applyPartialPayment({
      bookingObjectId,
      guestId: payment.guestId,
      paidAmount: payment.amount,
      paymentId,
      paymentLinkId,
    });

    const inv = await createInvoiceDoc({
      financePaymentId,
      financePaymentObjectId: String(payment._id),
      snapshot,
      amountBilled: payment.amount,
      currency,
      classification: "partial",
      pendingAmount: snapshot.pendingAmount,
      amountDueSnapshot: snapshot.amountDue,
      generatedBy: auth.id,
      generatedByName: auth.name,
      notes: body.notes,
      bookingId,
      propertyName,
      propertyAddress,
      checkIn,
      checkOut,
    });
    invoiceDocs.push(inv);

    payment.pendingAmount = snapshot.pendingAmount;
    payment.paymentClassification = "partial";

  /* ---- Split ---- */
  } else if (body.classification === "split") {
    const { splitAllocations } = body;

    const result = await applySplitPayments({
      bookingObjectId,
      bookingId,
      allocations: splitAllocations,
      totalAmount: payment.amount,
      paymentId,
      paymentLinkId,
    });

    const splitGroupId = result.splitGroupId;

    for (const snapshot of result.snapshots) {
      const allocation = splitAllocations.find(
        (a) =>
          a.guestId === snapshot.guestId ||
          a.email?.toLowerCase() === snapshot.guestEmail?.toLowerCase(),
      );

      const inv = await createInvoiceDoc({
        financePaymentId,
        financePaymentObjectId: String(payment._id),
        snapshot,
        amountBilled: allocation?.amount ?? snapshot.amountPaid,
        currency,
        classification: "split",
        splitGroupId,
        splitTotalAmount: payment.amount,
        amountDueSnapshot: snapshot.amountDue,
        generatedBy: auth.id,
        generatedByName: auth.name,
        notes: body.notes,
        bookingId,
        propertyName,
        propertyAddress,
        checkIn,
        checkOut,
      });
      invoiceDocs.push(inv);
    }

    payment.paymentClassification = "split";
    payment.splitAllocations = result.snapshots.map((s) => ({
      guestId: s.guestId,
      guestName: s.guestName,
      guestEmail: s.guestEmail,
      amount: s.amountPaid,
    }));
  }

  // Step 5: Update FinancePayment
  payment.invoiceStatus = "generated";
  payment.invoiceIds = invoiceDocs.map((inv) => String(inv._id));
  payment.invoiceNumbers = invoiceDocs.map((inv) => inv.invoiceNumber);

  await payment.save();

  return {
    payment,
    invoices: invoiceDocs.map(toPublicInvoice),
  };
}

/* ------------------------------------------------------------------ */
/*  Fetch invoices for a payment (used by transaction details page)     */
/* ------------------------------------------------------------------ */

export async function getInvoicesForPayment(params: {
  paymentId?: string | null;
  paymentLinkId?: string | null;
}): Promise<PublicFinanceInvoice[]> {
  const financePaymentId = params.paymentId ?? params.paymentLinkId;
  if (!financePaymentId) return [];
  const docs = await FinanceInvoice.find({ financePaymentId }).sort({ createdAt: 1 }).lean();
  return (docs as unknown as IFinanceInvoice[]).map(toPublicInvoice);
}
