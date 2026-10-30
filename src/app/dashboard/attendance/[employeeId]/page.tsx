import { Suspense } from "react";
import EmployeeAttendanceClient from "../employee-attendance-client";

type PageProps = { params: { employeeId: string } };

export default function EmployeeAttendancePage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading attendance…</div>}>
      <EmployeeAttendanceClient employeeId={params.employeeId} />
    </Suspense>
  );
}
