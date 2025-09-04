"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button"; // agar custom button hai
// import { generateBulkPdfSingleFile } from "../lib/generateBulkPdfSingleFile";
import { InvoiceData } from "../page";
import { generateBulkPdfSingleFile } from "./pdf-bulk";


interface BulkPdfButtonProps {
  invoices: InvoiceData[];
}

export default function BulkPdfButton({ invoices }: BulkPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!invoices || invoices.length === 0) return;

    setLoading(true);
    try {
      generateBulkPdfSingleFile(invoices);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? "Generating PDF..." : "Download All Invoices"}
    </Button>
  );
}
