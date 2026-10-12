"use client";

import type { ReactNode } from "react";
import { ConversationListProvider } from "./ConversationListContext";
import { ActiveThreadProvider } from "./ActiveThreadContext";
import { WhatsAppUIProvider } from "./WhatsAppUIContext";

export function WhatsAppProviders({ children }: { children: ReactNode }) {
  return (
    <ConversationListProvider>
      <ActiveThreadProvider>
        <WhatsAppUIProvider>{children}</WhatsAppUIProvider>
      </ActiveThreadProvider>
    </ConversationListProvider>
  );
}
