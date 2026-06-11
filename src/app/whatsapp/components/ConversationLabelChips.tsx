"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABEL_COLORS: Record<string, string> = {
  "Good To Go": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  Declined: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  "Visit Scheduled": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "Reminder Set": "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  Future: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  "Low Budget": "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/30",
  Blocked: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

export function ConversationLabelChips({
  labels = [],
  className,
  max = 3,
}: {
  labels?: string[];
  className?: string;
  max?: number;
}) {
  if (!labels.length) return null;
  const visible = labels.slice(0, max);
  const overflow = labels.length - visible.length;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((label) => (
        <Badge
          key={label}
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 font-medium border",
            LABEL_COLORS[label] || "bg-muted text-muted-foreground",
          )}
        >
          {label}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
