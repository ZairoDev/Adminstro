"use client";

import { useMemo, useRef, useState } from "react";
import { InvoiceForm } from "./invoice-form";
import { InvoicePreview } from "./invoice-preview";
import { computeTotals, eur } from "./format";
import type { InvoiceData } from "../page";
import InvoicePdfButton from "./invoice-pdf-button";
// import type { InvoiceData } from "./types";

const INITIAL_DATA: InvoiceData = {
  // Customer
  name: "",
  email: "",
  phoneNumber: "",
  address: "",

  // Financials
  amount: 0,
  sgst: 0,
  igst: 0,
  cgst: 0,
  totalAmount: 0,
  status: "unpaid",

  // Booking
  checkIn: "",
  checkOut: "",
  bookingType: "Booking Commission",

  // Company & meta
  companyAddress: "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
  invoiceNo: "",
  invoiceDate: "",
  sacCode: 1,
  description: "Booking Commission",
};

export default function InvoiceBuilder() {
  const [data, setData] = useState<InvoiceData>(INITIAL_DATA);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const computed = useMemo(() => {
    const totals = computeTotals({
      amount: data.amount,
      sgst: data.sgst,
      igst: data.igst,
      cgst: data.cgst,
    });
    return totals;
  }, [data.amount, data.sgst, data.igst, data.cgst]);

  const onChange = (patch: Partial<InvoiceData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const fillSample = () =>
    setData((prev) => ({
      ...prev,
      name: "Iris Mexicana",
      email: "Irinaeg22@gmail.com",
      phoneNumber: "+30 697052 3763",
      address: "Ipsilántou 66, Pireas 185 32",
      description: "Booking Commission",
      persons: 1,
      unitPrice: 350,
      amount: 350,
      sgst: 0,
      igst: 0,
      cgst: 0,
      status: "paid",
      invoiceNo: "ZI-770",
      invoiceDate: "2025-08-25",
      checkIn: "2025-08-26",
      checkOut: "2026-08-25",
      companyAddress: "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
    }));

  const printInvoice = () => window.print();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border bg-card p-4 print:hidden">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invoice Details</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fillSample}
              className="rounded-md bg-muted px-3 py-1.5 text-sm"
            >
              Fill Sample
            </button>
            <button
              type="button"
              onClick={printInvoice}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Print / Save PDF
            </button>
            <InvoicePdfButton value={data} computed={computed} />
          </div>
        </div>
        <InvoiceForm value={data} onChange={onChange} computed={computed} />
      </div>

      <div
        ref={invoiceRef}
        className="rounded-lg border bg-white p-4 print:border-0 print:p-0 print:shadow-none"
      >
        <InvoicePreview
          value={data}
          computed={computed}
          currencyFormatter={eur}
        />
      </div>
    </div>
  );
}
