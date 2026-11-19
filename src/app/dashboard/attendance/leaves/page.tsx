import { Suspense } from "react";
import LeavesClient from "./leaves-client";

export default function LeaveRequestsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading leave requests…</div>}>
      <LeavesClient />
    </Suspense>
  );
}
