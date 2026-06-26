"use client";

import { memo, useCallback } from "react";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useConversationListState, useConversationListActionsRef } from "../context/ConversationListContext";
import { useActiveThreadSelection, useActiveThreadActionsRef } from "../context/ActiveThreadContext";
import { useInitiationLimit } from "../hooks/useInitiationLimit";
import { ConversationSidebar } from "../components/ConversationSidebar";
import type { Conversation } from "../types";
import type { WhatsAppPhoneMaskRules } from "@/lib/whatsapp/phoneMask";
import type { MobileView } from "../hooks/useMobileView";

export interface ConversationSidebarContainerProps {
  isMobile: boolean;
  /** mobileView drives hide/show of the sidebar column — passed by shell layout */
  mobileView: MobileView;
  isConnected: boolean;
  token: Record<string, unknown> & {
    name?: string;
    role?: string;
    email?: string;
    allotedArea?: string | string[];
    id?: string;
    profilePic?: string;
    avatar?: string;
  } | null;
  canManagePhoneMask: boolean;
  /** Called to open the "Add Owner" modal (shell owns modal state) */
  onOpenAddOwner: () => void;
  /** Called to open the "Add Guest" modal — limit-check is performed here before calling */
  onOpenAddGuestModal: () => void;
  onOpenDisposition: () => void;
  onOpenSetVisit: () => void;
  onOpenReminder: () => void;
}

/**
 * Owns the sidebar state slice.  Only rerenders when:
 *  - conversation list changes   (useConversationListState)
 *  - selected conversation changes (useActiveThreadSelection — for row highlight)
 * Does NOT rerender when: messages change, compose state changes, dialog flags change.
 */
export const ConversationSidebarContainer = memo(function ConversationSidebarContainer({
  isMobile,
  mobileView,
  isConnected,
  token,
  canManagePhoneMask,
  onOpenAddOwner,
  onOpenAddGuestModal,
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
}: ConversationSidebarContainerProps) {
  const { toast } = useToast();
  const listActionsRef = useConversationListActionsRef();
  const threadActionsRef = useActiveThreadActionsRef();

  // ── List state (this component's primary subscription) ────────────────────
  const {
    conversations,
    loading,
    hasMoreConversations,
    loadingMoreConversations,
    conversationCounts,
    totalUnreadCount,
    searchQuery,
    setSearchQuery,
    labelFilter,
    setLabelFilter,
    adminQueue,
    adminLocationFilter,
    adminLocationOptions,
    sidebarTabHint,
    setSidebarTabHint,
    showingArchived,
    archivedConversations,
    archivedCount,
    archivedPrefetchUnreadTotal,
    archivedHasMore,
    loadingMoreArchived,
    archivedLoading,
    phoneMaskRules,
    initiationLimitRefreshKey,
    newCountryCode,
    setNewCountryCode,
    newPhoneNumber,
    setNewPhoneNumber,
  } = useConversationListState();

  // ── Selected conversation (only for row highlight — own narrow context) ───
  const selectedConversation = useActiveThreadSelection();

  // ── Initiation limit (needs refresh key from list state) ──────────────────
  const { status: initiationLimitStatus } = useInitiationLimit(initiationLimitRefreshKey);
  const guestInitiationAtLimit = initiationLimitStatus?.atLimit ?? false;

  // ── Stable action wrappers ────────────────────────────────────────────────
  const selectConversation = useCallback(
    (conv: Conversation | null) => threadActionsRef.current.selectConversation(conv),
    [threadActionsRef],
  );

  const archiveConversation = useCallback(
    (id: string) => listActionsRef.current.archiveConversation(id),
    [listActionsRef],
  );

  const unarchiveConversation = useCallback(
    (id: string) => listActionsRef.current.unarchiveConversation(id),
    [listActionsRef],
  );

  const toggleArchiveView = useCallback(
    () => listActionsRef.current.toggleArchiveView(),
    [listActionsRef],
  );

  const fetchArchivedConversations = useCallback(
    (opts?: { silent?: boolean; loadMore?: boolean }) =>
      listActionsRef.current.fetchArchivedConversations(opts),
    [listActionsRef],
  );

  const fetchNextConversationsPage = useCallback(
    () => listActionsRef.current.fetchNextConversationsPage(),
    [listActionsRef],
  );

  const refetchConversationsList = useCallback(
    () => listActionsRef.current.refetchConversationsList(),
    [listActionsRef],
  );

  const handleAdminQueueChange = useCallback(
    (value: boolean) => listActionsRef.current.handleAdminQueueChange(value),
    [listActionsRef],
  );

  const handleAdminLocationFilterChange = useCallback(
    (value: string) => listActionsRef.current.handleAdminLocationFilterChange(value),
    [listActionsRef],
  );

  const handleUpdateConversation = useCallback(
    (id: string, patch: Partial<Conversation>) =>
      threadActionsRef.current.handleUpdateConversation(id, patch),
    [threadActionsRef],
  );

  // ── Conversation type change (sidebar context menu) ───────────────────────
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
        handleUpdateConversation(conversationId, patch);
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
    [handleUpdateConversation, toast],
  );

  // ── Start new conversation (from sidebar new-chat form) ───────────────────
  const startNewConversation = useCallback(async () => {
    if (!newCountryCode.trim() || !newPhoneNumber.trim()) {
      toast({ title: "Missing Information", description: "Please enter both country code and phone number", variant: "destructive" });
      return;
    }
    const country = newCountryCode.replace(/\D/g, "");
    const phone = newPhoneNumber.replace(/\D/g, "");
    if (!country || !phone) {
      toast({ title: "Invalid Number", description: "Country code and phone number must be digits only.", variant: "destructive" });
      return;
    }
    if (country.startsWith("0") || phone.startsWith("0")) {
      toast({ title: "Invalid Number", description: "Country code and phone number must not start with 0.", variant: "destructive" });
      return;
    }
    if (country.length < 1 || country.length > 4) {
      toast({ title: "Invalid Country Code", description: "Country code must be 1-4 digits.", variant: "destructive" });
      return;
    }
    if (phone.length < 6 || phone.length > 15) {
      toast({ title: "Invalid Phone Number", description: "Phone number must be 6-15 digits.", variant: "destructive" });
      return;
    }
    const fullPhoneNumber = `${country}${phone}`;
    const alreadyInList = conversations.find(
      (c) => (c.participantPhone || "").replace(/\D/g, "") === fullPhoneNumber.replace(/\D/g, ""),
    );
    if (alreadyInList) {
      selectConversation(alreadyInList);
      setNewPhoneNumber("");
      toast({ title: "Conversation exists", description: "Opening existing chat instead of creating a duplicate." });
      return;
    }
    toast({
      title: "Add location first",
      description: "Use the + person icon → Owner or Guest and pick a city, or open the contact from a lead.",
      variant: "destructive",
    });
  }, [newCountryCode, newPhoneNumber, conversations, selectConversation, setNewPhoneNumber, toast]);

  // ── Add Guest with limit check ────────────────────────────────────────────
  const handleAddGuest = useCallback(() => {
    if (guestInitiationAtLimit) {
      toast({
        title: "Daily limit reached",
        description: "You have reached your daily limit of 15 new guest conversations.",
        variant: "destructive",
      });
      return;
    }
    onOpenAddGuestModal();
  }, [guestInitiationAtLimit, onOpenAddGuestModal, toast]);

  // ── Jump to message from search results ───────────────────────────────────
  const handleJumpToMessage = useCallback(
    (conversationId: string, messageId: string) => {
      const allConvs = showingArchived ? archivedConversations : conversations;
      const conv = allConvs.find((c) => c._id === conversationId);
      if (conv) {
        threadActionsRef.current.selectConversation(conv);
        threadActionsRef.current.setPendingScrollToMessageId(messageId);
        threadActionsRef.current.setMessageSearchQuery(searchQuery);
      }
    },
    [showingArchived, archivedConversations, conversations, searchQuery, threadActionsRef],
  );

  // ── CRM action from sidebar (select conversation before CRM opens) ─────────
  const handleCrmActionForConversation = useCallback(
    (conv: Conversation) => {
      if (selectedConversation?._id !== conv._id) {
        threadActionsRef.current.selectConversation(conv);
      }
    },
    [selectedConversation, threadActionsRef],
  );

  const handleLoadMore = useCallback(() => {
    if (showingArchived) {
      void fetchArchivedConversations({ loadMore: true });
    } else {
      void fetchNextConversationsPage();
    }
  }, [showingArchived, fetchArchivedConversations, fetchNextConversationsPage]);

  const handleSidebarTabHintConsumed = useCallback(
    () => setSidebarTabHint(null),
    [setSidebarTabHint],
  );

  const handleRefreshConversations = useCallback(
    () => void refetchConversationsList(),
    [refetchConversationsList],
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full min-w-0 flex-shrink-0",
        "w-full max-w-full",
        isMobile && mobileView === "chat" && "hidden",
        "md:w-[340px] md:min-w-[280px] md:max-w-[340px]",
        "lg:w-[600px] lg:min-w-[340px] lg:max-w-[600px]",
        "transition-all duration-200 ease-out",
      )}
    >
      <ConversationSidebar
        conversations={showingArchived ? archivedConversations : conversations}
        selectedConversation={selectedConversation}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        loading={showingArchived ? archivedLoading : loading}
        newCountryCode={newCountryCode}
        onCountryCodeChange={setNewCountryCode}
        newPhoneNumber={newPhoneNumber}
        onPhoneNumberChange={setNewPhoneNumber}
        onStartConversation={startNewConversation}
        onSelectConversation={selectConversation}
        isConnected={isConnected}
        conversationCounts={conversationCounts}
        totalUnreadCount={totalUnreadCount}
        hasMoreConversations={showingArchived ? archivedHasMore : hasMoreConversations}
        loadingMoreConversations={showingArchived ? loadingMoreArchived : loadingMoreConversations}
        onLoadMoreConversations={handleLoadMore}
        onAddOwner={onOpenAddOwner}
        onAddGuest={handleAddGuest}
        archivedCount={archivedCount}
        archivedUnreadCount={archivedPrefetchUnreadTotal}
        showingArchived={showingArchived}
        onToggleArchiveView={toggleArchiveView}
        onArchiveConversation={archiveConversation}
        onUnarchiveConversation={unarchiveConversation}
        userRole={token?.role}
        userEmail={token?.email}
        userAreas={token?.allotedArea}
        userName={token?.name}
        userProfilePic={(token?.profilePic as string | undefined) || (token?.avatar as string | undefined)}
        isMobile={isMobile}
        onUpdateConversation={handleUpdateConversation}
        onConversationTypeChange={handleConversationTypeChange}
        onRefreshConversations={handleRefreshConversations}
        phoneMaskRules={phoneMaskRules}
        canManagePhoneMask={canManagePhoneMask}
        adminQueue={adminQueue}
        onAdminQueueChange={handleAdminQueueChange}
        adminLocationFilter={adminLocationFilter}
        adminLocationOptions={adminLocationOptions}
        onAdminLocationFilterChange={handleAdminLocationFilterChange}
        sidebarTabHint={sidebarTabHint}
        onSidebarTabHintConsumed={handleSidebarTabHintConsumed}
        labelFilter={labelFilter}
        onLabelFilterChange={setLabelFilter}
        initiationLimitRefreshKey={initiationLimitRefreshKey}
        guestInitiationAtLimit={guestInitiationAtLimit}
        onOpenDisposition={onOpenDisposition}
        onOpenSetVisit={onOpenSetVisit}
        onOpenReminder={onOpenReminder}
        onCrmActionForConversation={handleCrmActionForConversation}
        onJumpToMessage={handleJumpToMessage}
      />
    </div>
  );
});
