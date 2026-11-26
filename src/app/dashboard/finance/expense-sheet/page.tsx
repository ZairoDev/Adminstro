import { Suspense } from "react";
import ExpenseSheetClient from "./expense-sheet-client";

export default function FinanceExpenseSheetPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading the expense sheet…</div>}>
      <ExpenseSheetClient />
    </Suspense>
  );
}
