"use client";

import { Suspense } from "react";
import WhatsAppChat from "./whatsapp";

function WhatsAppSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 border-b border-border/50"
          >
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-48 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-8 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border flex items-center px-4 gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
        <div className="h-16 border-t border-border bg-background" />
      </div>
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <div className="h-screen w-screen md:h-[110dvh] md:w-[110.5dvw] overflow-hidden">
      <Suspense fallback={<WhatsAppSkeleton />}>
        <WhatsAppChat />
      </Suspense>
    </div>
  );
}
