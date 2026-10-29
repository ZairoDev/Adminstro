import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  VISIT_OUTCOME_LABELS,
  VISIT_STATUS_LABELS,
  type VisitOutcome,
  type VisitStatus,
} from "@/lib/visits/visitStatus";

export function getVisitStatusColor(status: string, outcome?: string): string {
  if (outcome === "cancelled") {
    return "border-transparent bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-950";
  }

  if (outcome === "no_show") {
    return "border-transparent bg-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-800";
  }

  switch (status) {
    case "scheduled":
      return "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-950";
    case "rescheduled":
      return "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-950";
    case "completed":
      return "border-transparent bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-950";
    default:
      return "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-800";
  }
}

function getVisitStatusLabel(status: VisitStatus, outcome?: string): string {
  if (outcome && outcome in VISIT_OUTCOME_LABELS && outcome !== "none") {
    return VISIT_OUTCOME_LABELS[outcome as VisitOutcome];
  }
  return VISIT_STATUS_LABELS[status];
}

export function VisitStatusBadge({
  status,
  outcome,
}: {
  status: VisitStatus | string;
  outcome?: string;
}) {
  const normalized = (status in VISIT_STATUS_LABELS
    ? status
    : "scheduled") as VisitStatus;

  return (
    <Badge
      variant="outline"
      className={cn("w-fit capitalize", getVisitStatusColor(normalized, outcome))}
    >
      {getVisitStatusLabel(normalized, outcome)}
    </Badge>
  );
}
