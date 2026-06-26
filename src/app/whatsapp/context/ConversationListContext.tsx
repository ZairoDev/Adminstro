"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, ConversationsListFilters } from "../types";
import {
  useConversationsList,
  extractConversationsListMeta,
  mergeOpenConversationIntoList,
} from "../hooks/useConversationsList";
import { useWhatsAppYouConversation } from "../hooks/useWhatsAppYouConversation";
import { useWhatsAppUnreadCount } from "../hooks/useWhatsAppUnreadCount";
import { useMonthlyTargetLocations } from "../hooks/useMonthlyTargetLocations";
import {
  mutateWhatsAppConversationsListCache,
  broadcastConversationPatch,
  flattenConversationsPages,
  patchConversationsListFirstPageEnrichment,
  toUnreadCountQueryFilters,
  buildUnreadCountQueryKey,
  adjustWhatsAppUnreadCountQueryCache,
} from "../lib/whatsappQueryCache";
import { fetchConversationsFirstPageFullEnrichment } from "../lib/conversationsListApi";
import { deferUntilIdle } from "../lib/deferUntilIdle";
import { mergeYouConversationIntoList } from "../lib/conversationListUpdates";
import {
  useArchivedConversationIds,
  WHATSAPP_ARCHIVED_IDS_QUERY_KEY,
} from "@/hooks/shared/useArchivedConversationIds";
import {
  applyPhoneMaskToConversation,
  getWhatsAppPhoneMaskFromToken,
  maskConversationsForViewer,
  type WhatsAppPhoneMaskRules,
} from "@/lib/whatsapp/phoneMask";
import {
  canUseInboxLocationFilter,
  getInboxLocationFilterOptionsForUser,
} from "@/lib/whatsapp/participantLocationPrivileges";
import {
  buildWhatsAppInboxUrl,
  resolveInboxLocationDefaults,
  persistSuperAdminLocationFilter,
} from "../lib/whatsappInboxUrl";
import type {
  ConversationListActionsValue,
  ConversationListStateValue,
} from "./conversation-list-context-types";
import type { MutableRefObject } from "react";

const EMPTY_ADMIN_LOCATION_OPTIONS: string[] = [];

type ConversationListActionsInternal = ConversationListActionsValue & {
  registerArchiveSelectionHandler: (
    handler: ((conversationId: string) => void) | null,
  ) => void;
};

const ConversationListStateContext =
  createContext<ConversationListStateValue | null>(null);

const ConversationListActionsContext =
  createContext<MutableRefObject<ConversationListActionsInternal> | null>(null);

export function useConversationListState(): ConversationListStateValue {
  const ctx = useContext(ConversationListStateContext);
  if (!ctx) {
    throw new Error(
      "useConversationListState must be used within ConversationListProvider",
    );
  }
  return ctx;
}

export function useConversationListActionsRef(): MutableRefObject<ConversationListActionsInternal> {
  const ctx = useContext(ConversationListActionsContext);
  if (!ctx) {
    throw new Error(
      "useConversationListActionsRef must be used within ConversationListProvider",
    );
  }
  return ctx;
}

export function ConversationListProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isRetargetOnly = searchParams?.get("retargetOnly") === "1";

  const [archivedCount, setArchivedCount] = useState(0);
  const [archivedUnreadCount, setArchivedUnreadCount] = useState(0);
  const [archivedPrefetchUnreadTotal, setArchivedPrefetchUnreadTotal] = useState(0);
  const [showingArchived, setShowingArchived] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [archivedCursor, setArchivedCursor] = useState<string | null>(null);
  const [archivedHasMore, setArchivedHasMore] = useState(false);
  const [loadingMoreArchived, setLoadingMoreArchived] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const [adminQueue, setAdminQueue] = useState(false);
  const [adminLocationFilter, setAdminLocationFilter] = useState("all");
  const [inboxFiltersReady, setInboxFiltersReady] = useState(false);
  const inboxFiltersReadyRef = useRef(false);
  const [sidebarTabHint, setSidebarTabHint] = useState<
    "all" | "owners" | "guests" | null
  >(null);
  const [labelFilter, setLabelFilter] = useState("all");
  const [initiationLimitRefreshKey, setInitiationLimitRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("91");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");

  const [phoneMaskRules, setPhoneMaskRules] = useState<WhatsAppPhoneMaskRules>({
    maskOwnerPhones: false,
    maskGuestPhones: false,
  });
  const phoneMaskRulesRef = useRef(phoneMaskRules);
  const viewerRoleRef = useRef(token?.role || "");

  const conversationsFiltersRef = useRef<ConversationsListFilters>({
    search: "",
    labelFilter: "",
    adminQueue: false,
    retargetOnly: false,
    enabled: false,
  });

  const openConversationRef = useRef<Conversation | null>(null);
  const openConversationVersionRef = useRef(0);
  const [openConversationVersion, setOpenConversationVersion] = useState(0);
  const archivedConversationIdsRef = useRef<Set<string>>(new Set());
  const refetchConversationsListRef = useRef<() => Promise<Conversation[]>>(
    async () => [],
  );
  const onArchiveSelectedConversationRef = useRef<
    ((conversationId: string) => void) | null
  >(null);

  const maskConversationForViewer = useCallback((conv: Conversation): Conversation => {
    return applyPhoneMaskToConversation(
      conv,
      phoneMaskRulesRef.current,
      viewerRoleRef.current,
    );
  }, []);

  const maskConversationListForViewer = useCallback(
    (list: Conversation[]): Conversation[] => {
      return maskConversationsForViewer(
        list,
        phoneMaskRulesRef.current,
        viewerRoleRef.current,
      );
    },
    [],
  );

  const syncArchivedStorage = useCallback((ids: string[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("whatsapp_archived_conversations", JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const delay = searchQuery.trim() ? 300 : 0;
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const conversationsFilters = useMemo((): ConversationsListFilters => {
    const privilegeUser = {
      role: token?.role,
      email: token?.email,
      allotedArea: token?.allotedArea,
    };
    let locationFilter: string | undefined;
    if (
      !adminQueue &&
      adminLocationFilter &&
      adminLocationFilter !== "all" &&
      (token?.role === "SuperAdmin" || canUseInboxLocationFilter(privilegeUser))
    ) {
      locationFilter = adminLocationFilter;
    }
    return {
      search: debouncedSearchQuery.trim(),
      labelFilter: labelFilter !== "all" ? labelFilter : "",
      adminQueue,
      locationFilter,
      retargetOnly: isRetargetOnly,
      enabled: inboxFiltersReady && !!token,
    };
  }, [
    debouncedSearchQuery,
    labelFilter,
    adminQueue,
    adminLocationFilter,
    isRetargetOnly,
    token,
    inboxFiltersReady,
  ]);

  conversationsFiltersRef.current = conversationsFilters;

  const archivedIdsSnapshot = useArchivedConversationIds(
    inboxFiltersReady && !!token,
  );

  useEffect(() => {
    if (!archivedIdsSnapshot.isFetched) return;
    const archivedIds = archivedIdsSnapshot.archivedIds;
    archivedConversationIdsRef.current = new Set(archivedIds);
    syncArchivedStorage(archivedIds.filter(Boolean));
    setArchivedCount(archivedIds.length);
    if (archivedIdsSnapshot.archivedUnreadMessageCount !== undefined) {
      setArchivedPrefetchUnreadTotal(archivedIdsSnapshot.archivedUnreadMessageCount);
    }
  }, [archivedIdsSnapshot, syncArchivedStorage]);

  const unreadCountFilters = useMemo(
    () => ({
      ...toUnreadCountQueryFilters(conversationsFilters),
      // Page 1 list fetch includes includeUnread — avoid duplicate HTTP; cache is seeded below.
      enabled: false,
    }),
    [conversationsFilters],
  );

  const { data: unreadCountData } = useWhatsAppUnreadCount(unreadCountFilters);

  const {
    data: conversationsData,
    fetchNextPage: fetchNextConversationsPage,
    hasNextPage: hasMoreConversations,
    isFetchingNextPage: loadingMoreConversations,
    isLoading: conversationsInitialLoading,
    isFetching: conversationsFetching,
    refetch: refetchConversations,
    isError: conversationsQueryError,
  } = useConversationsList(conversationsFilters);

  const youConversationEnabled =
    !!token &&
    !isRetargetOnly &&
    labelFilter !== "unread" &&
    !showingArchived &&
    !debouncedSearchQuery.trim();

  const { data: youConversationData } =
    useWhatsAppYouConversation(youConversationEnabled);

  // Background: merge profile pics + guest stats after fast first page (idle-deferred).
  // Uses a ref-keyed guard so the enrichment fires exactly ONCE per distinct filter
  // set. Removing conversationsData?.pages from deps prevents the effect from
  // re-scheduling after the enrichment itself patches the cache.
  const enrichedFiltersKeyRef = useRef<string | null>(null);
  const hasFirstPageRef = useRef(false);

  if (!conversationsInitialLoading && conversationsData?.pages?.[0]?.conversations?.length) {
    hasFirstPageRef.current = true;
  }

  useEffect(() => {
    if (conversationsInitialLoading) {
      // Filters changed and a new fetch is in flight — reset the guard so enrichment
      // fires again once the new page loads.
      enrichedFiltersKeyRef.current = null;
      return;
    }
    if (!hasFirstPageRef.current) return;

    // Build a stable key for the current filter set.
    const filtersKey = [
      conversationsFilters.search ?? "",
      conversationsFilters.labelFilter ?? "",
      conversationsFilters.adminQueue ? "1" : "0",
      conversationsFilters.locationFilter ?? "",
      conversationsFilters.retargetOnly ? "1" : "0",
    ].join("|");

    // Skip if we already scheduled enrichment for these exact filters.
    if (enrichedFiltersKeyRef.current === filtersKey) return;
    enrichedFiltersKeyRef.current = filtersKey;

    let cancelled = false;
    const runEnrichment = () => {
      if (cancelled) return;
      void (async () => {
        try {
          const page = await fetchConversationsFirstPageFullEnrichment(
            conversationsFilters,
          );
          if (cancelled || !page.conversations?.length) return;
          patchConversationsListFirstPageEnrichment(
            queryClient,
            conversationsFilters,
            page.conversations,
          );
        } catch (err) {
          console.warn("Background conversations enrichment failed:", err);
        }
      })();
    };

    const cancelIdle = deferUntilIdle(runEnrichment, {
      timeoutMs: 5000,
      fallbackMs: 2500,
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [conversationsFilters, conversationsInitialLoading, queryClient]);

  const conversationsListMeta = useMemo(
    () => extractConversationsListMeta(conversationsData?.pages),
    [conversationsData?.pages],
  );

  useEffect(() => {
    const seed = conversationsListMeta.counts?.unreadCount;
    if (seed === undefined) return;
    queryClient.setQueryData(buildUnreadCountQueryKey(unreadCountFilters), {
      success: true,
      unreadCount: seed,
    });
  }, [
    conversationsListMeta.counts?.unreadCount,
    queryClient,
    unreadCountFilters,
  ]);

  const conversationCounts = useMemo(
    () => ({
      totalCount: conversationsListMeta.counts?.totalCount ?? 0,
      ownerCount: conversationsListMeta.counts?.ownerCount ?? 0,
      guestCount: conversationsListMeta.counts?.guestCount ?? 0,
      unreadCount:
        unreadCountData?.unreadCount ??
        conversationsListMeta.counts?.unreadCount ??
        0,
    }),
    [conversationsListMeta.counts, unreadCountData?.unreadCount],
  );

  const conversations = useMemo(() => {
    const raw = conversationsData?.pages
      ? flattenConversationsPages(conversationsData.pages)
      : [];
    let youConversation = youConversationData?.conversation;
    const open = openConversationRef.current;
    if (
      open?._id &&
      (open.isInternal || open.source === "internal") &&
      youConversation &&
      String(open._id) === String(youConversation._id)
    ) {
      youConversation = open;
    }
    const withYou = mergeYouConversationIntoList(raw, youConversation);
    const merged = mergeOpenConversationIntoList(
      withYou,
      openConversationRef.current,
    );
    return maskConversationListForViewer(merged);
  }, [
    conversationsData?.pages,
    youConversationData?.conversation,
    maskConversationListForViewer,
    openConversationVersion,
  ]);

  const totalUnreadCount = conversationCounts.unreadCount;

  const loading =
    conversationsInitialLoading ||
    (conversationsFetching &&
      !loadingMoreConversations &&
      conversations.length === 0);

  const patchConversationsList = useCallback(
    (mutator: (list: Conversation[]) => Conversation[]) => {
      // Broadcast to every cached filter variant so all tabs stay in sync.
      broadcastConversationPatch(queryClient, mutator);
      // Also ensure the primary active-filter entry exists if not yet in cache.
      mutateWhatsAppConversationsListCache(
        queryClient,
        conversationsFiltersRef.current,
        mutator,
      );
    },
    [queryClient],
  );

  const refetchConversationsList = useCallback(async () => {
    const result = await refetchConversations();
    return result.data?.pages
      ? flattenConversationsPages(result.data.pages)
      : [];
  }, [refetchConversations]);

  refetchConversationsListRef.current = refetchConversationsList;

  const setOpenConversationSnapshot = useCallback((conversation: Conversation | null) => {
    openConversationRef.current = conversation;
    openConversationVersionRef.current += 1;
    setOpenConversationVersion(openConversationVersionRef.current);
  }, []);

  const handleUpdateConversation = useCallback(
    (conversationId: string, patch: Partial<Conversation>) => {
      mutateWhatsAppConversationsListCache(
        queryClient,
        conversationsFiltersRef.current,
        (list) => list.map((c) => (c._id === conversationId ? { ...c, ...patch } : c)),
      );
      setArchivedConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, ...patch } : c)),
      );
      if (
        openConversationRef.current &&
        openConversationRef.current._id === conversationId
      ) {
        openConversationRef.current = {
          ...openConversationRef.current,
          ...patch,
        };
        openConversationVersionRef.current += 1;
        setOpenConversationVersion(openConversationVersionRef.current);
      }
    },
    [queryClient],
  );

  const syncWhatsAppUrlParams = useCallback(
    (patch: { locationFilter?: string; adminQueue?: boolean }) => {
      const queue = patch.adminQueue ?? adminQueue;
      const locFilter = patch.locationFilter ?? adminLocationFilter;

      router.replace(
        buildWhatsAppInboxUrl(searchParams, {
          adminQueue: queue,
          locationFilter: queue ? null : locFilter,
        }),
        { scroll: false },
      );
    },
    [adminQueue, adminLocationFilter, router, searchParams],
  );

  const handleAdminLocationFilterChange = useCallback(
    (value: string) => {
      setAdminLocationFilter(value);
      if (token?.role === "SuperAdmin" && value !== "all") {
        persistSuperAdminLocationFilter(value);
      }
      if (value !== "all") {
        setAdminQueue(false);
      }
      syncWhatsAppUrlParams({ locationFilter: value, adminQueue: false });
    },
    [syncWhatsAppUrlParams, token?.role],
  );

  const handleAdminQueueChange = useCallback(
    (value: boolean) => {
      setAdminQueue(value);
      if (value) {
        setAdminLocationFilter("all");
      }
      syncWhatsAppUrlParams({ adminQueue: value, locationFilter: "all" });
    },
    [syncWhatsAppUrlParams],
  );

  const fetchArchivedConversations = useCallback(
    async (opts?: { silent?: boolean; loadMore?: boolean }) => {
      const loadMore = opts?.loadMore === true;

      if (opts?.silent === true) {
        void queryClient.invalidateQueries({
          queryKey: WHATSAPP_ARCHIVED_IDS_QUERY_KEY,
        });
        return;
      }

      try {
        if (!loadMore) {
          setArchivedLoading(true);
        } else {
          setLoadingMoreArchived(true);
        }

        const params: Record<string, string | number> = { limit: 25 };
        if (loadMore && archivedCursor) {
          params.cursor = archivedCursor;
        }

        const response = await axios.get("/api/whatsapp/conversations/archive", {
          params,
        });
        if (response.data.success) {
          const rulesFromApi = response.data.phoneMaskRules as
            | WhatsAppPhoneMaskRules
            | undefined;
          if (rulesFromApi) {
            setPhoneMaskRules(rulesFromApi);
            phoneMaskRulesRef.current = rulesFromApi;
          }
          const archivedList = maskConversationListForViewer(
            (response.data.conversations || []) as Conversation[],
          );
          setArchivedConversations((prev) =>
            loadMore ? [...prev, ...archivedList] : archivedList,
          );
          setArchivedCount(response.data.count || 0);
          setArchivedHasMore(response.data.pagination?.hasMore ?? false);
          setArchivedCursor(response.data.pagination?.nextCursor ?? null);

          const unreadChatCount = archivedList.filter(
            (c: Conversation) =>
              (c.unreadCount || 0) > 0 && c.lastMessageDirection === "incoming",
          ).length;
          setArchivedUnreadCount(unreadChatCount);

          if (!loadMore) {
            const ids =
              archivedConversationIdsRef.current.size > 0
                ? Array.from(archivedConversationIdsRef.current)
                : archivedList.map((c) => c._id).filter(Boolean);
            syncArchivedStorage(ids);
          }
        }
      } catch (error: unknown) {
        console.error("Error fetching archived conversations:", error);
        if (!loadMore) {
          toast({
            title: "Error",
            description: "Failed to fetch archived conversations",
            variant: "destructive",
          });
        }
      } finally {
        if (!loadMore) {
          setArchivedLoading(false);
        } else {
          setLoadingMoreArchived(false);
        }
      }
    },
    [archivedCursor, maskConversationListForViewer, queryClient, syncArchivedStorage, toast],
  );

  const archiveConversation = useCallback(
    async (conversationId: string) => {
      try {
        const response = await axios.post("/api/whatsapp/conversations/archive", {
          conversationId,
        });

        if (response.data.success) {
          archivedConversationIdsRef.current.add(conversationId);
          void queryClient.invalidateQueries({
            queryKey: WHATSAPP_ARCHIVED_IDS_QUERY_KEY,
          });

          // Optimistically reduce the unread badge by the archived conversation's count
          let archivedUnread = 0;
          patchConversationsList((prev) => {
            const archiving = prev.find((c) => c._id === conversationId);
            archivedUnread = archiving?.unreadCount ?? 0;
            return prev.filter((c) => c._id !== conversationId);
          });
          if (archivedUnread > 0) {
            adjustWhatsAppUnreadCountQueryCache(
              queryClient,
              toUnreadCountQueryFilters(conversationsFiltersRef.current),
              -archivedUnread,
            );
          }

          setArchivedCount((prev) => prev + 1);
          setArchivedConversations((prev) => {
            syncArchivedStorage([...prev.map((c) => c._id), conversationId]);
            return prev;
          });

          onArchiveSelectedConversationRef.current?.(conversationId);

          toast({
            title: "Chat archived",
            description:
              "This chat has been archived. You can find it in the Archived section.",
          });
        }
      } catch (error: unknown) {
        console.error("Error archiving conversation:", error);
        toast({
          title: "Error",
          description: "Failed to archive conversation",
          variant: "destructive",
        });
      }
    },
    [patchConversationsList, queryClient, syncArchivedStorage, toast],
  );

  const unarchiveConversation = useCallback(
    async (conversationId: string) => {
      try {
        const response = await axios.delete(
          `/api/whatsapp/conversations/archive?conversationId=${conversationId}`,
        );

        if (response.data.success) {
          archivedConversationIdsRef.current.delete(conversationId);
          void queryClient.invalidateQueries({
            queryKey: WHATSAPP_ARCHIVED_IDS_QUERY_KEY,
          });
          setArchivedConversations((prev) => {
            const next = prev.filter((c) => c._id !== conversationId);
            syncArchivedStorage(next.map((c) => c._id));
            return next;
          });
          setArchivedCount((prev) => Math.max(0, prev - 1));

          await refetchConversationsList();

          toast({
            title: "Chat unarchived",
            description: "This chat has been restored to your inbox.",
          });
        }
      } catch (error: unknown) {
        console.error("Error unarchiving conversation:", error);
        toast({
          title: "Error",
          description: "Failed to unarchive conversation",
          variant: "destructive",
        });
      }
    },
    [queryClient, refetchConversationsList, syncArchivedStorage, toast],
  );

  const toggleArchiveView = useCallback(() => {
    if (showingArchived) {
      setShowingArchived(false);
      setArchivedCursor(null);
      setArchivedHasMore(false);
      void refetchConversationsList();
    } else {
      setShowingArchived(true);
      setArchivedCursor(null);
      setArchivedHasMore(false);
      void fetchArchivedConversations();
    }
    onArchiveSelectedConversationRef.current?.("__clear__");
  }, [fetchArchivedConversations, refetchConversationsList, showingArchived]);

  // Resolve inbox location defaults before the first list fetch (avoids SuperAdmin double-fetch).
  useLayoutEffect(() => {
    if (inboxFiltersReadyRef.current) return;
    if (!token) return;

    const defaults = resolveInboxLocationDefaults(token, searchParams);
    setAdminLocationFilter(defaults.adminLocationFilter);
    setAdminQueue(defaults.adminQueue);

    if (defaults.shouldSyncUrl && defaults.urlLocationFilter) {
      router.replace(
        buildWhatsAppInboxUrl(searchParams, {
          locationFilter: defaults.urlLocationFilter,
          adminQueue: false,
        }),
        { scroll: false },
      );
    }

    inboxFiltersReadyRef.current = true;
    setInboxFiltersReady(true);
    // searchParams intentionally read once at init — URL sync effect handles later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router]);

  // Keep filter state in sync when URL changes after initial resolution (back/forward, deep links).
  useEffect(() => {
    if (!inboxFiltersReadyRef.current) return;

    const fromUrl = searchParams?.get("locationFilter");
    const adminQueueFromUrl = searchParams?.get("adminQueue") === "true";

    if (adminQueueFromUrl) {
      setAdminQueue(true);
      setAdminLocationFilter("all");
      return;
    }

    if (fromUrl) {
      setAdminLocationFilter(fromUrl);
      setAdminQueue(false);
      if (token?.role === "SuperAdmin") {
        persistSuperAdminLocationFilter(fromUrl);
      }
    }
  }, [searchParams, token?.role]);

  const superAdminLocationsEnabled =
    inboxFiltersReady && token?.role === "SuperAdmin";

  const { data: monthlyTargetLocations } = useMonthlyTargetLocations(
    superAdminLocationsEnabled,
  );

  const adminLocationOptions = useMemo(() => {
    if (!token) return EMPTY_ADMIN_LOCATION_OPTIONS;

    const privilegeUser = {
      role: token.role,
      email: token.email,
      allotedArea: token.allotedArea,
    };

    if (token.role === "SuperAdmin") {
      return monthlyTargetLocations ?? EMPTY_ADMIN_LOCATION_OPTIONS;
    }

    if (canUseInboxLocationFilter(privilegeUser)) {
      return getInboxLocationFilterOptionsForUser(privilegeUser);
    }

    return EMPTY_ADMIN_LOCATION_OPTIONS;
  }, [
    token,
    token?.role,
    token?.email,
    token?.allotedArea,
    monthlyTargetLocations,
  ]);

  useEffect(() => {
    if (conversationsListMeta.archivedCount !== undefined) {
      setArchivedCount(conversationsListMeta.archivedCount);
    }
  }, [conversationsListMeta.archivedCount]);

  useEffect(() => {
    const rules = conversationsListMeta.phoneMaskRules;
    if (rules) {
      setPhoneMaskRules(rules);
      phoneMaskRulesRef.current = rules;
    }
  }, [conversationsListMeta.phoneMaskRules]);

  useEffect(() => {
    const fromToken = getWhatsAppPhoneMaskFromToken(token);
    setPhoneMaskRules(fromToken);
    phoneMaskRulesRef.current = fromToken;
  }, [token?.whatsappPhoneMask, token]);

  useEffect(() => {
    viewerRoleRef.current = token?.role || "";
  }, [token?.role]);

  useEffect(() => {
    if (!conversationsQueryError) return;
    toast({
      title: "Error",
      description: "Failed to fetch conversations",
      variant: "destructive",
    });
  }, [conversationsQueryError, toast]);

  const handleSidebarTabHintConsumed = useCallback(
    () => setSidebarTabHint(null),
    [],
  );

  const stateValue = useMemo<ConversationListStateValue>(
    () => ({
      conversations,
      loading,
      hasMoreConversations: hasMoreConversations ?? false,
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
      onSidebarTabHintConsumed: handleSidebarTabHintConsumed,
      showingArchived,
      archivedConversations,
      archivedCount,
      archivedUnreadCount,
      archivedPrefetchUnreadTotal,
      archivedHasMore,
      loadingMoreArchived,
      archivedLoading,
      phoneMaskRules,
      initiationLimitRefreshKey,
      bumpInitiationLimitRefreshKey: () =>
        setInitiationLimitRefreshKey((k) => k + 1),
      newCountryCode,
      setNewCountryCode,
      newPhoneNumber,
      setNewPhoneNumber,
    }),
    [
      conversations,
      loading,
      hasMoreConversations,
      loadingMoreConversations,
      conversationCounts,
      totalUnreadCount,
      searchQuery,
      labelFilter,
      adminQueue,
      adminLocationFilter,
      adminLocationOptions,
      sidebarTabHint,
      showingArchived,
      archivedConversations,
      archivedCount,
      archivedUnreadCount,
      archivedPrefetchUnreadTotal,
      archivedHasMore,
      loadingMoreArchived,
      archivedLoading,
      phoneMaskRules,
      initiationLimitRefreshKey,
      newCountryCode,
      newPhoneNumber,
      handleSidebarTabHintConsumed,
    ],
  );

  const patchArchivedConversations = useCallback(
    (mutator: (list: Conversation[]) => Conversation[]) => {
      setArchivedConversations((prev) => mutator(prev));
    },
    [],
  );

  const adjustArchivedUnreadCount = useCallback((delta: number) => {
    setArchivedUnreadCount((c) => Math.max(0, c + delta));
  }, []);

  const actionsApiRef = useRef<ConversationListActionsInternal>(
    {} as ConversationListActionsInternal,
  );

  actionsApiRef.current = {
    patchConversationsList,
    refetchConversationsList,
    fetchNextConversationsPage: () => {
      void fetchNextConversationsPage();
    },
    conversationsFiltersRef,
    refetchConversationsListRef,
    setOpenConversationSnapshot,
    handleAdminQueueChange,
    handleAdminLocationFilterChange,
    setAdminQueue,
    toggleArchiveView,
    archiveConversation,
    unarchiveConversation,
    fetchArchivedConversations,
    handleUpdateConversation,
    maskConversationForViewer,
    maskConversationListForViewer,
    archivedConversationIdsRef,
    syncArchivedStorage,
    bumpInitiationLimitRefreshKey: () =>
      setInitiationLimitRefreshKey((k) => k + 1),
    patchArchivedConversations,
    adjustArchivedUnreadCount,
    registerArchiveSelectionHandler: (handler) => {
      onArchiveSelectedConversationRef.current = handler;
    },
  };

  return (
    <ConversationListActionsContext.Provider value={actionsApiRef}>
      <ConversationListStateContext.Provider value={stateValue}>
        {children}
      </ConversationListStateContext.Provider>
    </ConversationListActionsContext.Provider>
  );
}
