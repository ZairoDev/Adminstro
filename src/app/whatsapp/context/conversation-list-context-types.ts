import type { RefObject, MutableRefObject } from "react";
import type { Conversation, ConversationsListFilters } from "../types";
import type { WhatsAppPhoneMaskRules } from "@/lib/whatsapp/phoneMask";

export interface ConversationCounts {
  totalCount: number;
  ownerCount: number;
  guestCount: number;
  unreadCount: number;
}

export interface ConversationListStateValue {
  conversations: Conversation[];
  loading: boolean;
  hasMoreConversations: boolean;
  loadingMoreConversations: boolean;
  conversationCounts: ConversationCounts;
  totalUnreadCount: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  labelFilter: string;
  setLabelFilter: (value: string) => void;
  adminQueue: boolean;
  adminLocationFilter: string;
  adminLocationOptions: string[];
  sidebarTabHint: "all" | "owners" | "guests" | null;
  setSidebarTabHint: (value: "all" | "owners" | "guests" | null) => void;
  onSidebarTabHintConsumed: () => void;
  showingArchived: boolean;
  archivedConversations: Conversation[];
  archivedCount: number;
  archivedUnreadCount: number;
  archivedPrefetchUnreadTotal: number;
  archivedHasMore: boolean;
  loadingMoreArchived: boolean;
  archivedLoading: boolean;
  phoneMaskRules: WhatsAppPhoneMaskRules;
  initiationLimitRefreshKey: number;
  bumpInitiationLimitRefreshKey: () => void;
  newCountryCode: string;
  setNewCountryCode: (value: string) => void;
  newPhoneNumber: string;
  setNewPhoneNumber: (value: string) => void;
}

export interface ConversationListActionsValue {
  patchConversationsList: (mutator: (list: Conversation[]) => Conversation[]) => void;
  refetchConversationsList: () => Promise<Conversation[]>;
  fetchNextConversationsPage: () => void;
  conversationsFiltersRef: MutableRefObject<ConversationsListFilters>;
  refetchConversationsListRef: MutableRefObject<() => Promise<Conversation[]>>;
  setOpenConversationSnapshot: (conversation: Conversation | null) => void;
  handleAdminQueueChange: (value: boolean) => void;
  handleAdminLocationFilterChange: (value: string) => void;
  setAdminQueue: (value: boolean) => void;
  toggleArchiveView: () => void;
  archiveConversation: (conversationId: string) => Promise<void>;
  unarchiveConversation: (conversationId: string) => Promise<void>;
  fetchArchivedConversations: (opts?: {
    silent?: boolean;
    loadMore?: boolean;
  }) => Promise<void>;
  handleUpdateConversation: (conversationId: string, patch: Partial<Conversation>) => void;
  maskConversationForViewer: (conv: Conversation) => Conversation;
  maskConversationListForViewer: (list: Conversation[]) => Conversation[];
  archivedConversationIdsRef: MutableRefObject<Set<string>>;
  syncArchivedStorage: (ids: string[]) => void;
  bumpInitiationLimitRefreshKey: () => void;
  patchArchivedConversations: (
    mutator: (list: Conversation[]) => Conversation[],
  ) => void;
  adjustArchivedUnreadCount: (delta: number) => void;
}
