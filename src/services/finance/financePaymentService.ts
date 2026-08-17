import type { FilterQuery } from "mongoose";
import FinancePayment, {
  type IFinancePayment,
} from "@/models/financePayment";
import Bookings from "@/models/booking";
import Invoice from "@/models/invoice";
import { normalizePhone, phonesMatch } from "@/lib/finance/phone";
import type {
  MappingHistoryEntry,
} from "@/schemas/financePayment.schema";

export type TransactionListParams = {
  page: number;
  limit: number;
  status?: string;
  mapped?: "true" | "false" | "all";
  method?: string;
  phone?: string; 
  customer?: string;
  paymentId?: string;
  paymentLinkId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
};

function buildListFilter(
  params: TransactionListParams,
): FilterQuery<IFinancePayment> {
  const filter: FilterQuery<IFinancePayment> = {};

  if (params.status) filter.status = params.status;
  if (params.mapped === "true") filter.mapped = true;
  if (params.mapped === "false") filter.mapped = false;
  if (params.method) filter.method = params.method;
  if (params.paymentId) filter.paymentId = params.paymentId;
  if (params.paymentLinkId) filter.paymentLinkId = params.paymentLinkId;

  if (params.phone) {
    filter.customerPhoneNormalized = normalizePhone(params.phone);
  }

  if (params.customer) {
    filter.$or = [
      { customerName: { $regex: params.customer, $options: "i" } },
      { customerEmail: { $regex: params.customer, $options: "i" } },
    ];
  }

  if (params.search) {
    const q = params.search.trim();
    const phoneNorm = normalizePhone(q);
    filter.$or = [
      { paymentId: { $regex: q, $options: "i" } },
      { paymentLinkId: { $regex: q, $options: "i" } },
      { customerName: { $regex: q, $options: "i" } },
      { customerEmail: { $regex: q, $options: "i" } },
      ...(phoneNorm
        ? [{ customerPhoneNormalized: phoneNorm }, { customerPhone: { $regex: q, $options: "i" } }]
        : [{ customerPhone: { $regex: q, $options: "i" } }]),
    ];
  }

  if (params.minAmount !== undefined || params.maxAmount !== undefined) {
    filter.amount = {};
    if (params.minAmount !== undefined) filter.amount.$gte = params.minAmount;
    if (params.maxAmount !== undefined) filter.amount.$lte = params.maxAmount;
  }

  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) filter.createdAt.$gte = new Date(params.dateFrom);
    if (params.dateTo) {
      const end = new Date(params.dateTo);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  return filter;
}

export function toPublicTransaction(doc: IFinancePayment) {
  return {
    paymentId: doc.paymentId ?? null,
    paymentLinkId: doc.paymentLinkId ?? null,
    orderId: doc.orderId ?? null,
    customerName: doc.customerName ?? null,
    customerEmail: doc.customerEmail ?? null,
    customerPhone: doc.customerPhone ?? null,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    method: doc.method ?? null,
    bank: doc.bank ?? null,
    wallet: doc.wallet ?? null,
    upi: doc.upi ?? null,
    card: doc.card ?? null,
    fee: doc.fee ?? null,
    tax: doc.tax ?? null,
    netAmount: doc.netAmount ?? null,
    notes: doc.notes ?? null,
    description: doc.description ?? null,
    shortUrl: doc.shortUrl ?? null,
    createdAtRazorpay: doc.createdAtRazorpay ?? null,
    authorizedAt: doc.authorizedAt ?? null,
    capturedAt: doc.capturedAt ?? null,
    paidAt: doc.paidAt ?? null,
    failedAt: doc.failedAt ?? null,
    mapped: doc.mapped,
    mappedAt: doc.mappedAt ?? null,
    mappedBy: doc.mappedBy ?? null,
    mappedByName: doc.mappedByName ?? null,
    bookingId: doc.bookingId ?? null,
    guestId: doc.guestId ?? null,
    guestName: doc.guestName ?? null,
    guestEmail: doc.guestEmail ?? null,
    invoiceId: doc.invoiceId ?? null,
    invoiceNumber: doc.invoiceNumber ?? null,
    propertyId: doc.propertyId ?? null,
    ownerId: doc.ownerId ?? null,
    mappingHistory: doc.mappingHistory ?? [],
    /** Finance invoice pipeline */
    invoiceStatus: doc.invoiceStatus ?? "not_generated",
    invoiceIds: doc.invoiceIds ?? [],
    invoiceNumbers: doc.invoiceNumbers ?? [],
    paymentClassification: doc.paymentClassification ?? null,
    pendingAmount: doc.pendingAmount ?? null,
    discountGiven: doc.discountGiven ?? null,
    splitAllocations: doc.splitAllocations ?? [],
    metadata: doc.metadata ?? null,
    rawPayload: doc.rawPayload ?? null,
    source: doc.source,
    lastEvent: doc.lastEvent ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listTransactions(params: TransactionListParams) {
  const filter = buildListFilter(params);
  const skip = (params.page - 1) * params.limit;

  const [items, total] = await Promise.all([
    FinancePayment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.limit)
      .lean<IFinancePayment[]>(),
    FinancePayment.countDocuments(filter),
  ]);

  return {
    data: items.map((item) => toPublicTransaction(item as IFinancePayment)),
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function getTransactionByPublicId(params: {
  paymentId?: string;
  paymentLinkId?: string;
}) {
  const filter: FilterQuery<IFinancePayment> = {};
  if (params.paymentId) filter.paymentId = params.paymentId;
  else if (params.paymentLinkId) filter.paymentLinkId = params.paymentLinkId;
  else return null;

  const doc = await FinancePayment.findOne(filter);
  if (!doc) return null;
  return toPublicTransaction(doc);
}

export type GuestSuggestion = {
  confidence: "exact_phone" | "name_email" | "manual_search";
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  bookingId: string;
  bookingObjectId: string;
  propertyName: string;
  address: string;
};

type GuestDoc = {
  _id?: { toString(): string };
  name?: string;
  email?: string;
  phone?: string;
};

export async function suggestGuestsForPayment(params: {
  paymentId?: string;
  paymentLinkId?: string;
  search?: string;
}): Promise<{
  payment: ReturnType<typeof toPublicTransaction> | null;
  suggestions: GuestSuggestion[];
}> {
  const payment = await getTransactionByPublicId({
    paymentId: params.paymentId,
    paymentLinkId: params.paymentLinkId,
  });

  if (params.search && params.search.trim()) {
    const suggestions = await manualSearchGuests(params.search.trim());
    return { payment, suggestions };
  }

  if (!payment) {
    return { payment: null, suggestions: [] };
  }

  const phoneSuggestions = await findGuestsByPhone(payment.customerPhone);
  if (phoneSuggestions.length > 0) {
    return { payment, suggestions: phoneSuggestions };
  }

  const soft = await findGuestsByNameOrEmail(
    payment.customerName,
    payment.customerEmail,
  );
  return { payment, suggestions: soft };
}

async function findGuestsByPhone(
  phone: string | null,
): Promise<GuestSuggestion[]> {
  if (!phone) return [];
  const normalized = normalizePhone(phone);
  if (!normalized) return [];

  const bookings = await Bookings.find({
    "travellerPayment.guests.phone": {
      $regex: `${escapeRegex(normalized)}$`,
    },
  })
    .select("bookingId propertyName address travellerPayment.guests")
    .limit(50)
    .lean();

  const out: GuestSuggestion[] = [];
  for (const booking of bookings) {
    const guests = (booking.travellerPayment?.guests ?? []) as GuestDoc[];
    for (const guest of guests) {
      if (!phonesMatch(guest.phone, phone)) continue;
      out.push({
        confidence: "exact_phone",
        guestId: guest._id?.toString() ?? `${guest.email}-${guest.phone}`,
        guestName: guest.name ?? "",
        guestEmail: guest.email ?? "",
        guestPhone: guest.phone ?? "",
        bookingId: booking.bookingId ?? "",
        bookingObjectId: String(booking._id),
        propertyName: booking.propertyName ?? "",
        address: booking.address ?? "",
      });
    }
  }
  return out;
}

async function findGuestsByNameOrEmail(
  name: string | null,
  email: string | null,
): Promise<GuestSuggestion[]> {
  const or: Record<string, unknown>[] = [];
  if (email) {
    or.push({
      "travellerPayment.guests.email": {
        $regex: `^${escapeRegex(email)}$`,
        $options: "i",
      },
    });
  }
  if (name && name.trim().length >= 3) {
    or.push({
      "travellerPayment.guests.name": {
        $regex: escapeRegex(name.trim()),
        $options: "i",
      },
    });
  }
  if (or.length === 0) return [];

  const bookings = await Bookings.find({ $or: or })
    .select("bookingId propertyName address travellerPayment.guests")
    .limit(50)
    .lean();

  const out: GuestSuggestion[] = [];
  for (const booking of bookings) {
    const guests = (booking.travellerPayment?.guests ?? []) as GuestDoc[];
    for (const guest of guests) {
      const emailMatch =
        email &&
        guest.email &&
        guest.email.toLowerCase() === email.toLowerCase();
      const nameMatch =
        name &&
        guest.name &&
        guest.name.toLowerCase().includes(name.toLowerCase());
      if (!emailMatch && !nameMatch) continue;
      out.push({
        confidence: "name_email",
        guestId: guest._id?.toString() ?? `${guest.email}-${guest.phone}`,
        guestName: guest.name ?? "",
        guestEmail: guest.email ?? "",
        guestPhone: guest.phone ?? "",
        bookingId: booking.bookingId ?? "",
        bookingObjectId: String(booking._id),
        propertyName: booking.propertyName ?? "",
        address: booking.address ?? "",
      });
    }
  }
  return out;
}

async function manualSearchGuests(search: string): Promise<GuestSuggestion[]> {
  const phoneNorm = normalizePhone(search);
  const invoice = (await Invoice.findOne({
    invoiceNumber: { $regex: `^${escapeRegex(search)}$`, $options: "i" },
  })
    .select("bookingId invoiceNumber")
    .lean()) as { bookingId?: string; invoiceNumber?: string } | null;

  const or: Record<string, unknown>[] = [
    { bookingId: { $regex: escapeRegex(search), $options: "i" } },
    {
      "travellerPayment.guests.name": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
    {
      "travellerPayment.guests.email": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
  ];

  if (phoneNorm) {
    or.push({
      "travellerPayment.guests.phone": { $regex: phoneNorm },
    });
  }

  if (invoice?.bookingId) {
    or.push({ bookingId: invoice.bookingId });
  }

  const bookings = await Bookings.find({ $or: or })
    .select("bookingId propertyName address travellerPayment.guests")
    .limit(40)
    .lean();

  const out: GuestSuggestion[] = [];
  for (const booking of bookings) {
    const guests = (booking.travellerPayment?.guests ?? []) as GuestDoc[];
    for (const guest of guests) {
      out.push({
        confidence: "manual_search",
        guestId: guest._id?.toString() ?? `${guest.email}-${guest.phone}`,
        guestName: guest.name ?? "",
        guestEmail: guest.email ?? "",
        guestPhone: guest.phone ?? "",
        bookingId: booking.bookingId ?? "",
        bookingObjectId: String(booking._id),
        propertyName: booking.propertyName ?? "",
        address: booking.address ?? "",
      });
    }
  }
  return out;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function mapPayment(params: {
  paymentId?: string;
  paymentLinkId?: string;
  bookingId: string;
  guestId: string;
  reason?: string;
  confirmRemap?: boolean;
  mappedBy: string;
  mappedByName?: string;
}) {
  const filter: FilterQuery<IFinancePayment> = {};
  if (params.paymentId) filter.paymentId = params.paymentId;
  else if (params.paymentLinkId) filter.paymentLinkId = params.paymentLinkId;
  else throw new Error("paymentId or paymentLinkId is required");

  const payment = await FinancePayment.findOne(filter);
  if (!payment) throw new Error("Payment not found");

  // Guard: if an invoice was already generated/sent, require explicit confirmRemap
  const isReMapping = payment.mapped && payment.bookingId !== params.bookingId;
  if (
    isReMapping &&
    payment.invoiceStatus !== "not_generated" &&
    !params.confirmRemap
  ) {
    throw Object.assign(
      new Error(
        "This payment already has an invoice generated. Set confirmRemap=true to proceed.",
      ),
      { code: "INVOICE_EXISTS", status: 409 },
    );
  }

  const booking = await Bookings.findOne({
    $or: [
      { bookingId: params.bookingId },
      ...(params.bookingId.match(/^[a-f\d]{24}$/i)
        ? [{ _id: params.bookingId }]
        : []),
    ],
  })
    .select("bookingId propertyName address travellerPayment.guests propertyId ownerId")
    .lean<{
      _id: unknown;
      bookingId?: string;
      propertyName?: string;
      address?: string;
      propertyId?: unknown;
      ownerId?: unknown;
      travellerPayment?: { guests?: GuestDoc[] };
    }>();

  if (!booking) throw new Error("Booking not found");

  const guests = (booking.travellerPayment?.guests ?? []) as GuestDoc[];
  const guest =
    guests.find((g) => g._id?.toString() === params.guestId) ??
    guests.find(
      (g) =>
        `${g.email}-${g.phone}` === params.guestId ||
        g.email === params.guestId,
    );

  if (!guest) throw new Error("Guest not found on booking");

  const historyEntry: MappingHistoryEntry = {
    mappedBy: params.mappedBy,
    mappedByName: params.mappedByName,
    mappedAt: new Date(),
    previousBookingId: payment.bookingId,
    newBookingId: booking.bookingId,
    previousGuestId: payment.guestId,
    newGuestId: params.guestId,
    reason: params.reason,
  };

  payment.mapped = true;
  payment.mappedAt = new Date();
  payment.mappedBy = params.mappedBy;
  payment.mappedByName = params.mappedByName;
  payment.bookingId = booking.bookingId;
  payment.bookingObjectId = String(booking._id);
  payment.guestId = params.guestId;
  payment.guestName = guest.name;
  payment.guestEmail = guest.email;
  // Derive property/owner from booking when available
  if (booking.propertyId) payment.propertyId = String(booking.propertyId);
  if (booking.ownerId) payment.ownerId = String(booking.ownerId);
  // Initialise invoiceStatus on first mapping (payment.mapped is already true at this point)
  if (!payment.invoiceStatus) {
    payment.invoiceStatus = "not_generated";
  }
  payment.mappingHistory = [...(payment.mappingHistory ?? []), historyEntry];

  await payment.save();
  return toPublicTransaction(payment);
}

export async function getFinanceOverview() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidStatuses = ["captured", "paid", "partially_paid"];

  const sumAmount = async (match: FilterQuery<IFinancePayment>) => {
    const result = await FinancePayment.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  };

  const [
    todayCollection,
    weekCollection,
    monthCollection,
    pendingMapping,
    mappedCount,
    failedCount,
    refundedCount,
    revenue,
    totalPayments,
  ] = await Promise.all([
    sumAmount({
      status: { $in: paidStatuses },
      $or: [
        { paidAt: { $gte: startOfDay } },
        { capturedAt: { $gte: startOfDay } },
        { createdAt: { $gte: startOfDay } },
      ],
    }),
    sumAmount({
      status: { $in: paidStatuses },
      $or: [
        { paidAt: { $gte: startOfWeek } },
        { capturedAt: { $gte: startOfWeek } },
        { createdAt: { $gte: startOfWeek } },
      ],
    }),
    sumAmount({
      status: { $in: paidStatuses },
      $or: [
        { paidAt: { $gte: startOfMonth } },
        { capturedAt: { $gte: startOfMonth } },
        { createdAt: { $gte: startOfMonth } },
      ],
    }),
    FinancePayment.countDocuments({ mapped: false }),
    FinancePayment.countDocuments({ mapped: true }),
    FinancePayment.countDocuments({ status: "failed" }),
    FinancePayment.countDocuments({ status: "refunded" }),
    sumAmount({ status: { $in: paidStatuses } }),
    FinancePayment.countDocuments({}),
  ]);

  return {
    todayCollection,
    weekCollection,
    monthCollection,
    pendingMapping,
    mapped: mappedCount,
    failedPayments: failedCount,
    refunded: refundedCount,
    revenue,
    totalPayments,
  };
}
