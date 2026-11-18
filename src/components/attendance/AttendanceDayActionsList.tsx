"use client";

import { cn } from "@/lib/utils";
import { AttendanceDeviceIcon } from "@/components/attendance/AttendanceDeviceIcon";
import {
  attendanceDeviceLabel,
  type AttendanceDevice,
} from "@/util/attendanceDevice";
import type { AttendanceDayAction } from "@/modules/attendance/view";

function formatActionExport(action: AttendanceDayAction): string {
  const verb = action.kind === "login" ? "Login" : "Logout";
  const device = attendanceDeviceLabel(action.device as AttendanceDevice | null);
  return `${verb} ${action.timeLabel}${device ? ` (${device})` : ""}`;
}

/** Login / logout timeline for a day (device + time). */
export function AttendanceDayActionsList({
  actions,
}: {
  actions: AttendanceDayAction[] | undefined;
}) {
  const list = actions ?? [];
  if (list.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No login activity</span>
    );
  }

  return (
    <ul className="space-y-1.5">
      {list.map((action) => {
        const verb = action.kind === "login" ? "Login" : "Logout";
        return (
          <li
            key={`${action.kind}-${action.at}`}
            className="flex min-w-0 items-center gap-1.5 text-xs text-foreground"
            title={formatActionExport(action)}
          >
            <span
              className={cn(
                "shrink-0 font-semibold",
                action.kind === "login" ? "text-[#219B68]" : "text-[#E94C50]",
              )}
            >
              {verb}
            </span>
            <AttendanceDeviceIcon device={action.device} />
            <span className="font-medium tabular-nums">{action.timeLabel}</span>
          </li>
        );
      })}
    </ul>
  );
}
