"use client";

import { cn } from "@/lib/utils";
import { ClipboardList, MapPin, Bell } from "lucide-react";

type CrmQuickActionsBarProps = {
  onOpenDisposition?: () => void;
  onOpenSetVisit?: () => void;
  onOpenReminder?: () => void;
  className?: string;
};

const ACTION_BUTTONS: Array<{
  key: keyof CrmQuickActionsBarProps;
  label: string;
  Icon: React.ElementType;
  color: string;
}> = [
  {
    key: "onOpenDisposition",
    label: "Disposition",
    Icon: ClipboardList,
    color: "text-[#00a884]",
  },
  {
    key: "onOpenSetVisit",
    label: "Visit",
    Icon: MapPin,
    color: "text-blue-500",
  },
  {
    key: "onOpenReminder",
    label: "Reminder",
    Icon: Bell,
    color: "text-violet-500",
  },
];

export function CrmQuickActionsBar({
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
  className,
}: CrmQuickActionsBarProps) {
  const handlers: Partial<Record<keyof CrmQuickActionsBarProps, (() => void) | undefined>> = {
    onOpenDisposition,
    onOpenSetVisit,
    onOpenReminder,
  };

  const visible = ACTION_BUTTONS.filter((btn) => Boolean(handlers[btn.key]));
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto scrollbar-none",
        "border-b border-[#e9edef] dark:border-[#222d34]",
        "bg-[#f0f2f5] dark:bg-[#202c33]",
        "px-3 py-1.5",
        className,
      )}
    >
      {visible.map(({ key, label, Icon, color }) => {
        const handler = handlers[key] as (() => void) | undefined;
        return (
          <button
            key={key}
            type="button"
            onClick={handler}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium shrink-0",
              "bg-white dark:bg-[#2a3942]",
              "border border-[#e9edef] dark:border-[#374045]",
              "text-[#54656f] dark:text-[#aebac1]",
              "hover:bg-[#f0f2f5] dark:hover:bg-[#374045]",
              "transition-colors duration-150",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", color)} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
