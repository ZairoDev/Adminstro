export interface WhatsAppUIStateValue {
  showDispositionDialog: boolean;
  setShowDispositionDialog: (open: boolean) => void;
  showVisitDialog: boolean;
  setShowVisitDialog: (open: boolean) => void;
  showReminderDialog: boolean;
  setShowReminderDialog: (open: boolean) => void;
  showCrmPanel: boolean;
  setShowCrmPanel: (open: boolean | ((prev: boolean) => boolean)) => void;
  showAddContactModal: boolean;
  setShowAddContactModal: (open: boolean) => void;
  addContactType: "owner" | "guest";
  setAddContactType: (type: "owner" | "guest") => void;
  showForwardDialog: boolean;
  setShowForwardDialog: (open: boolean) => void;
  messagesToForward: string[];
  setMessagesToForward: (ids: string[]) => void;
  forwardingMessages: boolean;
  setForwardingMessages: (value: boolean) => void;
  showTransferDialog: boolean;
  setShowTransferDialog: (open: boolean) => void;
  transferringLead: boolean;
  setTransferringLead: (value: boolean) => void;
  showTemplateDialog: boolean;
  setShowTemplateDialog: (open: boolean) => void;
  desktopNotifyBannerDismissed: boolean;
  setDesktopNotifyBannerDismissed: (value: boolean) => void;
}
