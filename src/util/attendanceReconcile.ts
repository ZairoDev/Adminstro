import cron from "node-cron";
import { reconcileRecentAttendance } from "@/modules/attendance/service";

const DEFAULT_CRON = "*/15 * * * *";

export function startAttendanceReconcileScheduler(): void {
  const expression = process.env.ATTENDANCE_RECONCILE_CRON ?? DEFAULT_CRON;
  cron.schedule(
    expression,
    () => {
      reconcileRecentAttendance().catch((error: unknown) => {
        console.warn("[attendance] Scheduled reconcile failed:", error);
      });
    },
    { timezone: "Asia/Kolkata" },
  );
  console.log("[attendance] Reconcile scheduler started | cron:", expression);
}
