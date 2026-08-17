/**
 * Integration tests for the three-stage Finance invoice workflow:
 *   Stage 1 – mapPayment()         (CRM linking only)
 *   Stage 2 – generateInvoice()    (classify + ledger + PDF metadata)
 *   Stage 3 – sendInvoices()       (email dispatch)
 *
 * Uses an in-memory MongoDB via mongodb-memory-server so no real DB is required.
 * The email send step is mocked — no real SMTP is used.
 */

import mongoose from "mongoose";
import { setupTestDb, teardownTestDb, clearCollections } from "../../../lib/finance/__tests__/testDbHelper";

// ── Model imports (must be registered before service imports) ─────────────
import FinancePayment from "@/models/financePayment";
import FinanceInvoice from "@/models/financeInvoice";
// Import the booking model so Mongoose registers it
import "@/models/booking";

// ── Services under test ───────────────────────────────────────────────────
import { mapPayment } from "@/services/finance/financePaymentService";
import { generateInvoice } from "@/services/finance/invoiceGenerationService";
import { sendInvoices } from "@/services/finance/invoiceSendService";

// ── Mock nodemailer so no real email is sent ──────────────────────────────
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "mock-message-id" }),
  }),
}));

// ── Mock pdf-lib so PDFs don't slow down tests ────────────────────────────
jest.mock("pdf-lib", () => {
  const actual = jest.requireActual("pdf-lib") as typeof import("pdf-lib");
  return {
    ...actual,
    PDFDocument: {
      create: jest.fn().mockResolvedValue({
        addPage: jest.fn().mockReturnValue({ drawText: jest.fn(), drawLine: jest.fn() }),
        embedFont: jest.fn().mockResolvedValue({ widthOfTextAtSize: jest.fn().mockReturnValue(100) }),
        embedPng: jest.fn().mockResolvedValue({}),
        embedJpg: jest.fn().mockResolvedValue({}),
        getPage: jest.fn().mockReturnValue({ drawText: jest.fn(), drawLine: jest.fn(), getSize: jest.fn().mockReturnValue({ width: 595, height: 842 }) }),
        save: jest.fn().mockResolvedValue(new Uint8Array(8)),
      }),
    },
    StandardFonts: actual.StandardFonts,
    rgb: actual.rgb,
    degrees: actual.degrees,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────

async function createTestPayment(overrides: Partial<{ paymentId: string; amount: number; status: string }> = {}) {
  return await FinancePayment.create({
    paymentId: overrides.paymentId ?? `pay_test${Date.now()}`,
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "+919876543210",
    customerPhoneNormalized: "9876543210",
    amount: overrides.amount ?? 20000,
    currency: "INR",
    status: overrides.status ?? "captured",
    source: "webhook",
    mapped: false,
    lastEvent: "payment.captured",
  });
}

async function createTestBooking(params: {
  bookingId: string;
  guestAmount: number;
  guestEmail?: string;
  secondGuest?: boolean;
}) {
  const BookingModel = mongoose.model("Booking");
  const guests: object[] = [
    {
      name: "Test Guest",
      email: params.guestEmail ?? "test@example.com",
      phone: "+919876543210",
      amountDue: params.guestAmount,
      amountPaid: 0,
    },
  ];
  if (params.secondGuest) {
    guests.push({
      name: "Second Guest",
      email: "second@example.com",
      phone: "+917000000001",
      amountDue: params.guestAmount,
      amountPaid: 0,
    });
  }
  return await BookingModel.create({
    bookingId: params.bookingId,
    propertyName: "Test Villa",
    address: "Test Address, Goa",
    status: "confirmed",
    checkIn: { date: new Date("2026-08-01"), time: "14:00" },
    checkOut: { date: new Date("2026-08-08"), time: "11:00" },
    createdBy: "test@example.com",
    travellerPayment: {
      finalAmount: params.guestAmount,
      guests,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  await clearCollections();
});

// ═════════════════════════════════════════════════════════════════════════
// Stage 1: mapPayment
// ═════════════════════════════════════════════════════════════════════════

describe("Stage 1 – mapPayment()", () => {
  it("maps a payment to a booking and guest", async () => {
    const payment = await createTestPayment();
    const booking = await createTestBooking({ bookingId: "BK-TEST-001", guestAmount: 20000 });

    const BookingModel = mongoose.model("Booking");
    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId; email: string }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    const result = await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-TEST-001",
      guestId,
      mappedBy: "user_001",
      mappedByName: "Test User",
    });

    expect(result.mapped).toBe(true);
    expect(result.bookingId).toBe("BK-TEST-001");
    expect(result.guestId).toBe(guestId);
    expect(result.invoiceStatus).toBe("not_generated");
    expect(result.mappingHistory).toHaveLength(1);
    expect(result.mappingHistory[0].mappedBy).toBe("user_001");

    // DB should also be updated
    const dbPayment = await FinancePayment.findOne({ paymentId: payment.paymentId });
    expect(dbPayment?.mapped).toBe(true);
    expect(dbPayment?.invoiceStatus).toBe("not_generated");

    await BookingModel.deleteMany({});
  });

  it("rejects remapping a payment that already has an invoice without confirmRemap", async () => {
    const payment = await createTestPayment();
    const booking = await createTestBooking({ bookingId: "BK-TEST-002", guestAmount: 20000 });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    // First mapping
    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-TEST-002",
      guestId,
      mappedBy: "user_001",
    });

    // Simulate invoice already generated
    await FinancePayment.updateOne(
      { paymentId: payment.paymentId },
      { $set: { invoiceStatus: "generated" } },
    );

    // Attempt remap without confirmRemap
    await expect(
      mapPayment({
        paymentId: payment.paymentId,
        bookingId: "BK-TEST-OTHER",
        guestId,
        mappedBy: "user_002",
      }),
    ).rejects.toMatchObject({ code: "INVOICE_EXISTS" });

    await mongoose.model("Booking").deleteMany({});
  });

  it("allows remapping with confirmRemap=true even if invoice exists", async () => {
    const payment = await createTestPayment();
    const booking = await createTestBooking({ bookingId: "BK-TEST-003", guestAmount: 20000 });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-TEST-003",
      guestId,
      mappedBy: "user_001",
    });

    await FinancePayment.updateOne(
      { paymentId: payment.paymentId },
      { $set: { invoiceStatus: "generated", bookingId: "BK-TEST-003" } },
    );

    // Remap to same booking with confirmRemap
    const result = await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-TEST-003",
      guestId,
      mappedBy: "user_002",
      confirmRemap: true,
    });

    expect(result.mappingHistory).toHaveLength(2);

    await mongoose.model("Booking").deleteMany({});
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Stage 2: generateInvoice
// ═════════════════════════════════════════════════════════════════════════

describe("Stage 2 – generateInvoice()", () => {
  it("generates a complete-payment invoice and updates payment record", async () => {
    const payment = await createTestPayment({ amount: 20000 });
    const booking = await createTestBooking({ bookingId: "BK-GEN-001", guestAmount: 20000 });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-GEN-001",
      guestId,
      mappedBy: "user_001",
    });

    const result = await generateInvoice(
      {
        paymentId: payment.paymentId,
        classification: "complete",
        regenerate: false,
      },
      { id: "user_001", name: "Test User" },
    );

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].classification).toBe("complete");
    expect(result.invoices[0].amountBilled).toBe(20000);
    expect(result.invoices[0].invoiceNumber).toMatch(/^FIN-/);

    const dbPayment = await FinancePayment.findOne({ paymentId: payment.paymentId });
    expect(dbPayment?.invoiceStatus).toBe("generated");
    expect(dbPayment?.invoiceNumbers).toHaveLength(1);
    expect(dbPayment?.paymentClassification).toBe("complete");

    await mongoose.model("Booking").deleteMany({});
  });

  it("generates a partial-payment invoice with pending amount", async () => {
    const payment = await createTestPayment({ amount: 8000 });
    const booking = await createTestBooking({ bookingId: "BK-GEN-002", guestAmount: 20000 });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-GEN-002",
      guestId,
      mappedBy: "user_001",
    });

    const result = await generateInvoice(
      { paymentId: payment.paymentId, classification: "partial", regenerate: false },
      { id: "user_001", name: "Test User" },
    );

    expect(result.invoices[0].classification).toBe("partial");
    expect(result.invoices[0].amountBilled).toBe(8000);
    expect(result.invoices[0].pendingAmount).toBe(12000);

    const dbPayment = await FinancePayment.findOne({ paymentId: payment.paymentId });
    expect(dbPayment?.pendingAmount).toBe(12000);

    await mongoose.model("Booking").deleteMany({});
  });

  it("prevents generating when payment is not mapped", async () => {
    const payment = await createTestPayment();

    await expect(
      generateInvoice(
        { paymentId: payment.paymentId, classification: "complete", regenerate: false },
        { id: "user_001" },
      ),
    ).rejects.toMatchObject({ code: "NOT_MAPPED" });
  });

  it("prevents regeneration without regenerate=true", async () => {
    const payment = await createTestPayment({ amount: 20000 });
    const booking = await createTestBooking({ bookingId: "BK-GEN-003", guestAmount: 20000 });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-GEN-003",
      guestId,
      mappedBy: "user_001",
    });
    await generateInvoice(
      { paymentId: payment.paymentId, classification: "complete", regenerate: false },
      { id: "user_001" },
    );

    // Second generation without flag
    await expect(
      generateInvoice(
        { paymentId: payment.paymentId, classification: "complete", regenerate: false },
        { id: "user_001" },
      ),
    ).rejects.toMatchObject({ code: "INVOICE_EXISTS" });

    await mongoose.model("Booking").deleteMany({});
  });

  it("supersedes old invoices on regeneration", async () => {
    const payment = await createTestPayment({ amount: 20000 });
    const booking = await createTestBooking({ bookingId: "BK-GEN-004", guestAmount: 20000 });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-GEN-004",
      guestId,
      mappedBy: "user_001",
    });

    const first = await generateInvoice(
      { paymentId: payment.paymentId, classification: "complete", regenerate: false },
      { id: "user_001" },
    );

    // Regenerate
    await generateInvoice(
      { paymentId: payment.paymentId, classification: "complete", regenerate: true },
      { id: "user_001" },
    );

    const oldInv = await FinanceInvoice.findOne({ invoiceNumber: first.invoices[0].invoiceNumber });
    expect(oldInv?.status).toBe("superseded");

    await mongoose.model("Booking").deleteMany({});
  });

  it("generates split invoices (one per allocation)", async () => {
    const payment = await createTestPayment({ amount: 30000 });
    const booking = await createTestBooking({
      bookingId: "BK-GEN-005",
      guestAmount: 15000,
      secondGuest: true,
    });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId; email: string }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-GEN-005",
      guestId,
      mappedBy: "user_001",
    });

    const result = await generateInvoice(
      {
        paymentId: payment.paymentId,
        classification: "split",
        regenerate: false,
        splitAllocations: [
          { guestId, name: "Test Guest", email: "test@example.com", amount: 15000 },
          { name: "Second Guest", email: "second@example.com", amount: 15000 },
        ],
      },
      { id: "user_001", name: "Test User" },
    );

    expect(result.invoices).toHaveLength(2);
    expect(result.invoices.every((inv) => inv.classification === "split")).toBe(true);
    expect(result.invoices[0].splitGroupId).toBe(result.invoices[1].splitGroupId);
    expect(result.invoices[0].splitTotalAmount).toBe(30000);

    await mongoose.model("Booking").deleteMany({});
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Stage 3: sendInvoices
// ═════════════════════════════════════════════════════════════════════════

describe("Stage 3 – sendInvoices()", () => {
  it("marks invoices as sent and updates payment invoiceStatus", async () => {
    const payment = await createTestPayment({ amount: 20000 });
    const booking = await createTestBooking({
      bookingId: "BK-SEND-001",
      guestAmount: 20000,
      guestEmail: "customer@example.com",
    });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-SEND-001",
      guestId,
      mappedBy: "user_001",
    });

    await generateInvoice(
      { paymentId: payment.paymentId, classification: "complete", regenerate: false },
      { id: "user_001" },
    );

    const sendResult = await sendInvoices(
      { paymentId: payment.paymentId },
      { id: "user_001", name: "Test User" },
    );

    expect(sendResult.results).toHaveLength(1);
    expect(sendResult.results[0].status).toBe("sent");

    const dbPayment = await FinancePayment.findOne({ paymentId: payment.paymentId });
    expect(dbPayment?.invoiceStatus).toBe("sent");

    // Invoice record should also be updated
    const invNumber = dbPayment?.invoiceNumbers[0];
    const inv = await FinanceInvoice.findOne({ invoiceNumber: invNumber });
    expect(inv?.status).toBe("sent");
    expect(inv?.emailedAt).toBeTruthy();

    await mongoose.model("Booking").deleteMany({});
  });

  it("skips invoices with no guest email and reports as skipped", async () => {
    const payment = await createTestPayment({ amount: 20000 });

    // Create booking with guest that has no email
    const BookingModel = mongoose.model("Booking");
    const booking = await BookingModel.create({
      bookingId: "BK-SEND-002",
      propertyName: "Test Villa",
      status: "confirmed",
      checkIn: { date: new Date("2026-08-01"), time: "14:00" },
      checkOut: { date: new Date("2026-08-08"), time: "11:00" },
      createdBy: "test@example.com",
      travellerPayment: {
        finalAmount: 20000,
        guests: [{ name: "No Email Guest", phone: "+919000000001", amountDue: 20000, amountPaid: 0 }],
      },
    });

    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-SEND-002",
      guestId,
      mappedBy: "user_001",
    });

    await generateInvoice(
      { paymentId: payment.paymentId, classification: "complete", regenerate: false },
      { id: "user_001" },
    );

    const sendResult = await sendInvoices(
      { paymentId: payment.paymentId },
      { id: "user_001" },
    );

    expect(sendResult.results[0].status).toBe("skipped");
    expect(sendResult.results[0].error).toMatch(/email/i);

    await BookingModel.deleteMany({});
  });

  it("throws NO_INVOICES when called before generation", async () => {
    const payment = await createTestPayment();

    const booking = await createTestBooking({ bookingId: "BK-SEND-003", guestAmount: 20000 });
    const guests = (booking as { travellerPayment: { guests: Array<{ _id: mongoose.Types.ObjectId }> } }).travellerPayment.guests;
    const guestId = guests[0]._id.toString();

    await mapPayment({
      paymentId: payment.paymentId,
      bookingId: "BK-SEND-003",
      guestId,
      mappedBy: "user_001",
    });

    await expect(
      sendInvoices({ paymentId: payment.paymentId }, { id: "user_001" }),
    ).rejects.toMatchObject({ code: "NO_INVOICES" });

    await mongoose.model("Booking").deleteMany({});
  });
});
