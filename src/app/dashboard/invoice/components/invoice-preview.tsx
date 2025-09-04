"use client";

import Image from "next/image";
import { eur, formatDisplayDate } from "./format";
import type { ComputedTotals, InvoiceData } from "../page";
import { COMPANY_INFO } from "./invoice-shared";
// import { COMPANY_INFO } from "./invoice-shared";

type Props = {
  value: InvoiceData;
  computed: ComputedTotals;
  currencyFormatter: (n: number) => string;
};

export function InvoicePreview({ value, computed }: Props) {
  const isPaid = value.status === "paid";

  return (
    <div
      className="relative mx-auto max-w-[900px] bg-white p-6 text-black print:p-8"
      aria-label="Invoice preview"
    >
      {/* PAID stamp */}
      {isPaid && (
        <div
          aria-label="Paid stamp"
          className="pointer-events-none absolute right-6 top-6 rotate-[-12deg] rounded border-2 border-orange-500 px-6 py-2 text-xl font-bold uppercase text-orange-600 opacity-90"
        >
          PAID
        </div>
      )}

      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/vsround.png"
            alt="Vacation Saga logo"
            width={48}
            height={48}
            className="rounded"
          />
          <div>
            <h1 className="text-xl font-semibold">
              {COMPANY_INFO.company.title}
            </h1>
            {COMPANY_INFO.company.tagline && (
              <p className="text-sm leading-5 text-neutral-600">
                {COMPANY_INFO.company.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="text-right text-sm">
          <div className="font-medium">{COMPANY_INFO.company.legalName}</div>
          <div>{COMPANY_INFO.company.gstin}</div>
          <div>{COMPANY_INFO.company.cin}</div>
          <div className="mt-1">{COMPANY_INFO.companyAddress}</div>
        </div>
      </header>

      {/* Meta */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium">Bill TO</div>
          <div className="mt-1">
            <div className="font-medium">{value.name || "-"}</div>
            {value.email && <div className="text-sm">{value.email}</div>}
            {value.phoneNumber && (
              <div className="text-sm">{value.phoneNumber}</div>
            )}
            {value.address && <div className="text-sm">{value.address}</div>}
          </div>
        </div>

        <div className="md:text-right">
          <div className="text-md">
            <span className="font-medium">Export Invoice </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Invoice No. </span>
            <span>{value.invoiceNumber || "-"}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Date </span>
            <span>{formatDisplayDate(value.invoiceDate) || "-"}</span>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="border px-3 py-2">Description</th>
                <th className="border px-3 py-2 text-right">SAC Code</th>
                <th className="border px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-3 py-2">
                  <div className="flex flex-row gap-3">
                    <span className="font-medium">Service:</span>
                    <span className="text-gray-600">
                      {value.description || value.bookingType}
                    </span>
                  </div>
                </td>
                <td className="border px-3 py-2 text-right">
                  {value.sacCode || 0}
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
              </tr>
              <tr>
                <td className="border px-3 py-2">
                  <span className="font-medium">Check Out:</span>{" "}
                  <span className="text-gray-600">
                    {value.checkOut ? formatDisplayDate(value.checkOut) : "-"}
                  </span>
                </td>
                <td className="border px-3 py-2 text-right ">
                  <div className="w-full max-w-sm text-sm">
                    <div className="flex items-center justify-between">
                      <span>Sub Total :</span>
                      <span>{eur(computed.subTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SGST :</span>
                      <span>{eur(computed.taxes.sgst)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>CGST :</span>
                      <span>{eur(computed.taxes.cgst)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>IGST :</span>
                      <span>{eur(computed.taxes.igst)}</span>
                    </div>
                    <div className="flex items-center justify-between font-medium">
                      <span>Total :</span>
                      <span>{eur(computed.total)}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Bank details */}
      <section className="mt-6 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <div>
          <div className="font-medium">Bank Details</div>
          <div>Bank name: {COMPANY_INFO.bank.bankName}</div>
          <div>Name: {COMPANY_INFO.bank.accountName}</div>
          <div>Account number: {COMPANY_INFO.bank.accountNumber}</div>
          <div>IFSC: {COMPANY_INFO.bank.ifsc}</div>
          <div>SWIFT code: {COMPANY_INFO.bank.swift}</div>
          <div>Branch: {COMPANY_INFO.bank.branch}</div>
        </div>
        <div className="md:text-right">
          <div className="text-sm">
            *For TERMS AND CONDITIONS please visit our website.
          </div>
          <div>
            For any other assistance contact us on:{" "}
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
