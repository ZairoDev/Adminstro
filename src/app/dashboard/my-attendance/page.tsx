import { Suspense } from "react";
import MyAttendanceClient from "./my-attendance-client";
import { MyAttendanceSkeleton } from "./my-attendance-skeleton";

export default function MyAttendancePage() {
  return (
    <Suspense fallback={<MyAttendanceSkeleton />}>
      <MyAttendanceClient />
    </Suspense>
  );
}
