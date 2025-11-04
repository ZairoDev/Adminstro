import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Bookings from "@/models/booking";

/* -------------------------------------------------------------------------- */
/*                                TYPE DEFINITIONS                            */
/* -------------------------------------------------------------------------- */

export type GuestPaymentData = {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  amount: number;
};

export type ManualPaymentRequest = {
  bookingId: string;
  paymentDate: string;
  notes?: string;
  paymentType: "full" | "partial" | "split";
  guests: GuestPaymentData[];
};

/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) ? date : null;
}

function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, "");
}

function validateGuestPayment(guest: Partial<GuestPaymentData>): {
  valid: boolean;
  error?: string;
} {
  if (!guest.name?.trim())
    return { valid: false, error: "Guest name is required" };
  if (!guest.email?.trim())
    return { valid: false, error: "Guest email is required" };
  if (!guest.phone?.trim())
    return { valid: false, error: "Guest phone is required" };
  if (!guest.idNumber?.trim())
    return { valid: false, error: "Guest ID number is required" };
  if (guest.amount === undefined || guest.amount === null)
    return { valid: false, error: "Amount is required" };
  if (typeof guest.amount !== "number" || guest.amount <= 0)
    return { valid: false, error: "Amount must be a positive number" };
  if (!validateEmail(guest.email))
    return { valid: false, error: `Invalid email format: ${guest.email}` };
  return { valid: true };
}

/* -------------------------------------------------------------------------- */
/*                                   ROUTE                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = (await req.json()) as ManualPaymentRequest;
    console.log("[Manual Payment] Received payload:", body);

    // --- VALIDATIONS ---
    const booking = await Bookings.findById(body.bookingId.trim());
    if (!booking)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (!booking.travellerPayment) {
      booking.travellerPayment = {
        finalAmount: 0,
        amountReceived: 0,
        paymentType: body.paymentType,
        status: "pending",
        guests: [],
        history: [],
      };
    }

    // validate paymentType
    const allowedTypes = ["full", "partial", "split"] as const;
    if (!allowedTypes.includes(body.paymentType)) {
      return NextResponse.json(
        { error: "Invalid paymentType" },
        { status: 400 }
      );
    }

    booking.travellerPayment.paymentType = body.paymentType;
    let totalAmountProcessed = 0;

    /* --------------------------- PROCESS GUEST PAYMENTS --------------------- */
    for (const guestData of body.guests) {
      // validate incoming guest payload
      const v = validateGuestPayment(guestData);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }

      const email = sanitizeString(guestData.email).toLowerCase();
      const name = sanitizeString(guestData.name);
      const phone = sanitizeString(guestData.phone);
      const idNumber = sanitizeString(guestData.idNumber);
      const amount = Math.round(guestData.amount * 100) / 100;

      // Find guest index
      const guestIndex = booking.travellerPayment.guests.findIndex(
        (g: any) => g.email?.toLowerCase() === email
      );

      let guestObj: any;
      if (guestIndex === -1) {
        // New guest
        guestObj = {
          name,
          email,
          phone,
          idNumber,
          amountDue: amount,
          amountPaid: 0,
          status: "pending",
          documents: [],
          payments: [],
        };
      } else {
        // Existing guest - create a fresh copy
        const existingGuest = booking.travellerPayment.guests[guestIndex];
        guestObj = {
          name: existingGuest.name || name,
          email: existingGuest.email || email,
          phone: existingGuest.phone || phone,
          idNumber: existingGuest.idNumber || idNumber,
          amountDue: Number(existingGuest.amountDue || 0),
          amountPaid: Number(existingGuest.amountPaid || 0),
          status: existingGuest.status || "pending",
          documents: existingGuest.documents || [],
          payments: Array.isArray(existingGuest.payments)
            ? [...existingGuest.payments]
            : [],
        };
      }

      // Check for duplicate payment
      const isDuplicate = guestObj.payments.some((p: any) => {
        return (
          p.amount === amount &&
          p.date &&
          Math.abs(
            new Date(p.date).getTime() - new Date(body.paymentDate).getTime()
          ) < 60000
        );
      });

      if (isDuplicate) {
        return NextResponse.json(
          { error: `Duplicate payment detected for ${guestObj.name}` },
          { status: 409 }
        );
      }

      const newPaymentId = `MANUAL-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const paymentDate = new Date(body.paymentDate);

      // Create payment entry
      const paymentEntry = {
        amount,
        date: paymentDate,
        method: "manual",
        paymentId: newPaymentId,
        status: "paid",
        paymentType: body.paymentType,
      };

      // Add payment to guest's payment array
      guestObj.payments.push(paymentEntry);

      // Update guest amounts
      guestObj.amountPaid = Number(guestObj.amountPaid) + amount;

      // If this is a new guest and amountDue wasn't set, set it now
      if (guestIndex === -1 && guestObj.amountDue === 0) {
        guestObj.amountDue = amount;
      }

      // Update guest status based on payment
      if (guestObj.amountPaid >= guestObj.amountDue) {
        guestObj.status = "paid";
      } else if (guestObj.amountPaid > 0) {
        guestObj.status = "partial";
      } else {
        guestObj.status = "pending";
      }

      // Update or add guest to array
      if (guestIndex === -1) {
        booking.travellerPayment.guests.push(guestObj);
      } else {
        booking.travellerPayment.guests[guestIndex] = guestObj;
      }

      // Add to history
      booking.travellerPayment.history.push({
        amount,
        date: paymentDate,
        method: "manual",
        paidBy: email, // Use email as identifier
        paymentId: newPaymentId,
        status: "paid",
        paymentType: body.paymentType,
      });

      totalAmountProcessed += amount;
    }

    /* -------------------------- UPDATE TRAVELLER STATUS --------------------- */
    const totalPaid = booking.travellerPayment.history
      .filter((h: any) => h.status === "paid")
      .reduce((sum: number, h: any) => sum + (h.amount || 0), 0);

    booking.travellerPayment.amountReceived = totalPaid;

    if (totalPaid === 0) {
      booking.travellerPayment.status = "pending";
    } else if (totalPaid < (booking.travellerPayment.finalAmount || 0)) {
      booking.travellerPayment.status = "partial";
    } else {
      booking.travellerPayment.status = "paid";
    }

    // Mark nested fields as modified for Mongoose
    booking.markModified("travellerPayment.guests");
    booking.markModified("travellerPayment.history");
    booking.markModified("travellerPayment");

    await booking.save();

    console.log(
      `[Manual Payment] Recorded ${body.guests.length} guest(s), total amount: €${totalAmountProcessed}`
    );

    return NextResponse.json({
      success: true,
      message: `Manual payment(s) recorded successfully for ${body.guests.length} guest(s)`,
      booking,
    });
  } catch (err: any) {
    console.error("[Manual Payment API Error]:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
