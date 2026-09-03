"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useVisitOverdue } from "./VisitOverdueContext";

export function OverdueVisitsBanner() {
  const { count, status } = useVisitOverdue();

  if (status !== "blocked" || count === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">
            {count} {count === 1 ? "visit needs" : "visits need"} a final status.
          </span>{" "}
          Close them here to unlock the rest of the app.
        </p>
      </div>
      <Link
        href="/dashboard/visits?overdue=1"
        className="shrink-0 text-sm font-medium underline underline-offset-2"
      >
        View overdue visits
      </Link>
    </div>
  );
}
