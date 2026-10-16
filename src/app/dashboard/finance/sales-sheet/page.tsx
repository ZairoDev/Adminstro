import { Suspense } from "react";
import SalesSheetClient from "./sales-sheet-client";

export default function FinanceSalesSheetPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <SalesSheetClient />
    </Suspense>
  );
}
