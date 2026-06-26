"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";
import type { ChannelPhoneConfig } from "@/lib/whatsapp/resolveAllowedPhoneConfigs";

const EMPTY_PHONE_CONFIGS: ChannelPhoneConfig[] = [];
import type { Conversation, Message, Template } from "../types";
import { useMessages } from "../hooks/useMessages";
import {
  useConversationReaders,
  conversationReadersQueryKey,
} from "../hooks/useConversationReaders";
import {
  mutateWhatsAppMessagesCache,
  clearWhatsAppMessagesCache,
  buildMessagesQueryKey,
} from "../lib/whatsappQueryCache";
import {
  getConversationBusinessPhoneId,
  resolveTemplatesCacheKey,
} from "../utils";
import { useMobileView } from "../hooks/useMobileView";
import { buildWhatsAppInboxUrl } from "../lib/whatsappInboxUrl";
import { useConversationListActionsRef } from "./ConversationListContext";
import type { ConversationReader } from "@/lib/whatsapp/conversationReaders";
import type {
  ActiveThreadActionsValue,
  ActiveThreadStateValue,
} from "./active-thread-context-types";

type TemplatesQueryData = {
  success: boolean;
  templates: Template[];
  channelScoped?: boolean;
  metaUnavailable?: boolean;
  warning?: string;
};

type PhoneConfigsQueryData = {
  success: boolean;
  phoneConfigs: ChannelPhoneConfig[];
};

const ActiveThreadSelectionContext = createContext<
  Conversation | null | undefined
>(undefined);
const ActiveThreadStateContext = createContext<ActiveThreadStateValue | null>(null);
const ActiveThreadActionsContext =
  createContext<MutableRefObject<ActiveThreadActionsValue> | null>(null);

export function useActiveThreadSelection(): Conversation | null {
  const ctx = useContext(ActiveThreadSelectionContext);
  if (ctx === undefined) {
    throw new Error(
      "useActiveThreadSelection must be used within ActiveThreadProvider",
    );
  }
  return ctx;
}

export function useActiveThreadState(): ActiveThreadStateValue {
  const ctx = useContext(ActiveThreadStateContext);
  if (!ctx) {
    throw new Error("useActiveThreadState must be used within ActiveThreadProvider");
  }
  return ctx;
}

export function useActiveThreadActionsRef(): MutableRefObject<ActiveThreadActionsValue> {
  const ctx = useContext(ActiveThreadActionsContext);
  if (!ctx) {
    throw new Error(
      "useActiveThreadActionsRef must be used within ActiveThreadProvider",
    );
  }
  return ctx;
}

export function ActiveThreadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const listActionsRef = useConversationListActionsRef();
  const { isMobile, navigateToChat, setMobileView } = useMobileView();

  const isRetargetOnly = searchParams?.get("retargetOnly") === "1";
  const retargetOnlyRef = useRef(isRetargetOnly);
  retargetOnlyRef.current = isRetargetOnly;

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const [readersRefreshToken, setReadersRefreshToken] = useState(0);
  const [skipReadersFetch, setSkipReadersFetch] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [pendingScrollToMessageId, setPendingScrollToMessageId] = useState<
    string | null
  >(null);

  const markReadInFlightRef = useRef(new Set<string>());
  const lastMarkedReadMessageRef = useRef<Record<string, string>>({});
  const markConversationAsReadRef = useRef<
    (conversationId: string, opts?: { lastMessageId?: string }) => Promise<void>
  >(async () => {});

  const selectedConversationId = selectedConversation?._id ?? null;

  const readersQueryEnabled =
    Boolean(selectedConversationId) &&
    (!skipReadersFetch || readersRefreshToken > 0);

  const { data: conversationReaders = [] } = useConversationReaders(
    selectedConversationId,
    {
      enabled: readersQueryEnabled,
      refreshToken: readersRefreshToken,
    },
  );

  const setConversationReaders = useCallback(
    (readers: ConversationReader[]) => {
      if (!selectedConversationId) return;
      queryClient.setQueryData(
        conversationReadersQueryKey(
          selectedConversationId,
          readersRefreshToken,
        ),
        readers,
      );
    },
    [queryClient, selectedConversationId, readersRefreshToken],
  );

  const { data: phoneConfigsData, isFetched: phoneConfigsReady } =
    useQuery<PhoneConfigsQueryData>({
    queryKey: ["whatsappPhoneConfigs"],
    queryFn: async () => {
      const response = await axios.get("/api/whatsapp/phone-configs");
      if (!response.data?.success) {
        throw new Error("Failed to load phone numbers");
      }
      return response.data as PhoneConfigsQueryData;
    },
    enabled: Boolean(token),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const allowedPhoneConfigs = useMemo(
    () => phoneConfigsData?.phoneConfigs ?? EMPTY_PHONE_CONFIGS,
    [phoneConfigsData?.phoneConfigs],
  );

  const templatesCacheKey = useMemo(
    () => resolveTemplatesCacheKey(selectedConversation, allowedPhoneConfigs),
    [selectedConversation, allowedPhoneConfigs],
  );

  const {
    data: messagesData,
    fetchNextPage: fetchOlderMessagesPage,
    hasNextPage: hasMoreMessages,
    isFetchingNextPage: loadingOlderMessages,
    isLoading: messagesInitialLoading,
    isFetching: messagesFetching,
  } = useMessages(selectedConversationId);

  const { data: templatesData, isLoading: templatesLoading } =
    useQuery<TemplatesQueryData>({
      queryKey: ["whatsappTemplates", templatesCacheKey],
      queryFn: async () => {
        const response = await axios.get("/api/whatsapp/templates", {
          params: { conversationId: selectedConversationId },
        });
        if (!response.data?.success) {
          throw new Error(
            typeof response.data?.error === "string"
              ? response.data.error
              : "Failed to fetch message templates",
          );
        }
        return response.data as TemplatesQueryData;
      },
      enabled:
        Boolean(templatesCacheKey && selectedConversationId) &&
        !messagesInitialLoading,
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    });

  const templates: Template[] = templatesData?.templates ?? [];
  const templatesChannelScoped = Boolean(templatesData?.channelScoped);

  const messages = useMemo(() => {
    if (!messagesData?.pages?.length) return [];
    return messagesData.pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages ?? []);
  }, [messagesData?.pages]);

  const messagesLoading =
    messagesInitialLoading ||
    (messagesFetching && !loadingOlderMessages && messages.length === 0);

  const updateLocalLastReadAt = useCallback((conversationId: string) => {
    if (typeof window === "undefined" || !conversationId) return;
    try {
      const raw = localStorage.getItem("whatsapp_last_read_at");
      const map = raw ? JSON.parse(raw) : {};
      map[conversationId] = new Date().toISOString();
      localStorage.setItem("whatsapp_last_read_at", JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }, []);

  const persistActiveConversation = useCallback((conversationId?: string | null) => {
    if (typeof window === "undefined") return;
    if (conversationId) {
      localStorage.setItem(
        "whatsapp_active_conversation",
        JSON.stringify({ conversationId, updatedAt: Date.now() }),
      );
    } else {
      localStorage.removeItem("whatsapp_active_conversation");
    }
  }, []);

  const mutateActiveMessages = useCallback(
    (mutator: (messages: Message[]) => Message[]) => {
      const conversationId = selectedConversationRef.current?._id;
      if (!conversationId) return;
      mutateWhatsAppMessagesCache(queryClient, conversationId, mutator);
    },
    [queryClient],
  );

  const markConversationAsRead = useCallback(
    async (conversationId: string, opts?: { lastMessageId?: string }) => {
      if (!conversationId || markReadInFlightRef.current.has(conversationId)) return;

      const messageId = opts?.lastMessageId?.trim() || "";
      if (
        messageId &&
        lastMarkedReadMessageRef.current[conversationId] === messageId
      ) {
        return;
      }

      markReadInFlightRef.current.add(conversationId);
      try {
        const response = await axios.post("/api/whatsapp/conversations/read", {
          conversationId,
        });

        if (Array.isArray(response.data?.readers)) {
          const readers = response.data.readers as ConversationReader[];
          queryClient.setQueryData(
            conversationReadersQueryKey(conversationId, 0),
            readers,
          );
          setSkipReadersFetch(true);
        }

        if (response.data?.skipped) {
          return;
        }

        const markedId = response.data?.lastReadMessageId;
        if (markedId) {
          lastMarkedReadMessageRef.current[conversationId] = String(markedId);
        } else if (messageId) {
          lastMarkedReadMessageRef.current[conversationId] = messageId;
        }

        updateLocalLastReadAt(conversationId);
        listActionsRef.current.handleUpdateConversation(conversationId, {
          unreadCount: 0,
        });
      } catch {
        setSkipReadersFetch(false);
      } finally {
        markReadInFlightRef.current.delete(conversationId);
      }
    },
    [listActionsRef, queryClient, updateLocalLastReadAt],
  );

  markConversationAsReadRef.current = markConversationAsRead;

  const handleUpdateConversation = useCallback(
    (conversationId: string, patch: Partial<Conversation>) => {
      listActionsRef.current.handleUpdateConversation(conversationId, patch);
      setSelectedConversation((prev) =>
        prev && prev._id === conversationId ? { ...prev, ...patch } : prev,
      );
    },
    [listActionsRef],
  );

  const handleCrmLabelsUpdated = useCallback(
    (labels: string[]) => {
      if (selectedConversationRef.current) {
        handleUpdateConversation(selectedConversationRef.current._id, { labels });
      }
      listActionsRef.current.bumpInitiationLimitRefreshKey();
    },
    [handleUpdateConversation, listActionsRef],
  );

  const selectConversation = useCallback(
    (conversation: Conversation | null) => {
      setReplyToMessage(null);
      setReadersRefreshToken(0);

      if (conversation) {
        const isSameConversation =
          selectedConversationRef.current?._id === conversation._id;
        const alreadyRead =
          (conversation.unreadCount || 0) === 0 &&
          conversation.lastMessageDirection !== "incoming";

        const shouldMarkRead =
          (conversation.unreadCount || 0) > 0 ||
          conversation.lastMessageDirection === "incoming";
        setSkipReadersFetch(shouldMarkRead);

        if (isSameConversation && alreadyRead) {
          return;
        }

        const masked = listActionsRef.current.maskConversationForViewer(conversation);
        setSelectedConversation(masked);
        listActionsRef.current.setOpenConversationSnapshot(masked);

        if (!isSameConversation && isMobile) {
          navigateToChat();
        }

        if (shouldMarkRead) {
          void markConversationAsRead(conversation._id, {
            lastMessageId: conversation.lastMessageId,
          });
        }

        const currentConvParam =
          searchParams?.get("conversation") || searchParams?.get("conversationId");
        if (!isSameConversation || currentConvParam !== conversation._id) {
          router.push(
            buildWhatsAppInboxUrl(searchParams, {
              conversation: conversation._id,
              retargetOnly: retargetOnlyRef.current,
            }),
            { scroll: false },
          );
        }
      } else {
        setSkipReadersFetch(false);
        setSelectedConversation(null);
        listActionsRef.current.setOpenConversationSnapshot(null);
        if (isMobile) {
          setMobileView("conversations");
        }
        router.push(
          buildWhatsAppInboxUrl(searchParams, { conversation: null }),
          { scroll: false },
        );
      }
    },
    [
      isMobile,
      listActionsRef,
      markConversationAsRead,
      navigateToChat,
      router,
      searchParams,
      setMobileView,
    ],
  );

  const loadOlderMessages = useCallback(() => {
    if (selectedConversation && hasMoreMessages && !loadingOlderMessages) {
      void fetchOlderMessagesPage();
    }
  }, [
    selectedConversation,
    hasMoreMessages,
    loadingOlderMessages,
    fetchOlderMessagesPage,
  ]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    listActionsRef.current.setOpenConversationSnapshot(selectedConversation);
    persistActiveConversation(selectedConversation?._id);
    return () => {
      persistActiveConversation(null);
    };
  }, [selectedConversation, listActionsRef, persistActiveConversation]);

  useEffect(() => {
    listActionsRef.current.registerArchiveSelectionHandler((conversationId) => {
      if (conversationId === "__clear__") {
        setSelectedConversation(null);
        return;
      }
      if (selectedConversationRef.current?._id === conversationId) {
        setSelectedConversation(null);
        clearWhatsAppMessagesCache(queryClient, conversationId);
      }
    });
    return () => {
      listActionsRef.current.registerArchiveSelectionHandler(null);
    };
  }, [listActionsRef, queryClient]);

  const stateValue = useMemo<ActiveThreadStateValue>(
    () => ({
      selectedConversation,
      messages,
      messagesLoading,
      hasMoreMessages: hasMoreMessages ?? false,
      loadingOlderMessages,
      templates,
      templatesLoading,
      templatesChannelScoped,
      readersRefreshToken,
      conversationReaders,
      skipReadersFetch,
      setConversationReaders,
      allowedPhoneConfigs,
      phoneConfigsReady,
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
    }),
    [
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
      allowedPhoneConfigs,
      phoneConfigsReady,
      newMessage,
      replyToMessage,
      sendingMessage,
      uploadingMedia,
      selectedTemplate,
      templateParams,
      showMessageSearch,
      messageSearchQuery,
      pendingScrollToMessageId,
    ],
  );

  const actionsApiRef = useRef<ActiveThreadActionsValue>({
    selectConversation: () => {},
    loadOlderMessages: () => {},
    mutateActiveMessages: () => {},
    markConversationAsRead: async () => {},
    handleUpdateConversation: () => {},
    handleCrmLabelsUpdated: () => {},
    selectedConversationRef,
    markConversationAsReadRef,
    bumpReadersRefreshToken: () => {},
    setSelectedConversation: () => {},
    templatesCacheKey: "",
    setPendingScrollToMessageId: () => {},
    setMessageSearchQuery: () => {},
  });

  actionsApiRef.current.selectConversation = selectConversation;
  actionsApiRef.current.loadOlderMessages = loadOlderMessages;
  actionsApiRef.current.mutateActiveMessages = mutateActiveMessages;
  actionsApiRef.current.markConversationAsRead = markConversationAsRead;
  actionsApiRef.current.handleUpdateConversation = handleUpdateConversation;
  actionsApiRef.current.handleCrmLabelsUpdated = handleCrmLabelsUpdated;
  actionsApiRef.current.selectedConversationRef = selectedConversationRef;
  actionsApiRef.current.markConversationAsReadRef = markConversationAsReadRef;
  actionsApiRef.current.bumpReadersRefreshToken = () => {
    setSkipReadersFetch(false);
    setReadersRefreshToken((t) => t + 1);
  };
  actionsApiRef.current.setSelectedConversation = setSelectedConversation;
  actionsApiRef.current.templatesCacheKey = templatesCacheKey ?? "";
  actionsApiRef.current.setPendingScrollToMessageId = setPendingScrollToMessageId;
  actionsApiRef.current.setMessageSearchQuery = setMessageSearchQuery;

  return (
    <ActiveThreadActionsContext.Provider value={actionsApiRef}>
      <ActiveThreadSelectionContext.Provider value={selectedConversation}>
        <ActiveThreadStateContext.Provider value={stateValue}>
          {children}
        </ActiveThreadStateContext.Provider>
      </ActiveThreadSelectionContext.Provider>
    </ActiveThreadActionsContext.Provider>
  );
}
