"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePendingLeaveDecisions } from "@/hooks/usePendingLeaveDecisions";

function waitingLabel(count: number): string {
  return count === 1
    ? "1 leave request needs a decision"
    : `${count} leave requests need a decision`;
}

export function LeaveDecisionNav() {
  const { count } = usePendingLeaveDecisions();
  if (count <= 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950"
      asChild
    >
      <Link href="/dashboard/attendance/leaves" aria-label={waitingLabel(count)}>
        Leave
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      </Link>
    </Button>
  );
}
