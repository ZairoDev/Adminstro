import { Suspense } from "react";
import ExpenseGridClient from "./expense-grid-client";

export default function FinanceExpenseSheetPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading the expense sheet…</div>}>
      <ExpenseGridClient />
    </Suspense>
  );
}
