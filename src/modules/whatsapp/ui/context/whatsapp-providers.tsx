"use client";

import type { ReactNode } from "react";
import { ConversationListProvider } from "./conversation-list-context";
import { ActiveThreadProvider } from "./active-thread-context";
import { WhatsAppUIProvider } from "./whatsapp-ui-context";

export function WhatsAppProviders({ children }: { children: ReactNode }) {
  return (
    <ConversationListProvider>
      <ActiveThreadProvider>
        <WhatsAppUIProvider>{children}</WhatsAppUIProvider>
      </ActiveThreadProvider>
    </ConversationListProvider>
  );
}
