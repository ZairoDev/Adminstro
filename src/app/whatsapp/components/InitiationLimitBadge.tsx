"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInitiationLimit } from "../hooks/useInitiationLimit";

export function InitiationLimitBadge({
  className,
  refreshKey = 0,
  variant = "badge",
}: {
  className?: string;
  refreshKey?: number;
  variant?: "badge" | "banner";
}) {
  const { status, loading } = useInitiationLimit(refreshKey);

  if (loading || !status?.limited) return null;

  const label = `${status.used} / ${status.limit} new guests today`;
  const remainingLabel =
    status.remaining > 0
      ? `${status.remaining} left to contact`
      : "Daily limit reached";

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 text-[13px]",
          status.atLimit
            ? "text-red-700 dark:text-red-300"
            : "text-[#008069] dark:text-[#00a884]",
          className,
        )}
      >
        <span className="flex items-center gap-2 font-medium min-w-0">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <span
          className={cn(
            "text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full",
            status.atLimit
              ? "bg-red-100 dark:bg-red-900/40"
              : "bg-[#d9fdd3] dark:bg-[#005c4b]",
          )}
        >
          {remainingLabel}
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={status.atLimit ? "destructive" : "secondary"}
            className={cn(
              "gap-1.5 font-normal text-xs px-2.5 py-1 w-full justify-center",
              className,
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {label} · {remainingLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {status.atLimit
            ? "Daily new guest limit reached. Existing chats are unaffected."
            : `${status.remaining} new guest conversation${status.remaining === 1 ? "" : "s"} remaining today.`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
