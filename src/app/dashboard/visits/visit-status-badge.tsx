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
    return "border-transparent bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (outcome === "no_show") {
    return "border-transparent bg-slate-200 text-slate-800 hover:bg-slate-200";
  }

  switch (status) {
    case "scheduled":
      return "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "rescheduled":
      return "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100";
    case "completed":
      return "border-transparent bg-green-100 text-green-800 hover:bg-green-100";
    default:
      return "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100";
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
