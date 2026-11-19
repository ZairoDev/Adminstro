import cron from "node-cron";
import { runMonthlyLeaveAccrual } from "@/modules/attendance/leave/service";
import { reconcileRecentAttendance } from "@/modules/attendance/service";

const DEFAULT_CRON = "*/15 * * * *";
const DEFAULT_LEAVE_ACCRUAL_CRON = "10 0 * * *";

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

/**
 * Credits paid leave for the new month shortly after midnight on the 1st.
 * Accruals are keyed per employee and month, so running it every night is a safe catch-up
 * for a server that was down on the 1st.
 */
export function startLeaveAccrualScheduler(): void {
  const expression = process.env.LEAVE_ACCRUAL_CRON ?? DEFAULT_LEAVE_ACCRUAL_CRON;
  cron.schedule(
    expression,
    () => {
      runMonthlyLeaveAccrual()
        .then((result) => {
          console.log("[leave] Accrual run finished | employees:", result.employees);
        })
        .catch((error: unknown) => {
          console.warn("[leave] Scheduled accrual failed:", error);
        });
    },
    { timezone: "Asia/Kolkata" },
  );
  console.log("[leave] Accrual scheduler started | cron:", expression);
}
