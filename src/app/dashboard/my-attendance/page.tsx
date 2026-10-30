import { Suspense } from "react";
import EmployeeAttendanceClient from "../attendance/employee-attendance-client";

export default function MyAttendancePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading attendance…</div>}>
      <EmployeeAttendanceClient selfService />
    </Suspense>
  );
}
