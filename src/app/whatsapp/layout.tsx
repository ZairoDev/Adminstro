"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/QueryProvider";

export default function WhatsAppLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
