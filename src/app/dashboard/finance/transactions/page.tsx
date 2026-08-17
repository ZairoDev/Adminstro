import { Suspense } from "react";
import FinanceTransactionsClient from "./transactions-client";

export default function FinanceTransactionsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <FinanceTransactionsClient />
    </Suspense>
  );
}
