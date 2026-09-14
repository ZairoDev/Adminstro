import { AlertCircle, CalendarDays, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PIP_LEVEL_COLORS,
  PIP_LEVEL_LABELS,
} from "@/lib/email/types";
import type { PIPRecord } from "@/util/type";
interface PipRecordCardProps {
  pip: PIPRecord;
  compact?: boolean;
}
function formatDate(value: string | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}
export function PipRecordCard({ pip, compact = false }: PipRecordCardProps) {
  const concerns = pip.concerns.filter((concern) => concern.trim().length > 0);
  return (
    <article
      className={cn(
        "rounded-xl border bg-card shadow-sm",
        compact ? "p-4" : "p-5 sm:p-6",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Performance Improvement Plan
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {PIP_LEVEL_LABELS[pip.pipLevel]}
          </h2>
        </div>
        <Badge
          variant="outline"
          className={cn("w-fit", PIP_LEVEL_COLORS[pip.pipLevel])}
        >
          {pip.status === "active" ? "Active" : pip.status}
        </Badge>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <CalendarDays
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-foreground">Plan duration</dt>
            <dd className="mt-0.5 text-muted-foreground">
              {formatDate(pip.startDate)} – {formatDate(pip.endDate)}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <UserRound
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-foreground">Issued by</dt>
            <dd className="mt-0.5 text-muted-foreground">{pip.issuedBy}</dd>
          </div>
        </div>
      </dl>
      <section className="mt-5 border-t pt-5" aria-labelledby={`pip-concerns-${pip._id ?? "record"}`}>
        <div className="flex items-center gap-2">
          <AlertCircle
            className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <h3
            id={`pip-concerns-${pip._id ?? "record"}`}
            className="font-semibold text-foreground"
          >
            Concerns raised
          </h3>
        </div>
        {concerns.length > 0 ? (
          <ul className="mt-3 space-y-2 pl-6 text-sm leading-6 text-muted-foreground">
            {concerns.map((concern, index) => (
              <li key={`${pip._id ?? "pip"}-${index}`} className="list-disc pl-1">
                {concern}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No concerns were provided.
          </p>
        )}
      </section>
      {pip.notes?.trim() ? (
        <section className="mt-5 rounded-lg bg-muted/60 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Additional notes
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {pip.notes}
          </p>
        </section>
      ) : null}
    </article>
  );
}