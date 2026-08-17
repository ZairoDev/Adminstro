/**
 * Seed Finance test data
 *
 * Inserts sample FinancePayment records (and optionally matching bookings)
 * so you can walk through the Map → Generate Invoice → Send Invoice workflow
 * in a development environment.
 *
 * Usage:
 *   npm run seed:finance
 *
 * WARNING: Do NOT run against a production database.
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

// ---------------------------------------------------------------------------
// Bootstrap env
// ---------------------------------------------------------------------------
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set. Aborting seed.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------
import FinancePayment from "../models/financePayment.js";

// Booking model import (for adding matching test bookings)
async function getBookingsModel(): Promise<mongoose.Model<mongoose.Document>> {
  const mod = await import("../models/booking.js");
  return mod.default as mongoose.Model<mongoose.Document>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function razorpayId(prefix: string) {
  return `${prefix}_test${Math.random().toString(36).slice(2, 10)}`;
}

function isoDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const SEED_PAYMENTS = [
  /* 1 – captured payment, unmapped ---------------------------------------- */
  {
    paymentId: razorpayId("pay"),
    customerName: "Rahul Sharma",
    customerEmail: "rahul.sharma@example.com",
    customerPhone: "+919876543210",
    customerPhoneNormalized: "9876543210",
    amount: 25000,
    currency: "INR",
    status: "captured",
    method: "upi",
    upi: "rahul@oksbi",
    source: "webhook",
    mapped: false,
    lastEvent: "payment.captured",
    capturedAt: isoDate(2),
    createdAt: isoDate(2),
    rawPayload: { event: "payment.captured", source: "seed" },
  },

  /* 2 – payment_link paid, unmapped --------------------------------------- */
  {
    paymentLinkId: razorpayId("plink"),
    paymentId: razorpayId("pay"),
    customerName: "Priya Mehta",
    customerEmail: "priya.mehta@example.com",
    customerPhone: "+919123456789",
    customerPhoneNormalized: "9123456789",
    amount: 18000,
    currency: "INR",
    status: "paid",
    method: "card",
    source: "webhook",
    mapped: false,
    lastEvent: "payment_link.paid",
    paidAt: isoDate(1),
    createdAt: isoDate(3),
    shortUrl: "https://rzp.io/l/test-priya",
    rawPayload: { event: "payment_link.paid", source: "seed" },
  },

  /* 3 – split-candidate: two guests paying together ----------------------- */
  {
    paymentId: razorpayId("pay"),
    customerName: "Aditya Kumar",
    customerEmail: "aditya@example.com",
    customerPhone: "+917777888899",
    customerPhoneNormalized: "7777888899",
    amount: 40000,
    currency: "INR",
    status: "captured",
    method: "netbanking",
    bank: "HDFC",
    source: "webhook",
    mapped: false,
    lastEvent: "payment.captured",
    capturedAt: isoDate(0),
    createdAt: isoDate(0),
    rawPayload: { event: "payment.captured", source: "seed" },
  },

  /* 4 – failed payment ---------------------------------------------------- */
  {
    paymentId: razorpayId("pay"),
    customerName: "Neha Singh",
    customerEmail: "neha.singh@example.com",
    customerPhone: "+919900112233",
    customerPhoneNormalized: "9900112233",
    amount: 12000,
    currency: "INR",
    status: "failed",
    method: "card",
    source: "webhook",
    mapped: false,
    lastEvent: "payment.failed",
    failedAt: isoDate(1),
    createdAt: isoDate(1),
    rawPayload: { event: "payment.failed", source: "seed", error_code: "BAD_REQUEST_ERROR" },
  },

  /* 5 – partial payment candidate ----------------------------------------- */
  {
    paymentId: razorpayId("pay"),
    customerName: "Vikram Patel",
    customerEmail: "vikram.patel@example.com",
    customerPhone: "+918800990011",
    customerPhoneNormalized: "8800990011",
    amount: 10000,
    currency: "INR",
    status: "captured",
    method: "wallet",
    wallet: "PhonePe",
    source: "webhook",
    mapped: false,
    lastEvent: "payment.captured",
    capturedAt: isoDate(4),
    createdAt: isoDate(4),
    rawPayload: { event: "payment.captured", source: "seed" },
  },

  /* 6 – refunded ---------------------------------------------------------- */
  {
    paymentId: razorpayId("pay"),
    customerName: "Sunita Rao",
    customerEmail: "sunita.rao@example.com",
    customerPhone: "+916677889900",
    customerPhoneNormalized: "6677889900",
    amount: 8500,
    currency: "INR",
    status: "refunded",
    method: "upi",
    source: "webhook",
    mapped: false,
    lastEvent: "refund.processed",
    createdAt: isoDate(10),
    rawPayload: { event: "refund.processed", source: "seed" },
  },
];

// ---------------------------------------------------------------------------
// Seed bookings (minimal, for mapping tests)
// ---------------------------------------------------------------------------
const SEED_BOOKINGS = [
  {
    bookingId: "BK-SEED-001",
    propertyName: "Azure Villa, Goa",
    address: "Plot 12, Candolim Beach Road, Goa - 403515",
    status: "confirmed",
    travellerPayment: {
      guests: [
        {
          name: "Rahul Sharma",
          email: "rahul.sharma@example.com",
          phone: "+919876543210",
          amountDue: 25000,
          amountPaid: 0,
        },
      ],
    },
    checkIn: isoDate(-5),
    checkOut: isoDate(-10),
    createdAt: isoDate(30),
  },
  {
    bookingId: "BK-SEED-002",
    propertyName: "Serenity Heights, Manali",
    address: "Hadimba Temple Rd, Manali, HP - 175131",
    status: "confirmed",
    travellerPayment: {
      guests: [
        {
          name: "Priya Mehta",
          email: "priya.mehta@example.com",
          phone: "+919123456789",
          amountDue: 18000,
          amountPaid: 0,
        },
      ],
    },
    checkIn: isoDate(-3),
    checkOut: isoDate(-8),
    createdAt: isoDate(20),
  },
  {
    bookingId: "BK-SEED-003",
    propertyName: "Lakeview Cottage, Udaipur",
    address: "Lake Palace Rd, Udaipur, RJ - 313001",
    status: "confirmed",
    travellerPayment: {
      guests: [
        {
          name: "Aditya Kumar",
          email: "aditya@example.com",
          phone: "+917777888899",
          amountDue: 20000,
          amountPaid: 0,
        },
        {
          name: "Riya Desai",
          email: "riya.desai@example.com",
          phone: "+917000111222",
          amountDue: 20000,
          amountPaid: 0,
        },
      ],
    },
    checkIn: isoDate(-1),
    checkOut: isoDate(-4),
    createdAt: isoDate(15),
  },
  {
    bookingId: "BK-SEED-005",
    propertyName: "Spiti Valley Camp, Kaza",
    address: "Main Market, Kaza, HP - 172114",
    status: "confirmed",
    travellerPayment: {
      guests: [
        {
          name: "Vikram Patel",
          email: "vikram.patel@example.com",
          phone: "+918800990011",
          amountDue: 22000,
          amountPaid: 0,
        },
      ],
    },
    checkIn: isoDate(-7),
    checkOut: isoDate(-14),
    createdAt: isoDate(25),
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected.");

  const Bookings = await getBookingsModel();

  // Upsert bookings
  console.log("\nSeeding bookings…");
  for (const bk of SEED_BOOKINGS) {
    await Bookings.updateOne(
      { bookingId: bk.bookingId },
      { $setOnInsert: bk },
      { upsert: true },
    );
    console.log(`  → ${bk.bookingId} (${bk.propertyName})`);
  }

  // Upsert payments (skip existing by paymentId/paymentLinkId)
  console.log("\nSeeding FinancePayments…");
  for (const p of SEED_PAYMENTS) {
    const filter: Record<string, unknown> = {};
    if ("paymentId" in p && p.paymentId) filter.paymentId = p.paymentId;
    else if ("paymentLinkId" in p && p.paymentLinkId) filter.paymentLinkId = p.paymentLinkId;

    await FinancePayment.updateOne(filter, { $setOnInsert: p }, { upsert: true });
    console.log(`  → ${p.customerName} | ${p.currency} ${p.amount} | ${p.status}`);
  }

  console.log("\nDone. Test data seeded successfully.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
