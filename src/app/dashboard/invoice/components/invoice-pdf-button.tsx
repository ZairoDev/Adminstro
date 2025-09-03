"use client";

import { Button } from "@/components/ui/button";
// import { generateInvoicePdf } from "@/utils/invoice-pdf";
import type { InvoiceData, ComputedTotals } from "@/app/dashboard/invoice/page";
import { generateInvoicePdf } from "./invoice-pdf";

export default function InvoicePdfButton({
  value,
  computed,
}: {
  value: InvoiceData;
  computed: ComputedTotals;
}) {
  const handleDownload = () => {
    generateInvoicePdf(value, computed);
  };

  return (
    <Button size="sm" onClick={handleDownload}>
      Download PDF
    </Button>
  );
}
