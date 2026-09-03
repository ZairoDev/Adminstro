"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/QueryProvider";
import { VisitOverdueProvider } from "@/components/visits/VisitOverdueContext";
import { VisitStatusGate } from "@/components/visits/VisitStatusGate";

export default function WhatsAppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <VisitOverdueProvider>
        <VisitStatusGate>{children}</VisitStatusGate>
      </VisitOverdueProvider>
    </QueryProvider>
  );
}
