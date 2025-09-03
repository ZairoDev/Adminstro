// utils/invoice-pdf.ts
import pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";

import type { InvoiceData, ComputedTotals } from "@/app/dashboard/invoice/page";


(pdfMake as any).vfs = (pdfFonts as any).vfs;

export function generateInvoicePdf(
  value: InvoiceData,
  computed: ComputedTotals
) {
  const docDefinition: any = {
    content: [
      { text: "Invoice", style: "header" },
      {
        columns: [
          [
            { text: "From", style: "subheader" },
            { text: "Vacation Saga" },
            { text: "Zairo International Pvt Ltd" },
            { text: "GSTIN-09AABCZ0555F1ZC" },
          ],
          [
            { text: "Invoice No: " + (value.invoiceNo || "-") },
            { text: "Date: " + (value.invoiceDate || "-") },
          ],
        ],
      },
      { text: "Bill To:", style: "subheader", margin: [0, 20, 0, 8] },
      `${value.name}\n${value.email}\n${value.phoneNumber}\n${value.address}`,
      {
        style: "table",
        table: {
          widths: ["*", "auto", "auto"],
          body: [
            ["Description", "SAC Code", "Amount"],
            [
              value.description || value.bookingType,
              value.sacCode || "-",
              `₹${value.amount}`,
            ],
          ],
        },
      },
      {
        style: "totals",
        table: {
          widths: ["*", "auto"],
          body: [
            ["Subtotal", `₹${computed.subTotal}`],
            ["IGST", `₹${computed.taxes.igst}`],
            ["CGST", `₹${computed.taxes.cgst}`],
            ["SGST", `₹${computed.taxes.sgst}`],
            [
              { text: "Total", bold: true },
              { text: `₹${computed.total}`, bold: true },
            ],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 20, 0, 0],
      },
      {
        text: "Bank Details",
        style: "subheader",
        margin: [0, 20, 0, 8],
      },
      "Bank: IDFC FIRST\nAccount Name: ZAIRO INTERNATIONAL PRIVATE LIMITED\nAccount Number: 10031778526\nIFSC: IDFB0021271\nBranch: Kanpur",
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
      table: { margin: [0, 15, 0, 15] },
      totals: { margin: [0, 20, 0, 0] },
    },
  };

  // 📥 Open in new tab
  pdfMake.createPdf(docDefinition).open();

  // 📥 Or trigger download
  // pdfMake.createPdf(docDefinition).download(`${value.invoiceNo || "invoice"}.pdf`);
}
