"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { WhatsAppUIStateValue } from "./whatsapp-ui-context-types";

const WhatsAppUIStateContext = createContext<WhatsAppUIStateValue | null>(null);

export function useWhatsAppUIState(): WhatsAppUIStateValue {
  const ctx = useContext(WhatsAppUIStateContext);
  if (!ctx) {
    throw new Error("useWhatsAppUIState must be used within WhatsAppUIProvider");
  }
  return ctx;
}

export function WhatsAppUIProvider({ children }: { children: ReactNode }) {
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showCrmPanel, setShowCrmPanel] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addContactType, setAddContactType] = useState<"owner" | "guest">("owner");
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<string[]>([]);
  const [forwardingMessages, setForwardingMessages] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferringLead, setTransferringLead] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [desktopNotifyBannerDismissed, setDesktopNotifyBannerDismissed] =
    useState(true);

  useEffect(() => {
    try {
      setDesktopNotifyBannerDismissed(
        localStorage.getItem("whatsapp_desktop_notify_dismissed") === "1",
      );
    } catch {
      setDesktopNotifyBannerDismissed(false);
    }
  }, []);

  const value = useMemo<WhatsAppUIStateValue>(
    () => ({
      showDispositionDialog,
      setShowDispositionDialog,
      showVisitDialog,
      setShowVisitDialog,
      showReminderDialog,
      setShowReminderDialog,
      showCrmPanel,
      setShowCrmPanel,
      showAddContactModal,
      setShowAddContactModal,
      addContactType,
      setAddContactType,
      showForwardDialog,
      setShowForwardDialog,
      messagesToForward,
      setMessagesToForward,
      forwardingMessages,
      setForwardingMessages,
      showTransferDialog,
      setShowTransferDialog,
      transferringLead,
      setTransferringLead,
      showTemplateDialog,
      setShowTemplateDialog,
      desktopNotifyBannerDismissed,
      setDesktopNotifyBannerDismissed,
    }),
    [
      showDispositionDialog,
      showVisitDialog,
      showReminderDialog,
      showCrmPanel,
      showAddContactModal,
      addContactType,
      showForwardDialog,
      messagesToForward,
      forwardingMessages,
      showTransferDialog,
      transferringLead,
      showTemplateDialog,
      desktopNotifyBannerDismissed,
    ],
  );

  return (
    <WhatsAppUIStateContext.Provider value={value}>
      {children}
    </WhatsAppUIStateContext.Provider>
  );
}
