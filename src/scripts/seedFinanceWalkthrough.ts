/**
 * End-to-end Finance walkthrough
 *
 * Creates a real Lead → Visit → Booking → Razorpay payment, then optionally
 * runs Map → Generate Invoice → Send (dry-run) so you can follow the full path.
 *
 * Usage:
 *   npm run seed:finance-walkthrough
 *   npm run seed:finance-walkthrough:auto          # map + generate invoice
 *   npm run seed:finance-walkthrough:auto -- --send  # also send email (dry-run unless SMTP ready)
 *
 * WARNING: Do NOT run against a production database.
 */

import "dotenv/config";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { connectDb } from "../util/db.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const args = process.argv.slice(2);
const AUTO = args.includes("--auto");
const REAL_SEND = args.includes("--send");

const TAG = `WALK-${Date.now().toString(36).toUpperCase()}`;
const CREATED_BY = "finance-walkthrough@seed.local";

const PERSON = {
  name: "Aarav Kapoor",
  email: "aarav.kapoor.walkthrough@example.com",
  phone: "+919811223344",
  phoneNormalized: "9811223344",
  phoneNo: "9811223344",
};

const AMOUNT = 27500;
const PROPERTY = "Palm Grove Stay, Goa";
const ADDRESS = "H.No 42, Calangute Beach Road, Goa 403516";

function step(n: number, title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  STEP ${n}: ${title}`);
  console.log(`${"─".repeat(60)}`);
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function info(msg: string) {
  console.log(`  → ${msg}`);
}

async function main() {
  console.log("\nFinance E2E Walkthrough");
  console.log(`Tag: ${TAG}`);
  console.log(
    `Mode: ${
      AUTO
        ? REAL_SEND
          ? "auto + send email"
          : "auto (map + generate; pass --send to email)"
        : "seed only (manual UI steps)"
    }`,
  );

  // Only force dry-run when explicitly sending without real SMTP intent.
  // (Send is optional in auto mode.)
  if (REAL_SEND && process.env.FINANCE_INVOICE_EMAIL_DRY_RUN !== "false") {
    process.env.FINANCE_INVOICE_EMAIL_DRY_RUN = "true";
  }

  if (!process.env.MONGO_DB_URL && !process.env.MONGODB_URI) {
    console.error("MONGO_DB_URL (or MONGODB_URI) not set. Aborting.");
    process.exit(1);
  }
  if (!process.env.MONGO_DB_URL && process.env.MONGODB_URI) {
    process.env.MONGO_DB_URL = process.env.MONGODB_URI;
  }

  await connectDb();
  ok("Connected to MongoDB");

  const Query = (await import("../models/query.js")).default;
  const Visits = (await import("../models/visit.js")).default;
  const Bookings = (await import("../models/booking.js")).default;
  const FinancePayment = (await import("../models/financePayment.js")).default;

  // ─── STEP 1: Lead ─────────────────────────────────────────────────────
  step(1, "Create Lead (Query)");

  const lead = await Query.create({
    name: PERSON.name,
    email: PERSON.email,
    phoneNo: PERSON.phoneNo,
    duration: "1 Month",
    startDate: "07/28/2026",
    endDate: "08/28/2026",
    guest: 1,
    minBudget: 20000,
    maxBudget: 35000,
    noOfBeds: 1,
    location: "goa",
    area: "Calangute",
    bookingTerm: "Short Term",
    propertyType: "Furnished",
    priority: "High",
    leadStatus: "fresh",
    createdBy: CREATED_BY,
    note: `Seeded by finance walkthrough ${TAG}`,
  });
  ok(`Lead created: ${PERSON.name}`);
  info(`Lead ObjectId: ${String(lead._id)}`);
  info(`Phone: ${PERSON.phoneNo} (used for payment matching)`);

  // ─── STEP 2: Visit ────────────────────────────────────────────────────
  step(2, "Create Visit (linked to lead)");

  const visit = await Visits.create({
    lead: lead._id,
    ownerName: "Meera Fernandes",
    ownerEmail: "owner.walkthrough@example.com",
    agentName: "Seed Agent",
    agentPhone: "9000000001",
    pitchAmount: AMOUNT,
    ownerCommission: 0,
    travellerCommission: AMOUNT,
    agentCommission: 0,
    documentationCharges: 0,
    schedule: [{ date: new Date(), time: "11:00" }],
    visitStatus: "completed",
    createdBy: CREATED_BY,
  });
  ok(`Visit created: ${String(visit._id)}`);

  // ─── STEP 3: Booking + guest ──────────────────────────────────────────
  step(3, "Create Booking with guest amount due");

  // Keep bookingId counter ahead of any existing BI-* docs (avoids E11000)
  const Counter =
    mongoose.models.counters ||
    mongoose.model("counters", new mongoose.Schema({ id: String, seq: Number }));
  const maxAgg = await Bookings.aggregate<{ maxSeq: number }>([
    { $match: { bookingId: { $regex: /^BI-\d+$/ } } },
    {
      $project: {
        seqNum: {
          $convert: {
            input: { $substrBytes: ["$bookingId", 3, 20] },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $group: { _id: null, maxSeq: { $max: "$seqNum" } } },
  ]);
  const latestSeq = maxAgg[0]?.maxSeq ?? 0;
  const counterDoc = await Counter.findOne({ id: "bookingId" }).lean<{ seq?: number }>();
  const currentSeq = counterDoc?.seq ?? 0;
  if (latestSeq >= currentSeq) {
    await Counter.findOneAndUpdate(
      { id: "bookingId" },
      { $set: { seq: latestSeq } },
      { upsert: true },
    );
    info(`Synced bookingId counter to ${latestSeq}`);
  }

  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 3);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 7);

  const booking = await Bookings.create({
    lead: lead._id,
    visit: visit._id,
    checkIn: { date: checkIn, time: "14:00" },
    checkOut: { date: checkOut, time: "11:00" },
    propertyName: PROPERTY,
    address: ADDRESS,
    createdBy: CREATED_BY,
    travellerPayment: {
      finalAmount: AMOUNT,
      amountReceived: 0,
      paymentType: "full",
      status: "pending",
      guests: [
        {
          name: PERSON.name,
          email: PERSON.email,
          phone: PERSON.phone,
          amountDue: AMOUNT,
          amountPaid: 0,
          status: "pending",
        },
      ],
    },
  });

  await Query.findByIdAndUpdate(lead._id, {
    leadStatus: "closed",
    bookingId: booking._id,
  });

  const guestId = String(
    (booking.travellerPayment?.guests?.[0] as { _id?: { toString(): string } })?._id ??
      "",
  );

  ok(`Booking created: ${booking.bookingId}`);
  info(`Property: ${PROPERTY}`);
  info(`Guest amount due: INR ${AMOUNT}`);
  info(`Guest ObjectId (for mapping): ${guestId}`);

  // ─── STEP 4: Razorpay payment (webhook simulation) ────────────────────
  step(4, "Simulate Razorpay payment (FinancePayment)");

  const paymentId = `pay_${TAG.toLowerCase()}`;
  await FinancePayment.create({
    paymentId,
    customerName: PERSON.name,
    customerEmail: PERSON.email,
    customerPhone: PERSON.phone,
    customerPhoneNormalized: PERSON.phoneNormalized,
    amount: AMOUNT,
    currency: "INR",
    status: "captured",
    method: "upi",
    upi: "aarav@oksbi",
    source: "webhook",
    mapped: false,
    lastEvent: "payment.captured",
    capturedAt: new Date(),
    description: `Walkthrough payment ${TAG}`,
    rawPayload: {
      event: "payment.captured",
      source: "seed:finance-walkthrough",
      tag: TAG,
    },
  });

  ok(`FinancePayment created: ${paymentId}`);
  info(`Amount: INR ${AMOUNT} · status: captured · mapped: false`);
  info(`Phone matches guest → suggestions will show exact_phone`);

  const txUrl = `/dashboard/finance/transactions/${paymentId}?type=payment`;

  if (!AUTO) {
    step(5, "What you do next in the UI");
    console.log(`
  1. Open Finance → Transactions
     Look for customer "${PERSON.name}" / payment ${paymentId}

  2. Open transaction details:
     ${txUrl}

  3. Click "Map Payment"
     → Suggestion should appear (Exact phone)
     → Confirm mapping to booking ${booking.bookingId}

  4. Click "Generate Invoice"
     → Classification: Complete
     → (Optional) add discount reason if you want to test discount
     → Generate

  5. Preview PDF, then click "Send Invoice(s)"

  Tip: re-run with auto to map + generate in this script:
    npm run seed:finance-walkthrough:auto
`);
    await mongoose.disconnect();
    return;
  }

  // ─── AUTO: Map ────────────────────────────────────────────────────────
  step(5, "Map payment → booking + guest");

  const { mapPayment } = await import("../services/finance/financePaymentService.js");
  const mapped = await mapPayment({
    paymentId,
    bookingId: booking.bookingId!,
    guestId,
    mappedBy: "seed-walkthrough",
    mappedByName: "Finance Walkthrough",
    reason: `Auto-mapped by walkthrough ${TAG}`,
  });
  ok(`Mapped to booking ${mapped.bookingId}`);
  info(`invoiceStatus: ${mapped.invoiceStatus}`);

  // ─── AUTO: Generate invoice ───────────────────────────────────────────
  step(6, "Generate invoice (complete payment)");

  const { generateInvoice } = await import(
    "../services/finance/invoiceGenerationService.js"
  );
  const generated = await generateInvoice(
    {
      paymentId,
      classification: "complete",
      regenerate: false,
      notes: `Walkthrough invoice ${TAG}`,
    },
    { id: "seed-walkthrough", name: "Finance Walkthrough" },
  );
  const inv = generated.invoices[0];
  ok(`Invoice generated: ${inv.invoiceNumber}`);
  info(`Amount billed: INR ${inv.amountBilled}`);
  info(`PDF: /api/finance/invoice/${inv.invoiceNumber}/pdf`);

  if (!REAL_SEND) {
    console.log(`\n${"═".repeat(60)}`);
    console.log("  DONE — lead → booking → payment → map → invoice");
    console.log(`${"═".repeat(60)}`);
    console.log(`
  Lead:     ${PERSON.name} (${PERSON.phoneNo})
  Booking:  ${booking.bookingId}
  Payment:  ${paymentId}
  Invoice:  ${inv.invoiceNumber}
  UI:       ${txUrl}

  Next in UI: open the transaction → Preview PDF → Send Invoice(s)
  Or re-run with: npm run seed:finance-walkthrough:auto -- --send
`);
    await mongoose.disconnect();
    return;
  }

  // ─── AUTO: Send ───────────────────────────────────────────────────────
  step(7, "Send invoice email (dry-run unless FINANCE_INVOICE_EMAIL_DRY_RUN=false)");

  const { sendInvoices } = await import("../services/finance/invoiceSendService.js");
  const sent = await sendInvoices(
    { paymentId },
    { id: "seed-walkthrough", name: "Finance Walkthrough" },
  );
  for (const r of sent.results) {
    if (r.status === "sent") ok(`Sent ${r.invoiceNumber} → ${r.to}`);
    else if (r.status === "skipped") info(`Skipped ${r.invoiceNumber}: ${r.error}`);
    else console.log(`  ✗ Failed ${r.invoiceNumber}: ${r.error}`);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("  DONE — full path complete");
  console.log(`${"═".repeat(60)}`);
  console.log(`
  Lead:     ${PERSON.name} (${PERSON.phoneNo})
  Booking:  ${booking.bookingId}
  Payment:  ${paymentId}
  Invoice:  ${inv.invoiceNumber}
  UI:       ${txUrl}
`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\nWalkthrough failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
