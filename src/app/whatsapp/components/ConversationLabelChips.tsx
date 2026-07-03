"use client";

import { Badge } from "@/components/ui/badge";
import { CRM_LABEL_CHIP_COLORS } from "@/lib/whatsapp/crmLabels";
import { cn } from "@/lib/utils";

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
            CRM_LABEL_CHIP_COLORS[label] || "bg-muted text-muted-foreground",
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
