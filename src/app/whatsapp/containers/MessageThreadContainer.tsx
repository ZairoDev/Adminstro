"use client";

import { memo, useCallback, useRef, useEffect, useState, type MutableRefObject, type RefObject } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import { useLeadSocketEmit } from "@/hooks/useLeadSocketEmit";
import type { CoreWhatsAppDispositionAction } from "@/lib/leads/leadDisposition";
import type { DispositionAppliedResult } from "../components/DispositionDialog";
import { cn } from "@/lib/utils";
import {
  isMessageWindowActive,
  getConversationTemplateContext,
  getConversationBusinessPhoneId,
} from "../utils";
import { repositionConversationAfterUpdate } from "../lib/whatsappQueryCache";
import { shouldMaskConversationPhone } from "@/lib/whatsapp/phoneMask";
import { useInitiationLimit } from "../hooks/useInitiationLimit";
import { InitiationLimitBadge } from "../components/InitiationLimitBadge";
import { useActiveThreadState, useActiveThreadActionsRef } from "../context/ActiveThreadContext";
import { useConversationListActionsRef } from "../context/ConversationListContext";
import { useWhatsAppUIState } from "../context/WhatsAppUIContext";
import { ChatHeader } from "../components/ChatHeader";
import { MessageList } from "../components/MessageList";
import { MessageComposer } from "../components/MessageComposer";
import type { Conversation, Message } from "../types";
import type { WhatsAppPhoneMaskRules } from "@/lib/whatsapp/phoneMask";
import type { MobileView } from "../hooks/useMobileView";

// ── Dynamic imports (load on demand) ──────────────────────────────────────
const DispositionDialog = dynamic(
  () => import("../components/DispositionDialog").then((m) => ({ default: m.DispositionDialog })),
  { ssr: false, loading: () => null },
);
const SetVisitDialog = dynamic(
  () => import("../components/SetVisitDialog").then((m) => ({ default: m.SetVisitDialog })),
  { ssr: false, loading: () => null },
);
const ReminderDialog = dynamic(
  () => import("../components/ReminderDialog").then((m) => ({ default: m.ReminderDialog })),
  { ssr: false, loading: () => null },
);
const CrmPanel = dynamic(
  () => import("../components/CrmPanel").then((m) => ({ default: m.CrmPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-80 border-l border-border animate-pulse bg-muted/20" />
    ),
  },
);

// ── Send actions exposed from the shell via a stable ref ──────────────────
export interface SendActions {
  sendMessage: () => Promise<void>;
  sendTemplateMessage: () => Promise<void>;
  handleFileUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    mediaType: "image" | "document" | "audio" | "video",
  ) => Promise<void>;
  handleSendMediaWithCaptions: (files: Array<{ file: File; caption: string }>) => Promise<void>;
}

// ── Props ─────────────────────────────────────────────────────────────────
export interface MessageThreadContainerProps {
  isMobile: boolean;
  mobileView: MobileView;
  token: Record<string, unknown> & {
    name?: string;
    role?: string;
    email?: string;
    allotedArea?: string | string[];
    id?: string;
  } | null;
  canManagePhoneMask: boolean;
  isConnected: boolean;
  phoneMaskRules: WhatsAppPhoneMaskRules;
  initiationLimitRefreshKey: number;
  // Call-related (only changes during active calls)
  callPermissions: { canMakeCalls: boolean };
  callPermsFetched: boolean;
  callingAudio: boolean;
  onAudioCall: () => void;
  onFetchCallPermissions: () => Promise<boolean>;
  // Open transfer dialog (LeadTransferDialog owned by shell)
  onOpenTransferDialog: () => void;
  // Stable refs
  fileInputRef: RefObject<HTMLInputElement>;
  imageInputRef: RefObject<HTMLInputElement>;
  videoInputRef: RefObject<HTMLInputElement>;
  audioInputRef: RefObject<HTMLInputElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  // Shell send handlers via stable mutable ref
  sendActionsRef: MutableRefObject<SendActions>;
  // Navigation
  onMobileBack: () => void;
}

/**
 * Owns the message thread state slice.  Only rerenders when:
 *  - active thread / messages change  (useActiveThreadState)
 *  - dialog flags change              (useWhatsAppUIState)
 *  - call props change                (during calls only — rare)
 * Does NOT rerender when: conversation list updates (new conv sorted, unread badge, etc.)
 */
export const MessageThreadContainer = memo(function MessageThreadContainer({
  isMobile,
  mobileView,
  token,
  canManagePhoneMask,
  isConnected,
  phoneMaskRules,
  initiationLimitRefreshKey,
  callPermissions,
  callPermsFetched,
  callingAudio,
  onAudioCall,
  onFetchCallPermissions,
  onOpenTransferDialog,
  fileInputRef,
  imageInputRef,
  videoInputRef,
  audioInputRef,
  messagesEndRef,
  sendActionsRef,
  onMobileBack,
}: MessageThreadContainerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const threadActionsRef = useActiveThreadActionsRef();
  const listActionsRef = useConversationListActionsRef();

  // ── Initiation limit (for banner at top of chat panel) ───────────────────
  const { status: initiationLimitStatus } = useInitiationLimit(initiationLimitRefreshKey);

  // ── Thread state ─────────────────────────────────────────────────────────
  const {
    selectedConversation,
    messages,
    messagesLoading,
    hasMoreMessages,
    loadingOlderMessages,
    templates,
    templatesLoading,
    templatesChannelScoped,
    readersRefreshToken,
    conversationReaders,
    skipReadersFetch,
    setConversationReaders,
    allowedPhoneConfigs,
    newMessage,
    setNewMessage,
    replyToMessage,
    setReplyToMessage,
    sendingMessage,
    setSendingMessage,
    uploadingMedia,
    setUploadingMedia,
    selectedTemplate,
    setSelectedTemplate,
    templateParams,
    setTemplateParams,
    showMessageSearch,
    setShowMessageSearch,
    messageSearchQuery,
    setMessageSearchQuery,
    pendingScrollToMessageId,
    setPendingScrollToMessageId,
  } = useActiveThreadState();

  // ── UI / dialog state ─────────────────────────────────────────────────────
  const {
    showDispositionDialog,
    setShowDispositionDialog,
    showVisitDialog,
    setShowVisitDialog,
    showReminderDialog,
    setShowReminderDialog,
    showCrmPanel,
    setShowCrmPanel,
    showTemplateDialog,
    setShowTemplateDialog,
    showForwardDialog,
    setShowForwardDialog,
    setMessagesToForward,
    setForwardingMessages,
  } = useWhatsAppUIState();

  const { emitDispositionChange } = useLeadSocketEmit();
  const [dispositionInitialAction, setDispositionInitialAction] = useState<
    CoreWhatsAppDispositionAction | undefined
  >(undefined);

  const openDispositionDialog = useCallback(
    (action?: CoreWhatsAppDispositionAction) => {
      setDispositionInitialAction(action);
      setShowDispositionDialog(true);
    },
    [setShowDispositionDialog],
  );

  // ── Stable wrappers for shell send actions ────────────────────────────────
  const sendMessage = useCallback(
    () => sendActionsRef.current.sendMessage(),
    [sendActionsRef],
  );
  const sendTemplateMessage = useCallback(
    () => sendActionsRef.current.sendTemplateMessage(),
    [sendActionsRef],
  );
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, mediaType: "image" | "document" | "audio" | "video") =>
      sendActionsRef.current.handleFileUpload(e, mediaType),
    [sendActionsRef],
  );
  const handleSendMediaWithCaptions = useCallback(
    (files: Array<{ file: File; caption: string }>) => sendActionsRef.current.handleSendMediaWithCaptions(files),
    [sendActionsRef],
  );

  // ── Handlers owned by this container ─────────────────────────────────────
  const mutateActiveMessages = useCallback(
    (mutator: (msgs: Message[]) => Message[]) =>
      threadActionsRef.current.mutateActiveMessages(mutator),
    [threadActionsRef],
  );

  const patchConversationsList = useCallback(
    (mutator: (list: Conversation[]) => Conversation[]) =>
      listActionsRef.current.patchConversationsList(mutator),
    [listActionsRef],
  );

  const handleReplyMessage = useCallback((message: Message) => {
    setReplyToMessage(message);
    setTimeout(() => {
      const textarea = document.querySelector(
        'textarea[placeholder*="Type a message"]',
      ) as HTMLTextAreaElement | null;
      textarea?.focus();
    }, 100);
  }, [setReplyToMessage]);

  const handleCancelReply = useCallback(() => setReplyToMessage(null), [setReplyToMessage]);

  const handleForwardMessages = useCallback(
    (messageIds: string[]) => {
      setMessagesToForward(messageIds);
      setShowForwardDialog(true);
    },
    [setMessagesToForward, setShowForwardDialog],
  );

  const handleReactMessage = useCallback(
    async (message: Message, emoji = "👍") => {
      if (!selectedConversation || !message.messageId) return;
      mutateActiveMessages((prev) =>
        prev.map((msg) => {
          if (msg.messageId === message.messageId) {
            const existing = msg.reactions || [];
            if (!existing.some((r) => r.emoji === emoji && r.direction === "outgoing")) {
              return { ...msg, reactions: [...existing, { emoji, direction: "outgoing" }] };
            }
          }
          return msg;
        }),
      );
      try {
        const response = await axios.post("/api/whatsapp/send-reaction", {
          messageId: message.messageId,
          emoji,
          conversationId: selectedConversation._id,
        });
        if (!response.data.success) throw new Error(response.data.error || "Failed");
      } catch (error: unknown) {
        mutateActiveMessages((prev) =>
          prev.map((msg) => {
            if (msg.messageId === message.messageId) {
              return {
                ...msg,
                reactions: (msg.reactions || []).filter(
                  (r) => !(r.emoji === emoji && r.direction === "outgoing"),
                ),
              };
            }
            return msg;
          }),
        );
        const err = error as { response?: { data?: { error?: string } } };
        toast({
          title: "Reaction Failed",
          description: err.response?.data?.error || "Failed to send reaction",
          variant: "destructive",
        });
      }
    },
    [selectedConversation, mutateActiveMessages, toast],
  );

  const copyPhoneNumber = useCallback(() => {
    if (!selectedConversation) return;
    const role = (token?.role as string) || "";
    if (shouldMaskConversationPhone(selectedConversation.conversationType, phoneMaskRules, role)) {
      toast({ variant: "destructive", title: "Phone hidden", description: "This number is masked." });
      return;
    }
    navigator.clipboard.writeText(selectedConversation.participantPhone);
    toast({ title: "Copied", description: "Phone number copied to clipboard" });
  }, [selectedConversation, token, phoneMaskRules, toast]);

  const handleConversationTypeChange = useCallback(
    async (conversationId: string, conversationType: "owner" | "guest") => {
      try {
        const response = await axios.post(
          `/api/whatsapp/conversations/${conversationId}/meta`,
          { conversationType },
        );
        const patch: Partial<Conversation> = { conversationType };
        const updated = response.data?.updated as Record<string, unknown> | undefined;
        if (typeof updated?.businessPhoneId === "string") patch.businessPhoneId = updated.businessPhoneId;
        if (typeof updated?.whatsappChannelId === "string")
          (patch as Record<string, unknown>).whatsappChannelId = updated.whatsappChannelId;
        if (updated?.channelType === "guest" || updated?.channelType === "owner")
          (patch as Record<string, unknown>).channelType = updated.channelType;
        threadActionsRef.current.handleUpdateConversation(conversationId, patch);
        toast({ title: "Conversation updated", description: `Marked as ${conversationType}.` });
      } catch (err: unknown) {
        toast({
          title: "Update failed",
          description:
            axios.isAxiosError(err) && typeof err.response?.data?.error === "string"
              ? err.response.data.error
              : "Could not update conversation type.",
          variant: "destructive",
        });
      }
    },
    [threadActionsRef, toast],
  );

  const handleCrmLabelsUpdated = useCallback(
    (labels: string[]) => threadActionsRef.current.handleCrmLabelsUpdated(labels),
    [threadActionsRef],
  );

  const handleDispositionApplied = useCallback(
    (result: DispositionAppliedResult) => {
      handleCrmLabelsUpdated(result.labels);
      if (result.lead) {
        const oldStatus = result.previousLeadStatus || "fresh";
        emitDispositionChange(
          result.lead as unknown as Parameters<typeof emitDispositionChange>[0],
          oldStatus,
          result.leadStatus,
        );
      }
    },
    [handleCrmLabelsUpdated, emitDispositionChange],
  );

  const loadOlderMessages = useCallback(
    () => threadActionsRef.current.loadOlderMessages(),
    [threadActionsRef],
  );

  const handleUpdateConversation = useCallback(
    (id: string, patch: Partial<Conversation>) =>
      threadActionsRef.current.handleUpdateConversation(id, patch),
    [threadActionsRef],
  );

  const refetchConversationsList = useCallback(
    () => listActionsRef.current.refetchConversationsList(),
    [listActionsRef],
  );

  const handleRefreshTemplates = useCallback(() => {
    const key = threadActionsRef.current.templatesCacheKey;
    void queryClient.invalidateQueries({ queryKey: ["whatsappTemplates", key] });
  }, [threadActionsRef, queryClient]);

  // ── Drag-and-drop file handler ────────────────────────────────────────────
  useEffect(() => {
    const handleFileDropped = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        file: File;
        mediaType: string;
        bunnyUrl: string;
        filename: string;
      }>;
      const { file, mediaType, bunnyUrl, filename } = customEvent.detail;
      if (!selectedConversation) return;
      const isYouConv = selectedConversation.isInternal || selectedConversation.source === "internal";
      if (!isYouConv && !isMessageWindowActive(selectedConversation, getConversationBusinessPhoneId(selectedConversation))) {
        setShowTemplateDialog(true);
        return;
      }
      setUploadingMedia(true);
      const tempId = `temp-${Date.now()}`;
      const sendTimestamp = new Date();
      const tempMsg: Message = {
        _id: tempId,
        messageId: tempId,
        from: "me",
        to: selectedConversation.participantPhone,
        type: mediaType as Message["type"],
        content: {},
        mediaUrl: bunnyUrl,
        filename: filename || file.name,
        timestamp: sendTimestamp,
        status: "sending",
        direction: "outgoing",
      };
      mutateActiveMessages((prev) => [...prev, tempMsg]);
      patchConversationsList((prev) =>
        repositionConversationAfterUpdate(prev, selectedConversation._id, (conv) => ({
          ...conv,
          lastMessageContent: `📎 ${file.name}`,
          lastMessageTime: sendTimestamp,
          lastMessageDirection: "outgoing",
        })),
      );
      try {
        const sendResponse = await axios.post("/api/whatsapp/send-media", {
          to: selectedConversation.participantPhone,
          conversationId: selectedConversation._id,
          mediaType,
          mediaUrl: bunnyUrl,
          filename: filename || file.name,
        });
        if (sendResponse.data.success) {
          mutateActiveMessages((prev) =>
            prev.map((msg) =>
              msg._id === tempId
                ? { ...msg, _id: sendResponse.data.savedMessageId, messageId: sendResponse.data.messageId, status: "sent" }
                : msg,
            ),
          );
        }
      } catch {
        mutateActiveMessages((prev) =>
          prev.map((msg) => (msg._id === tempId ? { ...msg, status: "failed" } : msg)),
        );
      } finally {
        setUploadingMedia(false);
      }
    };
    window.addEventListener("fileDropped", handleFileDropped);
    return () => window.removeEventListener("fileDropped", handleFileDropped);
  }, [selectedConversation, mutateActiveMessages, patchConversationsList, setShowTemplateDialog, setUploadingMedia]);

  // ── Derived values ────────────────────────────────────────────────────────
  const isYouConversation =
    selectedConversation?.isInternal || selectedConversation?.source === "internal";
  const selectedOutboundPhoneId = getConversationBusinessPhoneId(selectedConversation) ?? null;
  const canSendFreeForm =
    isYouConversation ||
    (selectedConversation
      ? isMessageWindowActive(selectedConversation, selectedOutboundPhoneId)
      : false);
  const showCrmActions =
    Boolean(selectedConversation) &&
    !selectedConversation?.isInternal &&
    selectedConversation?.source !== "internal";

  // ── Render ────────────────────────────────────────────────────────────────
  // Outer wrapper: flex-row so CRM panel can sit as a right column beside chat area.
  // Also owns the mobile show/hide logic (mobileView drives visibility).
  return (
    <div
      className={cn(
        "flex flex-row",
        isMobile
          ? mobileView === "chat"
            ? "absolute inset-0 z-10 w-full h-full max-w-full"
            : "hidden"
          : "flex-1 relative min-w-0",
        "md:flex-1 md:relative md:z-auto md:min-w-0",
        "transition-all duration-200 ease-out",
      )}
    >
      {/* Chat area: flex-col, fills remaining width after CRM panel */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0",
          "bg-[#efeae2] dark:bg-[#0b141a]",
          "bg-[url(/whatsapp-background.png)] dark:bg-[url(/whatsapp-background-dark.png)] bg-contain bg-center bg-repeat",
        )}
      >
        {/* Initiation limit banner */}
        {initiationLimitStatus?.limited && (
          <div className="px-4 py-2.5 bg-[#e7f8f3] dark:bg-[#0b3328] border-b border-[#cfe8f6] dark:border-[#2a3942] flex-shrink-0">
            <InitiationLimitBadge refreshKey={initiationLimitRefreshKey} variant="banner" />
          </div>
        )}

        {selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              callPermissions={callPermissions}
              callPermsFetched={callPermsFetched}
              onFetchCallPermissions={onFetchCallPermissions}
              callingAudio={callingAudio}
              onAudioCall={onAudioCall}
              onRefreshTemplates={handleRefreshTemplates}
              templatesLoading={templatesLoading}
              showMessageSearch={showMessageSearch}
              onToggleMessageSearch={() => setShowMessageSearch((prev) => !prev)}
              onCloseSearch={() => {
                setShowMessageSearch(false);
                setMessageSearchQuery("");
              }}
              messageSearchQuery={messageSearchQuery}
              onMessageSearchChange={setMessageSearchQuery}
              toastCopy={copyPhoneNumber}
              readers={conversationReaders}
              skipReadersFetch={skipReadersFetch}
              onReadersChange={setConversationReaders}
              readersRefreshToken={readersRefreshToken}
              currentUserId={(token?.id as string | undefined) || (token as { _id?: string } | null)?._id}
              onBack={onMobileBack}
              isMobile={isMobile}
              availablePhoneConfigs={allowedPhoneConfigs}
              currentPhoneId={selectedOutboundPhoneId}
              onTransferLead={onOpenTransferDialog}
              onConversationTypeChange={handleConversationTypeChange}
              phoneMaskRules={phoneMaskRules}
              userRole={token?.role as string | undefined}
              userEmail={token?.email as string | undefined}
              userAreas={token?.allotedArea as string | string[] | undefined}
              onLocationSet={(conversationId, location) => {
                handleUpdateConversation(conversationId, {
                  participantLocation: location,
                } as Partial<Conversation>);
                void refetchConversationsList();
              }}
              onOpenDisposition={showCrmActions ? () => openDispositionDialog() : undefined}
              onOpenSetVisit={showCrmActions ? () => setShowVisitDialog(true) : undefined}
              onOpenReminder={showCrmActions ? () => setShowReminderDialog(true) : undefined}
              onToggleCrmPanel={
                showCrmActions && !isMobile ? () => setShowCrmPanel((p) => !p) : undefined
              }
              crmPanelOpen={showCrmPanel}
              onForwardedToSales={(conversationId) => {
                patchConversationsList((prev) =>
                  prev.filter((c) => c._id !== conversationId),
                );
                threadActionsRef.current.setSelectedConversation(null);
                if (isMobile) onMobileBack();
              }}
            />

            <MessageList
              conversationId={selectedConversation._id}
              messages={messages}
              messagesLoading={messagesLoading}
              messageSearchQuery={messageSearchQuery}
              messagesEndRef={messagesEndRef}
              selectedConversationActive
              onLoadOlderMessages={loadOlderMessages}
              hasMoreMessages={hasMoreMessages}
              loadingOlderMessages={loadingOlderMessages}
              onForwardMessages={handleForwardMessages}
              conversations={[]}
              onReplyMessage={handleReplyMessage}
              onReactMessage={handleReactMessage}
              isMobile={isMobile}
              pendingScrollToMessageId={pendingScrollToMessageId}
              onScrolledToMessage={() => setPendingScrollToMessageId(null)}
            />

            <MessageComposer
              newMessage={newMessage}
              onMessageChange={setNewMessage}
              onSendMessage={sendMessage}
              sendingMessage={sendingMessage}
              canSendFreeForm={canSendFreeForm}
              showTemplateDialog={showTemplateDialog}
              onTemplateDialogChange={setShowTemplateDialog}
              templates={templates}
              templatesLoading={templatesLoading}
              templatesChannelScoped={templatesChannelScoped}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              templateParams={templateParams}
              onTemplateParamsChange={setTemplateParams}
              onSendTemplate={sendTemplateMessage}
              uploadingMedia={uploadingMedia}
              onHandleFileUpload={handleFileUpload}
              fileInputRef={fileInputRef}
              imageInputRef={imageInputRef}
              videoInputRef={videoInputRef}
              audioInputRef={audioInputRef}
              onOpenTemplateFromWarning={() => setShowTemplateDialog(true)}
              templateContext={{
                ...getConversationTemplateContext(selectedConversation),
                agentName: (token?.name as string) || "",
              }}
              replyToMessage={replyToMessage}
              onCancelReply={handleCancelReply}
              isYouConversation={isYouConversation}
              conversationType={selectedConversation?.conversationType}
              conversationRentalType={selectedConversation?.rentalType}
              selectedConversation={selectedConversation}
              onSendMediaWithCaptions={handleSendMediaWithCaptions}
            />

            {showDispositionDialog && (
              <DispositionDialog
                open={showDispositionDialog}
                onOpenChange={(open) => {
                  setShowDispositionDialog(open);
                  if (!open) setDispositionInitialAction(undefined);
                }}
                conversation={selectedConversation}
                initialAction={dispositionInitialAction}
                onApplied={handleDispositionApplied}
              />
            )}
            {showVisitDialog && (
              <SetVisitDialog
                open={showVisitDialog}
                onOpenChange={setShowVisitDialog}
                conversation={selectedConversation}
                onScheduled={handleCrmLabelsUpdated}
              />
            )}
            {showReminderDialog && (
              <ReminderDialog
                open={showReminderDialog}
                onOpenChange={setShowReminderDialog}
                conversation={selectedConversation}
                onCreated={handleCrmLabelsUpdated}
              />
            )}
          </>
        ) : (
          <div className={cn("flex-1 flex flex-col items-center justify-center bg-[#f7f5f3] dark:bg-[#222e35]", "hidden md:flex")}>
            <div className="max-w-md text-center px-4">
              <div className="w-[240px] h-[141px] md:w-[320px] md:h-[188px] mx-auto mb-6 md:mb-8">
                <svg viewBox="0 0 320 188" className="w-full h-full">
                  <rect fill="#d9fdd3" x="116" y="22" width="88" height="136" rx="10" className="dark:fill-[#005c4b]" />
                  <rect fill="#25d366" x="128" y="33" width="64" height="10" rx="5" />
                  <rect fill="#fff" x="128" y="54" width="54" height="8" rx="4" className="dark:fill-[#e9edef]" />
                  <rect fill="#fff" x="128" y="68" width="40" height="8" rx="4" className="dark:fill-[#e9edef]" />
                  <rect fill="#fff" x="128" y="86" width="60" height="8" rx="4" className="dark:fill-[#e9edef]" />
                  <rect fill="#fff" x="128" y="100" width="45" height="8" rx="4" className="dark:fill-[#e9edef]" />
                  <rect fill="#fff" x="128" y="118" width="55" height="8" rx="4" className="dark:fill-[#e9edef]" />
                  <rect fill="#fff" x="128" y="132" width="35" height="8" rx="4" className="dark:fill-[#e9edef]" />
                  <circle fill="#25d366" cx="160" cy="170" r="14" />
                  <path fill="#fff" d="M155 170l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-[32px] font-light text-[#41525d] dark:text-[#e9edef] mb-3 md:mb-4">
                WhatsApp Business
              </h1>
              <p className="text-[13px] md:text-[14px] text-[#667781] dark:text-[#8696a0] leading-relaxed mb-6 md:mb-8">
                Send and receive messages without keeping your phone online.
              </p>
              <div className="flex items-center justify-center gap-2 text-[13px] text-[#667781] dark:text-[#8696a0]">
                <svg viewBox="0 0 10 12" width="10" height="12">
                  <path fill="currentColor" d="M5.0 0.65C2.648 0.65 0.75 2.548 0.75 4.9V6.125L0.0 6.875V8.375H10.0V6.875L9.25 6.125V4.9C9.25 2.548 7.352 0.65 5.0 0.65ZM5.0 11.35C5.967 11.35 6.75 10.567 6.75 9.6H3.25C3.25 10.567 4.033 11.35 5.0 11.35Z" />
                </svg>
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CRM Panel — right column, desktop only */}
      {showCrmPanel && selectedConversation && showCrmActions && (
        <CrmPanel
          isOpen={showCrmPanel}
          conversation={selectedConversation}
          onClose={() => setShowCrmPanel(false)}
          onOpenDisposition={openDispositionDialog}
          onOpenSetVisit={() => setShowVisitDialog(true)}
          onOpenReminder={() => setShowReminderDialog(true)}
          onLabelsUpdated={handleCrmLabelsUpdated}
          className="hidden md:flex w-[400px] min-w-[300px] max-w-[400px] flex-shrink-0"
        />
      )}
    </div>
  );
});
