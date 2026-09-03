import Bookings from "@/models/booking";

type PaymentEntity = {
  id?: string;
  amount?: number;
  method?: string;
  created_at?: number;
};

/**
 * Keep booking travellerPayment in sync when a Razorpay payment-link event
 * is ingested via /api/razorpay/webhook (finance path).
 * Idempotent: safe if /api/payment-link/webhook already updated the booking.
 */
export async function syncBookingFromPaymentLink(params: {
  event: string;
  linkId?: string | null;
  payment?: PaymentEntity | null;
}): Promise<{ updated: boolean; reason?: string }> {
  const { event, linkId, payment } = params;
  if (!linkId) {
    return { updated: false, reason: "missing_link_id" };
  }

  const paidEvents = [
    "payment_link.paid",
    "payment_link.partially_paid",
    "payment.captured",
  ];
  const failedEvents = ["payment_link.expired", "payment_link.cancelled"];

  if (![...paidEvents, ...failedEvents].includes(event)) {
    return { updated: false, reason: "unsupported_event" };
  }

  let booking = await Bookings.findOne({
    "travellerPayment.guests.payments.linkId": linkId,
  });
  if (!booking) {
    booking = await Bookings.findOne({
      "travellerPayment.history.linkId": linkId,
    });
  }
  if (!booking) {
    return { updated: false, reason: "booking_not_found" };
  }

  const paymentId = payment?.id || "";
  const method = payment?.method || "razorpay";
  const amountPaid = payment?.amount ? payment.amount / 100 : 0;
  const createdAt = payment?.created_at
    ? new Date(payment.created_at * 1000)
    : new Date();

  if (failedEvents.includes(event)) {
    const historyIndex = booking.travellerPayment.history.findIndex(
      (h: { linkId?: string }) => h.linkId === linkId,
    );
    if (historyIndex !== -1) {
      booking.travellerPayment.history[historyIndex].status = "failed";
    }

    const guestIndex = booking.travellerPayment.guests.findIndex(
      (g: { payments?: Array<{ linkId?: string }> }) =>
        g.payments?.some((p) => p.linkId === linkId),
    );
    if (guestIndex !== -1) {
      const paymentIndex = booking.travellerPayment.guests[
        guestIndex
      ].payments.findIndex((p: { linkId?: string }) => p.linkId === linkId);
      if (paymentIndex !== -1) {
        booking.travellerPayment.guests[guestIndex].payments[
          paymentIndex
        ].status = "failed";
      }
    }

    booking.markModified("travellerPayment.guests");
    booking.markModified("travellerPayment.history");
    await booking.save();
    return { updated: true };
  }

  const guestIndex = booking.travellerPayment.guests.findIndex(
    (g: { payments?: Array<{ linkId?: string }> }) =>
      g.payments?.some((p) => p.linkId === linkId),
  );

  if (guestIndex !== -1) {
    const guest = booking.travellerPayment.guests[guestIndex];
    const paymentIndex = guest.payments.findIndex(
      (p: { linkId?: string }) => p.linkId === linkId,
    );

    if (paymentIndex !== -1) {
      const previousPaymentAmount = Number(
        guest.payments[paymentIndex].amount || 0,
      );
      const previousPaid = Number(guest.amountPaid || 0);
      const wasAlreadyPaid = guest.payments[paymentIndex].status === "paid";
      const nextAmount = amountPaid || previousPaymentAmount;

      booking.travellerPayment.guests[guestIndex].payments[paymentIndex] = {
        ...guest.payments[paymentIndex],
        status: "paid",
        paymentId,
        date: createdAt,
        method: method || guest.payments[paymentIndex].method,
        amount: nextAmount,
      };

      booking.travellerPayment.guests[guestIndex].amountPaid = wasAlreadyPaid
        ? previousPaid - previousPaymentAmount + nextAmount
        : previousPaid + nextAmount;

      const guestAmountPaid =
        booking.travellerPayment.guests[guestIndex].amountPaid;
      const guestAmountDue = Number(guest.amountDue || 0);
      if (guestAmountPaid >= guestAmountDue) {
        booking.travellerPayment.guests[guestIndex].status = "paid";
      } else if (guestAmountPaid > 0) {
        booking.travellerPayment.guests[guestIndex].status = "partial";
      } else {
        booking.travellerPayment.guests[guestIndex].status = "pending";
      }
    }
  }

  const historyIndex = booking.travellerPayment.history.findIndex(
    (h: { linkId?: string }) => h.linkId === linkId,
  );

  if (historyIndex !== -1) {
    booking.travellerPayment.history[historyIndex] = {
      ...booking.travellerPayment.history[historyIndex],
      status: "paid",
      paymentId,
      date: createdAt,
      method: method || booking.travellerPayment.history[historyIndex].method,
      amount: amountPaid || booking.travellerPayment.history[historyIndex].amount,
    };
  } else {
    const guestEmail =
      guestIndex !== -1
        ? booking.travellerPayment.guests[guestIndex].email
        : "";
    booking.travellerPayment.history.push({
      amount: amountPaid,
      date: createdAt,
      method,
      paidBy: guestEmail,
      linkId,
      paymentId,
      status: "paid",
    });
  }

  const totalPaid = booking.travellerPayment.history
    .filter((h: { status?: string }) => h.status === "paid")
    .reduce(
      (sum: number, h: { amount?: number }) => sum + (Number(h.amount) || 0),
      0,
    );

  booking.travellerPayment.amountReceived = totalPaid;
  const finalAmount = Number(booking.travellerPayment.finalAmount || 0);
  if (totalPaid === 0) {
    booking.travellerPayment.status = "pending";
  } else if (totalPaid < finalAmount) {
    booking.travellerPayment.status = "partial";
  } else {
    booking.travellerPayment.status = "paid";
  }

  booking.markModified("travellerPayment.guests");
  booking.markModified("travellerPayment.history");
  booking.markModified("travellerPayment");
  await booking.save();

  return { updated: true };
}
