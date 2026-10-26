import { Suspense } from "react";
import SalariesClient from "./salaries-client";

export default function FinanceSalariesPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <SalariesClient />
    </Suspense>
  );
}
