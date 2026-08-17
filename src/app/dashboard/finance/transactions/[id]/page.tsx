import { Suspense } from "react";
import TransactionDetailsClient from "./transaction-details-client";

export default function TransactionDetailsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <TransactionDetailsClient />
    </Suspense>
  );
}
