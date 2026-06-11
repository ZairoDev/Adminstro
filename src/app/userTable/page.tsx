import { Suspense } from "react";
import ManageUserContent from "./ManageUserContent";

export default function TablePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <ManageUserContent />
    </Suspense>
  );
}
