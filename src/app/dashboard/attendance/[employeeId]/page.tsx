import { Suspense } from "react";
import MyAttendanceClient from "@/app/dashboard/my-attendance/my-attendance-client";
import { MyAttendanceSkeleton } from "@/app/dashboard/my-attendance/my-attendance-skeleton";

type PageProps = { params: { employeeId: string } };

export default function EmployeeAttendancePage({ params }: PageProps) {
  return (
    <Suspense fallback={<MyAttendanceSkeleton />}>
      <MyAttendanceClient employeeId={params.employeeId} />
    </Suspense>
  );
}
