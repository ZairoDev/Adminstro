import { Suspense } from "react";
import SalarySheetClient from "./salary-sheet-client";

export default function FinanceSalarySheetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading the salary sheet…</div>}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;700&display=swap"
      />
      <SalarySheetClient />
    </Suspense>
  );
}
