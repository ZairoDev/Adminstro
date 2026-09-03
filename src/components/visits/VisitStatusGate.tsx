"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { isVisitStatusGateEscapePath } from "@/lib/visits/visitStatus";
import { OverdueVisitInbox } from "./OverdueVisitInbox";
import { OverdueVisitsBanner } from "./OverdueVisitsBanner";
import { useVisitOverdue } from "./VisitOverdueContext";

interface VisitStatusGateProps {
  children: ReactNode;
}

export function VisitStatusGate({ children }: VisitStatusGateProps) {
  const pathname = usePathname();
  const { status } = useVisitOverdue();
  const isEscapePath = isVisitStatusGateEscapePath(pathname);

  if (status === "loading") {
    return (
      <div className="w-full space-y-4 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (status === "blocked" && !isEscapePath) {
    return <OverdueVisitInbox />;
  }

  if (status === "blocked" && isEscapePath) {
    return (
      <>
        <OverdueVisitsBanner />
        {children}
      </>
    );
  }

  return <>{children}</>;
}
