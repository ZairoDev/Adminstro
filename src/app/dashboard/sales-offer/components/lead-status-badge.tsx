"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  "Not Connected":  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Call Back":      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Not Interested": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Language Barrier":"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Send Offer":     "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Reject Lead":    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Blacklist Lead": "bg-rose-200 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  Converted:        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Draft:            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Sent:             "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  offer_sent:       "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Opened:           "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  Accepted:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Rejected:         "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Expired:          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const DEFAULT_STYLE = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

interface LeadStatusBadgeProps {
  status: string;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        style,
        className,
      )}
    >
      {status}
    </span>
  );
}
