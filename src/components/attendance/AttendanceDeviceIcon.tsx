"use client";

import { Monitor, Smartphone, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  attendanceDeviceLabel,
  type AttendanceDevice,
} from "@/util/attendanceDevice";

const ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  system: Server,
} as const;

type AttendanceDeviceIconProps = {
  device: AttendanceDevice | null | undefined;
  className?: string;
  /** Show label text after the icon. */
  withLabel?: boolean;
};

export function AttendanceDeviceIcon({
  device,
  className,
  withLabel = false,
}: AttendanceDeviceIconProps) {
  if (!device) return null;
  const Icon = ICONS[device];
  const label = attendanceDeviceLabel(device);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-muted-foreground",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {withLabel ? <span className="text-[11px] font-medium">{label}</span> : null}
    </span>
  );
}
