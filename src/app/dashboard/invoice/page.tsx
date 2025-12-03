"use client";

import InvoiceBuilder from "./components/invoice-builder";

export type InvoiceStatus = "paid" | "unpaid" | "partially_paid" | "cancelled";

export type InvoiceData = {
  // Customer
  _id?: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  date: string;
  companyAddress: string;

  // Booking
  checkIn: string;
  checkOut: string;
  bookingType: string;
  description: string;

  // Financials (direct values only)
  amount: number; // main service charge
  sgst: number;
  igst: number;
  cgst: number;
  nationality: string;
  totalAmount: number; // final payable
  status: string;
  sacCode: number;
  invoiceNumber?: string ;
};

export type ComputedTotals = {
  subTotal: number;
  total: number;
  taxes: {
    sgst: number;
    igst: number;
    cgst: number;
  };
};

export default function NewInvoicePage() {
  return (
    <main className="mx-auto w-full px-4 py-8">
      <header className="mb-6">
        <h1 className="text-balance text-2xl font-semibold">Create Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Fill the form and preview the invoice. Use Print to save as PDF.
        </p>
      </header>
      <section>
        <InvoiceBuilder />
      </section>
    </main>
  );
}
