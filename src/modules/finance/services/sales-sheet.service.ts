import mongoose, { type FilterQuery } from "mongoose";
import Bookings from "@/models/booking";
import { Properties } from "@/models/property";
import Visits from "@/models/visit";
import FinanceInvoice from "@/modules/finance/models/invoice.model";
import FinancePayment, {
  type IFinancePayment,
} from "@/modules/finance/models/payment.model";
import { resolvePaymentFilter } from "@/modules/finance/payment-lookup";
import {
  buildSalesSheetRows,
  paymentEffectiveDate,
  rowMatchesSearch,
  SALES_SHEET_PAID_STATUSES,
  salesSheetToCsv,
  sumInvoiceValueInr,
  withSerialNumbers,
  type SalesSheetBookingContext,
  type SalesSheetInvoiceContext,
  type SalesSheetLookups,
  type SalesSheetPropertyContext,
  type SalesSheetRow,
  type SalesSheetSourcePayment,
  type SalesSheetVisitContext,
} from "@/modules/finance/sales-sheet";
import type {
  SalesSheetQuery,
  UpdateSalesSheetRateBody,
} from "@/modules/finance/schemas/payment.schema";

const MAX_SALES_SHEET_PAYMENTS = 5000;

export type SalesSheetPage = {
  data: SalesSheetRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  totalInvoiceValueInr: number;
  missingRateCount: number;
  truncated: boolean;
};

type BookingGuestLean = {
  _id?: unknown;
  name?: string;
  email?: string;
  phone?: string;
};

type BookingLean = {
  _id: unknown;
  address?: string;
  propertyName?: string;
  visit?: unknown;
  travellerPayment?: { guests?: BookingGuestLean[] };
};

type VisitLean = {
  _id: unknown;
  agentName?: string;
  propertyId?: string;
  VSID?: string;
};

type PropertyLean = {
  _id: unknown;
  country?: string;
  city?: string;
  street?: string;
  propertyName?: string;
  VSID?: string;
};

function idToString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "object") {
    const text = String(value);
    if (!text || text === "[object Object]") return null;
    return text;
  }
  return null;
}

function kolkataStart(date: string): Date {
  return new Date(`${date}T00:00:00+05:30`);
}

function kolkataEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999+05:30`);
}

function buildPaymentFilter(params: SalesSheetQuery): FilterQuery<IFinancePayment> {
  const filter: FilterQuery<IFinancePayment> = {
    mapped: true,
    status: { $in: [...SALES_SHEET_PAID_STATUSES] },
  };

  if (!params.dateFrom && !params.dateTo) return filter;

  const checks: Record<string, unknown>[] = [];
  if (params.dateFrom) {
    checks.push({ $gte: ["$$effective", kolkataStart(params.dateFrom)] });
  }
  if (params.dateTo) {
    checks.push({ $lte: ["$$effective", kolkataEnd(params.dateTo)] });
  }

  filter.$expr = {
    $let: {
      vars: {
        effective: {
          $ifNull: ["$paidAt", { $ifNull: ["$capturedAt", "$createdAt"] }],
        },
      },
      in: { $and: checks },
    },
  };

  return filter;
}

function toSourcePayment(doc: IFinancePayment & { _id: unknown }): SalesSheetSourcePayment {
  return {
    id: idToString(doc._id) ?? "",
    paymentId: doc.paymentId ?? null,
    paymentLinkId: doc.paymentLinkId ?? null,
    paidAt: doc.paidAt ?? null,
    capturedAt: doc.capturedAt ?? null,
    createdAt: doc.createdAt ?? null,
    customerName: doc.customerName ?? null,
    customerEmail: doc.customerEmail ?? null,
    customerPhone: doc.customerPhone ?? null,
    guestId: doc.guestId ?? null,
    guestName: doc.guestName ?? null,
    guestEmail: doc.guestEmail ?? null,
    bookingObjectId: doc.bookingObjectId ?? null,
    propertyId: doc.propertyId ?? null,
    amount: Number(doc.amount ?? 0),
    currency: doc.currency ?? "INR",
    method: doc.method ?? null,
    exchangeRate: doc.exchangeRate ?? null,
    invoiceNumber: doc.invoiceNumber ?? null,
    invoiceNumbers: doc.invoiceNumbers ?? [],
  };
}

function propertyAddress(property: PropertyLean): string {
  return [property.street, property.city].map((part) => part?.trim()).filter(Boolean).join(", ");
}

async function loadLookups(payments: SalesSheetSourcePayment[]): Promise<SalesSheetLookups> {
  const bookingIds = [
    ...new Set(
      payments
        .map((payment) => payment.bookingObjectId)
        .filter((id): id is string => Boolean(id && mongoose.isValidObjectId(id))),
    ),
  ];

  const bookings = bookingIds.length
    ? ((await Bookings.find({ _id: { $in: bookingIds } })
        .select("address propertyName visit travellerPayment.guests")
        .lean()) as BookingLean[])
    : [];

  const bookingsById: Record<string, SalesSheetBookingContext> = {};
  const visitIds: string[] = [];
  for (const booking of bookings) {
    const id = idToString(booking._id);
    if (!id) continue;
    const visitId = idToString(booking.visit);
    if (visitId && mongoose.isValidObjectId(visitId)) visitIds.push(visitId);
    bookingsById[id] = {
      address: booking.address?.trim() ?? "",
      propertyName: booking.propertyName?.trim() ?? "",
      visitId,
      guests: (booking.travellerPayment?.guests ?? []).map((guest) => ({
        id: idToString(guest._id) ?? "",
        name: guest.name?.trim() ?? "",
        email: guest.email?.trim() ?? "",
        phone: guest.phone?.trim() ?? "",
      })),
    };
  }

  const uniqueVisitIds = [...new Set(visitIds)];
  const visits = uniqueVisitIds.length
    ? ((await Visits.find({ _id: { $in: uniqueVisitIds } })
        .select("agentName propertyId VSID")
        .lean()) as VisitLean[])
    : [];

  const visitsById: Record<string, SalesSheetVisitContext> = {};
  const propertyObjectIds: string[] = [];
  const vsids: string[] = [];
  for (const visit of visits) {
    const id = idToString(visit._id);
    if (!id) continue;
    const propertyId = visit.propertyId?.trim() ?? "";
    const vsid = visit.VSID?.trim() ?? "";
    visitsById[id] = {
      agentName: visit.agentName?.trim() ?? "",
      propertyId,
      vsid,
    };
    if (propertyId && mongoose.isValidObjectId(propertyId)) propertyObjectIds.push(propertyId);
    if (vsid) vsids.push(vsid);
    if (propertyId && !mongoose.isValidObjectId(propertyId)) vsids.push(propertyId);
  }

  for (const payment of payments) {
    if (payment.propertyId && mongoose.isValidObjectId(payment.propertyId)) {
      propertyObjectIds.push(payment.propertyId);
    }
  }

  const propertyOr: Array<Record<string, unknown>> = [];
  const uniquePropertyIds = [...new Set(propertyObjectIds)];
  const uniqueVsids = [...new Set(vsids)];
  if (uniquePropertyIds.length) propertyOr.push({ _id: { $in: uniquePropertyIds } });
  if (uniqueVsids.length) propertyOr.push({ VSID: { $in: uniqueVsids } });

  const properties = propertyOr.length
    ? ((await Properties.find({ $or: propertyOr })
        .select("country city street propertyName VSID")
        .lean()) as PropertyLean[])
    : [];

  const propertiesById: Record<string, SalesSheetPropertyContext> = {};
  const propertiesByVsid: Record<string, SalesSheetPropertyContext> = {};
  for (const property of properties) {
    const context: SalesSheetPropertyContext = {
      country: property.country?.trim() ?? "",
      address: propertyAddress(property),
    };
    const id = idToString(property._id);
    if (id) propertiesById[id] = context;
    if (property.VSID?.trim()) propertiesByVsid[property.VSID.trim()] = context;
  }

  const paymentObjectIds = payments.map((payment) => payment.id).filter(Boolean);
  const publicIds = payments.flatMap((payment) =>
    [payment.paymentId, payment.paymentLinkId].filter((id): id is string => Boolean(id)),
  );

  const invoiceOr: Array<Record<string, unknown>> = [];
  if (paymentObjectIds.length) {
    invoiceOr.push({ financePaymentObjectId: { $in: paymentObjectIds } });
  }
  if (publicIds.length) invoiceOr.push({ financePaymentId: { $in: publicIds } });

  const invoices = invoiceOr.length
    ? await FinanceInvoice.find({
        status: { $ne: "superseded" },
        $or: invoiceOr,
      })
        .select(
          "invoiceNumber financePaymentId financePaymentObjectId guestId guestName guestEmail guestPhone amountBilled currency status",
        )
        .lean()
    : [];

  const invoicesByKey: Record<string, SalesSheetInvoiceContext[]> = {};
  const pushInvoice = (key: string | null | undefined, invoice: SalesSheetInvoiceContext) => {
    if (!key) return;
    const list = invoicesByKey[key] ?? [];
    list.push(invoice);
    invoicesByKey[key] = list;
  };

  for (const invoice of invoices) {
    const context: SalesSheetInvoiceContext = {
      invoiceNumber: invoice.invoiceNumber,
      guestId: invoice.guestId ?? null,
      guestName: invoice.guestName ?? null,
      guestEmail: invoice.guestEmail ?? null,
      guestPhone: invoice.guestPhone ?? null,
      amountBilled: Number(invoice.amountBilled ?? 0),
      currency: invoice.currency ?? "INR",
      status: invoice.status,
    };
    pushInvoice(invoice.financePaymentObjectId, context);
    pushInvoice(invoice.financePaymentId, context);
  }

  return {
    bookingsById,
    visitsById,
    propertiesById,
    propertiesByVsid,
    invoicesByKey,
  };
}

async function collectRows(params: SalesSheetQuery): Promise<{
  rows: SalesSheetRow[];
  truncated: boolean;
}> {
  const filter = buildPaymentFilter(params);
  const totalPayments = await FinancePayment.countDocuments(filter);
  const truncated = totalPayments > MAX_SALES_SHEET_PAYMENTS;

  const query = FinancePayment.find(filter).select(
    "paymentId paymentLinkId customerName customerEmail customerPhone guestId guestName guestEmail bookingObjectId propertyId amount currency method exchangeRate invoiceNumber invoiceNumbers paidAt capturedAt createdAt",
  );
  if (truncated) {
    query.sort({ paidAt: -1, createdAt: -1 }).limit(MAX_SALES_SHEET_PAYMENTS);
  }

  const docs = (await query.lean()) as Array<IFinancePayment & { _id: unknown }>;
  const payments = docs
    .map(toSourcePayment)
    .sort((left, right) => {
      const leftTime = paymentEffectiveDate(left)?.getTime() ?? 0;
      const rightTime = paymentEffectiveDate(right)?.getTime() ?? 0;
      return leftTime - rightTime;
    });

  const lookups = await loadLookups(payments);
  const built = buildSalesSheetRows(payments, lookups);
  const filtered = params.search
    ? built.filter((row) => rowMatchesSearch(row, params.search ?? ""))
    : built;

  return { rows: withSerialNumbers(filtered), truncated };
}

export async function listSalesSheet(params: SalesSheetQuery): Promise<SalesSheetPage> {
  const { rows, truncated } = await collectRows(params);
  const total = rows.length;
  const limit = params.format === "csv" ? Math.max(total, 1) : params.limit;
  const page = params.format === "csv" ? 1 : params.page;
  const start = (page - 1) * limit;
  const data = params.format === "csv" ? rows : rows.slice(start, start + limit);

  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    totalInvoiceValueInr: sumInvoiceValueInr(rows),
    missingRateCount: rows.filter((row) => row.exchangeRate == null).length,
    truncated,
  };
}

export function salesSheetCsv(rows: SalesSheetRow[]): string {
  return `\uFEFF${salesSheetToCsv(rows)}`;
}

export async function updateSalesSheetExchangeRate(
  body: UpdateSalesSheetRateBody,
): Promise<{ exchangeRate: number }> {
  let payment: IFinancePayment | null = null;
  if (body.paymentObjectId && mongoose.isValidObjectId(body.paymentObjectId)) {
    payment = await FinancePayment.findById(body.paymentObjectId);
  }
  if (!payment) {
    const filter = resolvePaymentFilter(body, "throw");
    payment = await FinancePayment.findOne(filter);
  }
  if (!payment) {
    throw Object.assign(new Error("Payment not found"), { status: 404 });
  }
  if (!payment.mapped || !SALES_SHEET_PAID_STATUSES.includes(payment.status)) {
    throw Object.assign(
      new Error("Exchange rate can only be set on a paid, mapped transaction"),
      { status: 400 },
    );
  }

  payment.exchangeRate = body.exchangeRate;
  await payment.save();
  return { exchangeRate: body.exchangeRate };
}
