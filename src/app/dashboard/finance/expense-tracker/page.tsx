import { Suspense } from "react";
import ExpenseSheetClient from "../expense-sheet/expense-sheet-client";

export default function FinanceExpenseTrackerPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading the expense tracker…</div>}>
      <ExpenseSheetClient />
    </Suspense>
  );
}
