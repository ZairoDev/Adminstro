/**
 * Booking Ledger Service
 *
 * Applies payment consequences (Complete / Partial / Split) to the Booking's
 * travellerPayment.guests[] and history[] subdocuments, then calls booking.save()
 * to trigger the existing pre-save hook that recomputes amountPaid / status totals.
 *
 * This service is ONLY called from invoiceGenerationService — never directly from
 * the mapping step or webhook processing.
 */

import Bookings from "@/models/booking";
import {
  computeCompleteAdjustment,
  computePendingAmount,
  validateSplitAllocations,
  type SplitAllocationInput,
} from "@/lib/finance/paymentMath";
import { normalizePhone } from "@/lib/finance/phone";

/* ------------------------------------------------------------------ */
/*  Shared types                                                        */
/* ------------------------------------------------------------------ */

export type GuestLedgerSnapshot = {
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  amountDue: number;
  amountPaid: number;
  discountGiven: number;
  pendingAmount: number;
  status: string;
};

type BookingGuestDoc = {
  _id?: { toString(): string };
  name?: string;
  email?: string;
  phone?: string;
  amountDue?: number;
  amountPaid?: number;
  discountGiven?: number;
  discountReason?: string;
  status?: string;
  payments?: unknown[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findGuestByIdOrEmail(
  guests: BookingGuestDoc[],
  guestId: string,
): BookingGuestDoc | undefined {
  return (
    guests.find((g) => g._id?.toString() === guestId) ??
    guests.find((g) => `${g.email}-${g.phone}` === guestId || g.email === guestId)
  );
}

function toSnapshot(g: BookingGuestDoc, pendingAmount = 0): GuestLedgerSnapshot {
  return {
    guestId: g._id?.toString() ?? "",
    guestName: g.name ?? "",
    guestEmail: g.email ?? "",
    guestPhone: g.phone ?? "",
    amountDue: Number(g.amountDue ?? 0),
    amountPaid: Number(g.amountPaid ?? 0),
    discountGiven: Number(g.discountGiven ?? 0),
    pendingAmount,
    status: g.status ?? "pending",
  };
}

/* ------------------------------------------------------------------ */
/*  Complete payment                                                    */
/* ------------------------------------------------------------------ */

export async function applyCompletePayment(params: {
  bookingObjectId: string;
  guestId: string;
  paidAmount: number;
  paymentId?: string;
  paymentLinkId?: string;
  discountReason?: string;
}): Promise<GuestLedgerSnapshot> {
  const booking = await Bookings.findById(params.bookingObjectId);
  if (!booking) throw new Error(`Booking not found: ${params.bookingObjectId}`);

  const guests = (booking.travellerPayment?.guests ?? []) as BookingGuestDoc[];
  const guest = findGuestByIdOrEmail(guests, params.guestId);
  if (!guest) throw new Error(`Guest not found on booking: ${params.guestId}`);

  const email = guest.email?.toLowerCase().trim() ?? "";
  const originalAmountDue = Number(guest.amountDue ?? 0);
  const adj = computeCompleteAdjustment(originalAmountDue, params.paidAmount);

  if (adj.discountGiven > 0) {
    guest.amountDue = adj.newAmountDue;
    guest.discountGiven = (Number(guest.discountGiven ?? 0)) + adj.discountGiven;
    if (params.discountReason) guest.discountReason = params.discountReason;
  }

  booking.travellerPayment.history.push({
    amount: params.paidAmount,
    date: new Date(),
    method: "razorpay-finance",
    paidBy: email,
    linkId: params.paymentLinkId,
    paymentId: params.paymentId ?? `FIN-COMPLETE-${Date.now()}`,
    status: "paid",
  });

  booking.markModified("travellerPayment.guests");
  booking.markModified("travellerPayment.history");
  booking.markModified("travellerPayment");
  await booking.save();

  const updated = (booking.travellerPayment?.guests ?? []) as BookingGuestDoc[];
  const updatedGuest = findGuestByIdOrEmail(updated, params.guestId);

  return toSnapshot(updatedGuest ?? guest, 0);
}

/* ------------------------------------------------------------------ */
/*  Partial payment                                                     */
/* ------------------------------------------------------------------ */

export async function applyPartialPayment(params: {
  bookingObjectId: string;
  guestId: string;
  paidAmount: number;
  paymentId?: string;
  paymentLinkId?: string;
}): Promise<GuestLedgerSnapshot> {
  const booking = await Bookings.findById(params.bookingObjectId);
  if (!booking) throw new Error(`Booking not found: ${params.bookingObjectId}`);

  const guests = (booking.travellerPayment?.guests ?? []) as BookingGuestDoc[];
  const guest = findGuestByIdOrEmail(guests, params.guestId);
  if (!guest) throw new Error(`Guest not found on booking: ${params.guestId}`);

  const email = guest.email?.toLowerCase().trim() ?? "";

  booking.travellerPayment.history.push({
    amount: params.paidAmount,
    date: new Date(),
    method: "razorpay-finance",
    paidBy: email,
    linkId: params.paymentLinkId,
    paymentId: params.paymentId ?? `FIN-PARTIAL-${Date.now()}`,
    status: "paid",
  });

  booking.markModified("travellerPayment.history");
  booking.markModified("travellerPayment");
  await booking.save();

  const updated = (booking.travellerPayment?.guests ?? []) as BookingGuestDoc[];
  const updatedGuest = findGuestByIdOrEmail(updated, params.guestId);
  const g = updatedGuest ?? guest;
  const pending = computePendingAmount(Number(g.amountDue ?? 0), Number(g.amountPaid ?? 0));

  return toSnapshot(g, pending);
}

/* ------------------------------------------------------------------ */
/*  Split payment                                                       */
/* ------------------------------------------------------------------ */

export type SplitLedgerResult = {
  snapshots: GuestLedgerSnapshot[];
  splitGroupId: string;
  totalAmount: number;
};

export async function applySplitPayments(params: {
  bookingObjectId: string;
  bookingId: string;
  allocations: SplitAllocationInput[];
  totalAmount: number;
  paymentId?: string;
  paymentLinkId?: string;
}): Promise<SplitLedgerResult> {
  const validation = validateSplitAllocations(params.allocations, params.totalAmount);
  if (!validation.valid) {
    throw new Error(validation.message ?? "Invalid split allocations");
  }

  const booking = await Bookings.findById(params.bookingObjectId);
  if (!booking) throw new Error(`Booking not found: ${params.bookingObjectId}`);

  const guests = (booking.travellerPayment?.guests ?? []) as BookingGuestDoc[];
  const splitGroupId = params.paymentId ?? params.paymentLinkId ?? `SPLIT-${Date.now()}`;
  const snapshots: GuestLedgerSnapshot[] = [];

  for (const allocation of params.allocations) {
    let guestObj: BookingGuestDoc | undefined;

    if (allocation.guestId) {
      guestObj = findGuestByIdOrEmail(guests, allocation.guestId);
    }

    if (!guestObj && allocation.email) {
      const emailNorm = allocation.email.toLowerCase().trim();
      guestObj = guests.find((g) => g.email?.toLowerCase().trim() === emailNorm);
    }

    if (!guestObj && allocation.phone) {
      const phoneNorm = normalizePhone(allocation.phone);
      if (phoneNorm) {
        guestObj = guests.find((g) => {
          const gNorm = normalizePhone(g.phone ?? "");
          return gNorm && gNorm.endsWith(phoneNorm.slice(-10));
        });
      }
    }

    if (!guestObj) {
      // New person — append to guests array
      if (!allocation.email) {
        throw new Error(
          `Email is required for new split recipient: ${allocation.name ?? "unnamed"}`,
        );
      }
      const newGuest: BookingGuestDoc = {
        name: allocation.name ?? allocation.email,
        email: allocation.email.toLowerCase().trim(),
        phone: allocation.phone ?? "",
        amountDue: allocation.amount,
        amountPaid: 0,
        status: "pending",
        payments: [],
      };
      booking.travellerPayment.guests.push(newGuest);
      const refreshed = booking.travellerPayment.guests as BookingGuestDoc[];
      guestObj = refreshed[refreshed.length - 1];
    }

    const email = guestObj.email?.toLowerCase().trim() ?? "";

    booking.travellerPayment.history.push({
      amount: allocation.amount,
      date: new Date(),
      method: "razorpay-finance",
      paidBy: email,
      linkId: params.paymentLinkId,
      paymentId: params.paymentId ?? `FIN-SPLIT-${Date.now()}-${escapeRegex(email)}`,
      status: "paid",
    });

    snapshots.push({
      guestId: guestObj._id?.toString() ?? email,
      guestName: guestObj.name ?? "",
      guestEmail: email,
      guestPhone: guestObj.phone ?? "",
      amountDue: Number(guestObj.amountDue ?? 0),
      amountPaid: allocation.amount,
      discountGiven: 0,
      pendingAmount: 0,
      status: "partial",
    });
  }

  booking.markModified("travellerPayment.guests");
  booking.markModified("travellerPayment.history");
  booking.markModified("travellerPayment");
  await booking.save();

  return { snapshots, splitGroupId, totalAmount: params.totalAmount };
}

/* ------------------------------------------------------------------ */
/*  Read-only: list guests on a booking (for split allocation UI)       */
/* ------------------------------------------------------------------ */

export async function getBookingGuests(bookingId: string): Promise<
  Array<{
    guestId: string;
    name: string;
    email: string;
    phone: string;
    amountDue: number;
    amountPaid: number;
    pendingAmount: number;
    status: string;
  }>
> {
  const ctx = await getBookingInvoiceContext(bookingId);
  return ctx.guests;
}

export type BookingInvoiceContext = {
  bookingId: string;
  propertyName: string | null;
  propertyAddress: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: Array<{
    guestId: string;
    name: string;
    email: string;
    phone: string;
    amountDue: number;
    amountPaid: number;
    pendingAmount: number;
    status: string;
  }>;
};

function parseBookingStayDate(field?: { date?: Date | string | null } | null): Date | null {
  if (!field?.date) return null;
  const d = field.date instanceof Date ? field.date : new Date(field.date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Booking details needed for invoice generation (guests + stay dates + property). */
export async function getBookingInvoiceContext(bookingId: string): Promise<BookingInvoiceContext> {
  const booking = await Bookings.findOne({
    $or: [
      { bookingId },
      ...(bookingId.match(/^[a-f\d]{24}$/i) ? [{ _id: bookingId }] : []),
    ],
  })
    .select("bookingId propertyName address checkIn checkOut travellerPayment.guests")
    .lean();

  if (!booking) throw new Error(`Booking not found: ${bookingId}`);

  const doc = booking as {
    bookingId?: string;
    propertyName?: string;
    address?: string;
    checkIn?: { date?: Date | string };
    checkOut?: { date?: Date | string };
    travellerPayment?: { guests?: BookingGuestDoc[] };
  };

  const guests = (doc.travellerPayment?.guests ?? []).map((g) => {
    const due = Number(g.amountDue ?? 0);
    const paid = Number(g.amountPaid ?? 0);
    return {
      guestId: g._id?.toString() ?? `${g.email}-${g.phone}`,
      name: g.name ?? "",
      email: g.email ?? "",
      phone: g.phone ?? "",
      amountDue: due,
      amountPaid: paid,
      pendingAmount: computePendingAmount(due, paid),
      status: g.status ?? "pending",
    };
  });

  return {
    bookingId: doc.bookingId ?? bookingId,
    propertyName: doc.propertyName ?? null,
    propertyAddress: doc.address ?? null,
    checkIn: parseBookingStayDate(doc.checkIn),
    checkOut: parseBookingStayDate(doc.checkOut),
    guests,
  };
}
