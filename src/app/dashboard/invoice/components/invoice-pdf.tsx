import pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import { COMPANY_INFO } from "./invoice-shared";
import type { ComputedTotals, InvoiceData } from "../page";

(pdfMake as any).vfs = (pdfFonts as any).vfs;

export function generateInvoicePdf(
  value: InvoiceData,
  computed: ComputedTotals
) {
  const isPaid = value.status === "paid";

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: [
      // PAID Stamp
      ...(isPaid
        ? [
            {
              text: "PAID",
              color: "#F97316",
              bold: true,
              fontSize: 24,
              alignment: "right",
              margin: [0, 0, 0, 20],
            },
          ]
        : []),

      // Header: Logo + Company Info
      {
        columns: [
          {
            image:
              "data:image/png;base64,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", // Replace with base64 logo if available
            width: 48,
            height: 48,
          },
          {
            stack: [
              { text: "Vacation Saga", bold: true, fontSize: 18 },
              { text: "Create your own saga", fontSize: 12 },
            ],
            margin: [10, 0, 0, 0],
          },
          {
            stack: [
              { text: "Zairo International Pvt Ltd", fontSize: 14 },
              { text: "GSTIN-09AABCZ0555F1ZC", fontSize: 12 },
              { text: "CIN- U93090UP2017PTCO89137", fontSize: 12 },
              {
                text: value?.companyAddress ? value.companyAddress : "-",
                fontSize: 12,
              },
            ],
            alignment: "right",
          },
        ],
      },

      // Bill To & Invoice Meta
      {
        columns: [
          {
            stack: [
              { text: "Bill To", bold: true, margin: [0, 20, 0, 5] },
              { text: "Name: " + (value.name ? value.name : "-"), bold: true },
              ...(value.email ? [{ text: "Email: " + value.email }] : []),
              ...(value.phoneNumber
                ? [{ text: "Phone Number: " + value.phoneNumber }]
                : []),
              ...(value.address ? [{ text: "Address: " + value.address }] : []),
              ...(value.nationality
                ? [{ text: "Nationality: " + value.nationality }]
                : []),
            ],
          },
          {
            stack: [
              {
                text: "Export Invoice",
                bold: true,
                alignment: "right",
                margin: [0, 20, 0, 5],
              },
              {
                text: `Invoice No: ${value.invoiceNumber || "-"}`,
                alignment: "right",
              },
              { text: `Date: ${value.date || "-"}`, alignment: "right" },
            ],
            alignment: "right",
          },
        ],
      },

      // Invoice Table
      {
        style: "table",
        table: {
          headerRows: 1,
          widths: ["40%", "25%", "20%", "15%"],
          body: [
            [
              { text: "Description", bold: true },
              { text: "SAC Code", bold: true, alignment: "center" },
              { text: "", bold: true, alignment: "center" },
              { text: "Amount", bold: true, alignment: "right" },
            ],
            [
              { text: value.description || value.bookingType || "-" },
              { text: value.sacCode || "-", alignment: "center" },
              { text: "", alignment: "center" },
              { text: `€${value.amount || "0.00"}`, alignment: "right" },
            ],
            [
              { text: `Check In: ${value.checkIn || "-"}`, colSpan: 4 },
              {},
              {},
              {},
            ],
            [
              { text: `Check Out: ${value.checkOut || "-"}`, colSpan: 4 },
              {},
              {},
              {},
            ],
            [
              {},
              {},
              { text: "Sub Total:", alignment: "right" },
              { text: `€${computed.subTotal || "0.00"}`, alignment: "right" },
            ],
            [
              {},
              {},
              { text: "SGST:", alignment: "right" },
              { text: `€${computed.taxes.sgst || "0.00"}`, alignment: "right" },
            ],
            [
              {},
              {},
              { text: "CGST:", alignment: "right" },
              { text: `€${computed.taxes.cgst || "0.00"}`, alignment: "right" },
            ],
            [
              {},
              {},
              { text: "IGST:", alignment: "right" },
              { text: `€${computed.taxes.igst || "0.00"}`, alignment: "right" },
            ],
            [
              {},
              {},
              { text: "Total:", bold: true, alignment: "right" },
              {
                text: `€${computed.total || "0.00"}`,
                bold: true,
                alignment: "right",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: function (i: any, node: any) {
            // Dark lines: below heading (i === 1) and above Total row
            if (i === 1 || i === node.table.body.length - 1) {
              return 1.5; // thicker dark lines
            }
            return 0.5; // thinner lines for others
          },
          hLineColor: function (i: any, node: any) {
            // Dark lines: below heading and above Total row
            if (i === 1 || i === node.table.body.length - 1 || i=== node.table.body.length ) {
              return "#000000"; // dark black line
            }
            return "#cccccc"; // light gray for others
          },
          vLineWidth: function () {
            return 0;
          },
          paddingLeft: function () {
            return 5;
          },
          paddingRight: function () {
            return 5;
          },
        },
        margin: [0, 20, 0, 0],
      },
      // Bank Details & Contact
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "Bank Details", bold: true, margin: [0, 20, 0, 5] },
              {
                text: `Bank Name: ${COMPANY_INFO.bank.bankName}
Account Name: ${COMPANY_INFO.bank.accountName}
Account Number: ${COMPANY_INFO.bank.accountNumber}
IFSC: ${COMPANY_INFO.bank.ifsc}
SWIFT: ${COMPANY_INFO.bank.swift}
Branch: ${COMPANY_INFO.bank.branch}`,
                fontSize: 10,
              },
            ],
          },
        ],
        columnGap: 20,
      },
    ],
    footer: {
      text: "For TERMS AND CONDITIONS please visit our website. For any other assistance contact us on: support@vacationsaga.com www.vacationsaga.com",
      alignment: "center",
      fontSize: 8,
      margin: [40, 0, 40, 20],
    },
  };

  pdfMake.createPdf(docDefinition).open();
}
