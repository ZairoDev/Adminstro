/**
 * Sales sheet column mapping for paid, mapped finance transactions.
 *
 * Date                  paidAt, else capturedAt, else createdAt (Asia/Kolkata)
 * Customer Name         invoice guest, else mapped guest, else payer
 * Contact number        invoice phone, else booking guest phone, else payer phone
 * E mail ID             invoice email, else mapped guest email, else payer email
 * Customer Prop Address booking address, else property street/city
 * Country               property country from the visit
 * Invoice Number        finance invoice, else the payment's invoice number
 * Amount Paid           invoice amount when split, otherwise the payment amount
 * Mode                  payment method
 * EXCH RATE             stored rate; INR defaults to 1
 * INVOICE VALUE IN RS   amount paid × exchange rate
 * Agent                 visit agent
 */

export const SALES_SHEET_TIME_ZONE = "Asia/Kolkata";

const PAID_STATUSES = ["captured", "paid", "partially_paid"] as const;

export const SALES_SHEET_PAID_STATUSES: readonly string[] = PAID_STATUSES;

const MODE_LABELS: Record<string, string> = {
  paypal: "PayPal",
  upi: "UPI",
  card: "Card",
  credit_card: "Card",
  debit_card: "Card",
  netbanking: "Net Banking",
  wallet: "Wallet",
  emi: "EMI",
  bank_transfer: "Bank Transfer",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  INR: "₹",
};

export type SalesSheetInvoiceContext = {
  invoiceNumber: string;
  guestId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  amountBilled: number;
  currency: string;
  status: string;
};

export type SalesSheetGuestContext = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type SalesSheetBookingContext = {
  address: string;
  propertyName: string;
  visitId: string | null;
  guests: SalesSheetGuestContext[];
};

export type SalesSheetVisitContext = {
  agentName: string;
  propertyId: string;
  vsid: string;
};

export type SalesSheetPropertyContext = {
  country: string;
  address: string;
};

export type SalesSheetSourcePayment = {
  id: string;
  paymentId: string | null;
  paymentLinkId: string | null;
  paidAt: Date | string | null;
  capturedAt: Date | string | null;
  createdAt: Date | string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  guestId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  bookingObjectId: string | null;
  propertyId: string | null;
  amount: number;
  currency: string;
  method: string | null;
  exchangeRate: number | null;
  invoiceNumber: string | null;
  invoiceNumbers: string[];
};

export type SalesSheetRow = {
  serial: number;
  paymentObjectId: string;
  paymentId: string | null;
  paymentLinkId: string | null;
  date: string;
  customerName: string;
  contactNumber: string;
  email: string;
  propertyAddress: string;
  country: string;
  invoiceNumber: string;
  amountPaid: number;
  currency: string;
  amountPaidLabel: string;
  mode: string;
  exchangeRate: number | null;
  invoiceValueInr: number | null;
  invoiceValueLabel: string;
  agent: string;
};

export type SalesSheetLookups = {
  bookingsById: Record<string, SalesSheetBookingContext>;
  visitsById: Record<string, SalesSheetVisitContext>;
  propertiesById: Record<string, SalesSheetPropertyContext>;
  propertiesByVsid: Record<string, SalesSheetPropertyContext>;
  /** Keyed by payment object id, payment id, and payment link id. */
  invoicesByKey: Record<string, SalesSheetInvoiceContext[]>;
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function paymentEffectiveDate(
  payment: Pick<SalesSheetSourcePayment, "paidAt" | "capturedAt" | "createdAt">,
): Date | null {
  const raw = payment.paidAt ?? payment.capturedAt ?? payment.createdAt;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSheetDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SALES_SHEET_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatPaymentMode(method: string | null | undefined): string {
  const raw = clean(method);
  if (!raw) return "";
  const key = raw.toLowerCase();
  return (
    MODE_LABELS[key] ??
    raw
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function formatAmountPaid(amount: number, currency: string): string {
  const code = clean(currency).toUpperCase() || "INR";
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  if (code === "EUR") return `${formatted}€`;
  const symbol = CURRENCY_SYMBOLS[code];
  if (symbol) return `${symbol}${formatted}`;
  return `${formatted} ${code}`;
}

export function formatInvoiceValueInr(value: number | null): string {
  if (value == null) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatExchangeRate(rate: number): string {
  const rounded = Math.round(rate * 10000) / 10000;
  return String(rounded);
}

export function resolveExchangeRate(
  currency: string,
  stored: number | null | undefined,
): number | null {
  if (stored != null && Number.isFinite(stored) && stored > 0) return stored;
  if (clean(currency).toUpperCase() === "INR") return 1;
  return null;
}

export function invoiceValueInInr(amount: number, rate: number | null): number | null {
  if (rate == null || !Number.isFinite(amount)) return null;
  return Math.round(amount * rate * 100) / 100;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function findGuest(
  booking: SalesSheetBookingContext | undefined,
  guestId: string | null,
  email: string,
): SalesSheetGuestContext | undefined {
  if (!booking) return undefined;
  if (guestId) {
    const byId = booking.guests.find((guest) => guest.id === guestId);
    if (byId) return byId;
  }
  const normalized = email.toLowerCase();
  if (!normalized) return undefined;
  return booking.guests.find((guest) => guest.email.toLowerCase() === normalized);
}

function propertyForPayment(
  payment: SalesSheetSourcePayment,
  booking: SalesSheetBookingContext | undefined,
  lookups: SalesSheetLookups,
): SalesSheetPropertyContext | undefined {
  const visit = booking?.visitId ? lookups.visitsById[booking.visitId] : undefined;
  if (visit?.propertyId && lookups.propertiesById[visit.propertyId]) {
    return lookups.propertiesById[visit.propertyId];
  }
  if (visit?.vsid && lookups.propertiesByVsid[visit.vsid]) {
    return lookups.propertiesByVsid[visit.vsid];
  }
  if (visit?.propertyId && lookups.propertiesByVsid[visit.propertyId]) {
    return lookups.propertiesByVsid[visit.propertyId];
  }
  if (payment.propertyId && lookups.propertiesById[payment.propertyId]) {
    return lookups.propertiesById[payment.propertyId];
  }
  return undefined;
}

function invoicesForPayment(
  payment: SalesSheetSourcePayment,
  lookups: SalesSheetLookups,
): SalesSheetInvoiceContext[] {
  const merged = [
    ...(lookups.invoicesByKey[payment.id] ?? []),
    ...(payment.paymentId ? lookups.invoicesByKey[payment.paymentId] ?? [] : []),
    ...(payment.paymentLinkId ? lookups.invoicesByKey[payment.paymentLinkId] ?? [] : []),
  ];
  const seen = new Set<string>();
  return merged.filter((invoice) => {
    if (invoice.status === "superseded") return false;
    if (seen.has(invoice.invoiceNumber)) return false;
    seen.add(invoice.invoiceNumber);
    return true;
  });
}

function fallbackInvoiceNumber(payment: SalesSheetSourcePayment): string {
  const numbers = payment.invoiceNumbers.map((value) => clean(value)).filter(Boolean);
  if (numbers.length > 0) return numbers.join(", ");
  return clean(payment.invoiceNumber);
}

type RowDraft = {
  customerName: string;
  contactNumber: string;
  email: string;
  invoiceNumber: string;
  amountPaid: number;
  currency: string;
};

function toRow(
  payment: SalesSheetSourcePayment,
  draft: RowDraft,
  booking: SalesSheetBookingContext | undefined,
  property: SalesSheetPropertyContext | undefined,
  agent: string,
): Omit<SalesSheetRow, "serial"> {
  const currency = clean(draft.currency).toUpperCase() || clean(payment.currency).toUpperCase() || "INR";
  const exchangeRate = resolveExchangeRate(currency, payment.exchangeRate);
  const invoiceValueInr = invoiceValueInInr(draft.amountPaid, exchangeRate);
  return {
    paymentObjectId: payment.id,
    paymentId: payment.paymentId,
    paymentLinkId: payment.paymentLinkId,
    date: formatSheetDate(paymentEffectiveDate(payment)),
    customerName: draft.customerName,
    contactNumber: draft.contactNumber,
    email: draft.email,
    propertyAddress: firstNonEmpty(booking?.address, property?.address, booking?.propertyName),
    country: clean(property?.country),
    invoiceNumber: draft.invoiceNumber,
    amountPaid: draft.amountPaid,
    currency,
    amountPaidLabel: formatAmountPaid(draft.amountPaid, currency),
    mode: formatPaymentMode(payment.method),
    exchangeRate,
    invoiceValueInr,
    invoiceValueLabel: formatInvoiceValueInr(invoiceValueInr),
    agent,
  };
}

export function buildSalesSheetRows(
  payments: SalesSheetSourcePayment[],
  lookups: SalesSheetLookups,
): Omit<SalesSheetRow, "serial">[] {
  const rows: Omit<SalesSheetRow, "serial">[] = [];

  for (const payment of payments) {
    const booking = payment.bookingObjectId
      ? lookups.bookingsById[payment.bookingObjectId]
      : undefined;
    const visit = booking?.visitId ? lookups.visitsById[booking.visitId] : undefined;
    const property = propertyForPayment(payment, booking, lookups);
    const agent = clean(visit?.agentName);
    const invoices = invoicesForPayment(payment, lookups);

    if (invoices.length === 0) {
      const email = firstNonEmpty(payment.guestEmail, payment.customerEmail);
      const guest = findGuest(booking, payment.guestId, email);
      rows.push(
        toRow(
          payment,
          {
            customerName: firstNonEmpty(payment.guestName, guest?.name, payment.customerName),
            contactNumber: firstNonEmpty(guest?.phone, payment.customerPhone),
            email: firstNonEmpty(email, guest?.email),
            invoiceNumber: fallbackInvoiceNumber(payment),
            amountPaid: payment.amount,
            currency: payment.currency,
          },
          booking,
          property,
          agent,
        ),
      );
      continue;
    }

    for (const invoice of invoices) {
      const email = firstNonEmpty(invoice.guestEmail, payment.guestEmail, payment.customerEmail);
      const guest = findGuest(booking, invoice.guestId ?? payment.guestId, email);
      rows.push(
        toRow(
          payment,
          {
            customerName: firstNonEmpty(
              invoice.guestName,
              payment.guestName,
              guest?.name,
              payment.customerName,
            ),
            contactNumber: firstNonEmpty(
              invoice.guestPhone,
              guest?.phone,
              payment.customerPhone,
            ),
            email: firstNonEmpty(email, guest?.email),
            invoiceNumber: clean(invoice.invoiceNumber) || fallbackInvoiceNumber(payment),
            amountPaid: invoice.amountBilled,
            currency: invoice.currency || payment.currency,
          },
          booking,
          property,
          agent,
        ),
      );
    }
  }

  return rows;
}

export function rowMatchesSearch(row: Omit<SalesSheetRow, "serial">, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const compactQuery = query.replace(/\s+/g, "");
  const fields = [
    row.customerName,
    row.contactNumber,
    row.email,
    row.propertyAddress,
    row.country,
    row.invoiceNumber,
    row.mode,
    row.agent,
    row.amountPaidLabel,
    row.paymentId ?? "",
    row.paymentLinkId ?? "",
  ];
  const haystack = fields.join(" ").toLowerCase();
  if (haystack.includes(query)) return true;
  return haystack.replace(/\s+/g, "").includes(compactQuery);
}

export function withSerialNumbers(
  rows: Omit<SalesSheetRow, "serial">[],
): SalesSheetRow[] {
  return rows.map((row, index) => ({ ...row, serial: index + 1 }));
}

const CSV_HEADERS = [
  "S No",
  "Date",
  "Customer Name",
  "Contact number",
  "E mail ID",
  "Customer Prop Address",
  "Country",
  "Invoice Number",
  "Amount Paid",
  "Mode",
  "EXCH RATE",
  "INVOICE VALUE IN RS",
  "Agent",
] as const;

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function salesSheetToCsv(rows: SalesSheetRow[]): string {
  const lines = [CSV_HEADERS.map((header) => csvCell(header)).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.serial,
        row.date,
        row.customerName,
        row.contactNumber,
        row.email,
        row.propertyAddress,
        row.country,
        row.invoiceNumber,
        row.amountPaidLabel,
        row.mode,
        row.exchangeRate == null ? "" : formatExchangeRate(row.exchangeRate),
        row.invoiceValueLabel,
        row.agent,
      ]
        .map((value) => csvCell(value))
        .join(","),
    );
  }
  return lines.join("\n");
}

export function sumInvoiceValueInr(rows: Array<Pick<SalesSheetRow, "invoiceValueInr">>): number {
  const total = rows.reduce((sum, row) => sum + (row.invoiceValueInr ?? 0), 0);
  return Math.round(total * 100) / 100;
}
