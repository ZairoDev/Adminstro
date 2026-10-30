import { Suspense } from "react";
import AttendanceClient from "./attendance-client";

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading attendance…</div>}>
      <AttendanceClient />
    </Suspense>
  );
}
