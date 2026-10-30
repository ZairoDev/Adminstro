import { Suspense } from "react";
import AttendanceSettingsClient from "./settings-client";

export default function AttendanceSettingsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading settings…</div>}>
      <AttendanceSettingsClient />
    </Suspense>
  );
}
