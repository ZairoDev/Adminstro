"use client";

import Image from "next/image";
import { eur, formatDisplayDate } from "./format";
import type { ComputedTotals, InvoiceData } from "../page";
import { COMPANY_INFO } from "./invoice-shared";

type Props = {
  value: InvoiceData;
  computed: ComputedTotals;
  currencyFormatter: (n: number) => string;
};

export function InvoicePreview({ value, computed }: Props) {
  const isPaid = value.status === "paid";

  return (
    <div
      className="relative mx-auto max-w-[900px] bg-white p-6 text-black print:p-8 border border-gray-200 shadow"
      aria-label="Invoice preview"
    >
      {/* PAID Stamp */}
      {isPaid && (
        <div className="absolute right-6 top-6 rotate-[-12deg] rounded border-2 border-orange-500 px-6 py-2 text-xl font-bold uppercase text-orange-600 opacity-90">
          PAID
        </div>
      )}

      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Image
            src="/vsround.png"
            alt="Vacation Saga logo"
            width={48}
            height={48}
            className="rounded"
          />
          <div>
            <h1 className="text-xl font-bold">{COMPANY_INFO.company.title}</h1>
            {COMPANY_INFO.company.tagline && (
              <p className="text-sm text-gray-600">
                {COMPANY_INFO.company.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="text-right text-sm space-y-1">
          <div className="font-medium">{COMPANY_INFO.company.legalName}</div>
          <div>{COMPANY_INFO.company.gstin}</div>
          <div>{COMPANY_INFO.company.cin}</div>
          <div className="mt-1">{COMPANY_INFO.companyAddress}</div>
        </div>
      </header>

      {/* Bill To & Meta */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 border-b pb-4">
        {/* Bill To */}
        <div>
          <h2 className="text-sm font-semibold">Bill To</h2>
          <div className="mt-1 space-y-1">
            <div className="font-medium">Name: {value.name || "-"}</div>
            {value.email && <div className="text-sm">Email: {value.email}</div>}
            {value.phoneNumber && (
              <div className="text-sm">Phone Number: {value.phoneNumber}</div>
            )}
            {value.address && (
              <div className="text-sm">Address: {value.address}</div>
            )}
            {value.nationality && (
              <div className="text-sm">Nationality: {value.nationality}</div>
            )}
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="md:text-right">
          <h2 className="text-sm font-semibold">Export Invoice</h2>
          <div className="text-sm">
            <span className="font-medium">Invoice No.: </span>
            <span>{value.invoiceNumber || "-"}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Date: </span>
            <span>{formatDisplayDate(value.date) || "-"}</span>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2 text-left">Description</th>
                <th className="border px-3 py-2 text-center">SAC Code</th>
                <th className="border px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-3 py-2">
                  <span className="font-medium">Service:</span>{" "}
                  <span className="text-gray-600">
                    {value.description || value.bookingType}
                  </span>
                </td>
                <td className="border px-3 py-2 text-center">
                  {value.sacCode || "-"}
                </td>
                <td className="border px-3 py-2 text-right">
                  {eur(value.amount)}
                </td>
              </tr>
              <tr>
                <td className="border px-3 py-2">
                  <span className="font-medium">Check In:</span>{" "}
                  <span className="text-gray-600">
                    {value.checkIn ? formatDisplayDate(value.checkIn) : "-"}
                  </span>
                </td>
                <td className="border px-3 py-2"></td>
                <td className="border px-3 py-2"></td>
              </tr>
              <tr>
                <td className="border px-3 py-2">
                  <span className="font-medium">Check Out:</span>{" "}
                  <span className="text-gray-600">
                    {value.checkOut ? formatDisplayDate(value.checkOut) : "-"}
                  </span>
                </td>
                <td className="border px-3 py-2 text-right">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Sub Total:</span>
                      <span>{eur(computed.subTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span>{eur(computed.taxes.sgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span>{eur(computed.taxes.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IGST:</span>
                      <span>{eur(computed.taxes.igst)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{eur(computed.total)}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Bank Details */}
      <section className="mt-6 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 border-t pt-4">
        <div>
          <div className="font-medium">Bank Details</div>
          <div>Bank Name: {COMPANY_INFO.bank.bankName}</div>
          <div>Account Name: {COMPANY_INFO.bank.accountName}</div>
          <div>Account Number: {COMPANY_INFO.bank.accountNumber}</div>
          <div>IFSC: {COMPANY_INFO.bank.ifsc}</div>
          <div>SWIFT Code: {COMPANY_INFO.bank.swift}</div>
          <div>Branch: {COMPANY_INFO.bank.branch}</div>
        </div>
        <div className="md:text-right text-sm space-y-1">
          <div>*For TERMS AND CONDITIONS please visit our website.</div>
          <div>
            For assistance contact:{" "}
            <a
              className="underline"
              href={`mailto:${COMPANY_INFO.company.supportEmail}`}
            >
              {COMPANY_INFO.company.supportEmail}
            </a>
          </div>
          <div>
            <a
              className="underline"
              href={`https://${COMPANY_INFO.company.website}`}
            >
              {COMPANY_INFO.company.website}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
