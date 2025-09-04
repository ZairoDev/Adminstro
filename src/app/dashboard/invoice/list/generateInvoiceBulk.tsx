import { generateInvoicePdf } from "../components/invoice-pdf";
import { ComputedTotals, InvoiceData } from "../page";

export async function generateBulkPdfs(invoices: InvoiceData[]) {
  for (const inv of invoices) {
    const computed: ComputedTotals = {
      subTotal: inv.amount,
      taxes: { sgst: 0, cgst: 0, igst: 0 },
      total: inv.amount,
    };

    generateInvoicePdf(inv, computed); // this will trigger download directly
  }
}
