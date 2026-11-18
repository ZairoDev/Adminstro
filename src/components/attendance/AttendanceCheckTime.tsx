"use client";

import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttendanceDeviceIcon } from "@/components/attendance/AttendanceDeviceIcon";
import {
  attendanceDeviceLabel,
  type AttendanceDevice,
} from "@/util/attendanceDevice";

type AttendanceCheckTimeProps = {
  kind: "in" | "out";
  timeLabel: string | null | undefined;
  timeIso?: string | null;
  device: AttendanceDevice | null | undefined;
  showEmpty?: boolean;
  /** Show LogIn / LogOut icon. Hide when the column header already names the action. */
  showKindIcon?: boolean;
  /** Show device icon beside the time (table). Calendar keeps icon in tooltip only. */
  showDevice?: boolean;
  className?: string;
};

function formatIstClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function AttendanceCheckTime({
  kind,
  timeLabel,
  timeIso,
  device,
  showEmpty = false,
  showKindIcon = true,
  showDevice = false,
  className,
}: AttendanceCheckTimeProps) {
  const resolved =
    (timeLabel && timeLabel.trim()) ||
    (timeIso ? formatIstClock(timeIso) : "");

  if (!resolved && !showEmpty) return null;

  const Icon = kind === "in" ? LogIn : LogOut;
  const verb = kind === "in" ? "Check-in" : "Check-out";
  const deviceText = attendanceDeviceLabel(device);

  return (
    <p
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-[11px] leading-4 tabular-nums sm:text-xs",
        resolved ? "text-foreground" : "text-muted-foreground/70",
        className,
      )}
      title={
        resolved
          ? `${verb} ${resolved}${deviceText ? ` · ${deviceText}` : ""}`
          : `${verb} pending`
      }
    >
      {showKindIcon && resolved ? (
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      {showDevice && resolved ? (
        <AttendanceDeviceIcon device={device} />
      ) : null}
      <span className="min-w-0 truncate font-medium tabular-nums">
        {resolved || "—"}
      </span>
    </p>
  );
}
