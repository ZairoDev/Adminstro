import {
  useEffect,
  useCallback,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import type { ChannelPhoneConfig } from "@/lib/whatsapp/resolveAllowedPhoneConfigs";
import type { ActiveThreadActionsValue } from "../context/active-thread-context-types";
import type {
  Conversation,
  ConversationsListFilters,
  Message,
} from "../types";
import {
  repositionConversationAfterUpdate,
  insertConversationAtCorrectPosition,
  patchConversationInList,
  mapConversationsInList,
  invalidateWhatsAppConversationsList,
  clearWhatsAppMessagesCache,
  syncWhatsAppInboxUnreadCountAcrossFilters,
} from "../lib/whatsappQueryCache";
import {
  FULL_ACCESS_ROLES,
  getRetargetPhoneId,
  INTERNAL_YOU_PHONE_ID,
} from "@/lib/whatsapp/config";
import { WHATSAPP_YOU_CONVERSATION_QUERY_KEY } from "../hooks/useWhatsAppYouConversation";
import { getWhatsAppNotificationController } from "@/lib/notifications/whatsappNotificationController";
import type { RawWhatsAppMessage } from "@/lib/notifications/types";
import {
  extractMetaConversationPatch,
  inferWhatsAppConversationUpdateType,
  type WhatsAppConversationUpdatePayload,
} from "@/lib/whatsapp/conversationUpdatePayload";
import { sanitizeMetaAnswerSdpForBrowser } from "@/lib/whatsapp/callingSdp";
import {
  IncomingCallRingController,
  OutboundCallSoundController,
  logWebRtcMediaDiagnostics,
  type OutboundCallUiState,
} from "@/lib/whatsapp/calling";
import { useWhatsAppSocketRooms } from "./useWhatsAppSocketRooms";
import { showDesktopNotification } from "@/lib/whatsapp/browserDesktopNotify";
import { toast as whatsAppToastFn } from "@/hooks/use-toast";
import {
  addToLRUSet,
  simpleHashUtf8,
  isRemoteCallTerminalStatus,
  type PendingIncomingCallInvite,
} from "./socketUtils";

type AuthToken = {
  id?: string;
  _id?: string;
  role?: string;
};

type SocketMessagePayload = {
  messageId?: string;
  id?: string;
  _id?: string;
  from?: string;
  to?: string;
  type?: string;
  content?: Message["content"];
  mediaUrl?: string;
  timestamp?: string | Date;
  status?: Message["status"];
  direction?: Message["direction"];
  reactions?: Message["reactions"];
  replyToMessageId?: string;
  replyContext?: Message["replyContext"];
  reactedToMessageId?: string;
  reactionEmoji?: string;
  isInternal?: boolean;
  source?: string;
};

type WhatsAppNewMessagePayload = {
  eventId?: string;
  userId?: string;
  conversationId?: string;
  businessPhoneId?: string;
  isRetarget?: boolean;
  lastMessagePreview?: string | null;
  message?: SocketMessagePayload;
};

type WhatsAppNewConversationPayload = {
  conversation: {
    id: string;
    participantPhone: string;
    participantName: string;
    unreadCount?: number;
    lastMessageTime?: Date | string;
    conversationType?: Conversation["conversationType"];
  };
};

type WhatsAppMessageStatusPayload = {
  conversationId: string;
  messageId: string;
  status: Message["status"];
};

type WhatsAppMessageEchoPayload = {
  conversationId: string;
  message: SocketMessagePayload;
};

type WhatsAppIncomingCallPayload = {
  userId?: string;
  callId?: string | number;
  from?: string;
  callerInfo?: { profile?: { name?: string } };
};

type WhatsAppCallMissedPayload = {
  userId?: string;
  from?: string;
};

type WhatsAppCallStatusPayload = {
  callId?: string;
  callStatus?: string;
  userId?: string;
};

type WhatsAppHistorySyncPayload = {
  status?: string;
  messagesCount?: number;
};

type WhatsAppConversationReadPayload = {
  conversationId: string;
  userId: string;
};

export interface SocketHandlerRefs {
  seenEventIdsRef: MutableRefObject<Set<string>>;
  seenMessageIdsRef: MutableRefObject<Set<string>>;
  handleWhatsAppMessageRef: MutableRefObject<
    ((data: WhatsAppNewMessagePayload) => void) | null
  >;
  selectedPhoneIdRef: MutableRefObject<string | null>;
  allowedPhoneIdsRef: MutableRefObject<string[]>;
  retargetOnlyRef: MutableRefObject<boolean>;
  selectedConversationRef: MutableRefObject<Conversation | null>;
  conversationsFiltersRef: MutableRefObject<ConversationsListFilters>;
  markConversationAsReadRef: MutableRefObject<
    (conversationId: string, opts?: { lastMessageId?: string }) => Promise<void>
  >;
  pendingIncomingInviteRef: MutableRefObject<PendingIncomingCallInvite | null>;
  incomingCallRingRef: MutableRefObject<IncomingCallRingController | null>;
  activeCallIdRef: MutableRefObject<string | null>;
  peerRef: MutableRefObject<RTCPeerConnection | null>;
  sdpAnswerAppliedHashRef: MutableRefObject<string | null>;
  signalingAnswerTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
  callSoundRef: MutableRefObject<OutboundCallSoundController | null>;
  pendingOutboundCallRef: MutableRefObject<{ conversationId: string } | null>;
  refetchConversationsListRef: MutableRefObject<() => Promise<Conversation[]>>;
  archivedConversationIdsRef: MutableRefObject<Set<string>>;
  threadActionsRef: MutableRefObject<ActiveThreadActionsValue>;
  convUpdateTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  fetchArchivedConversationsRef: MutableRefObject<
    (opts?: { silent?: boolean; loadMore?: boolean }) => Promise<void>
  >;
}

export interface SocketHandlerActions {
  patchConversationsList: (
    mutator: (list: Conversation[]) => Conversation[],
  ) => void;
  mutateActiveMessages: (mutator: (messages: Message[]) => Message[]) => void;
  patchArchivedConversations: (
    mutator: (list: Conversation[]) => Conversation[],
  ) => void;
  adjustArchivedUnreadCount: (delta: number) => void;
  setSelectedConversation: (
    value: SetStateAction<Conversation | null>,
  ) => void;
  maskConversationForViewer: (conv: Conversation) => Conversation;
  syncArchivedStorage: (ids: string[]) => void;
  playNotificationSound: () => void;
  cleanupOutboundCallResources: () => void;
  setPendingIncomingInvite: (
    value: SetStateAction<PendingIncomingCallInvite | null>,
  ) => void;
  setOutboundCallUi: (
    value: SetStateAction<OutboundCallUiState | null>,
  ) => void;
  setActiveCallId: (value: SetStateAction<string | null>) => void;
  setRemoteAudioPlayBlocked: (value: SetStateAction<boolean>) => void;
  setLastAnswerSdpPreview: (
    value: SetStateAction<string | null>,
  ) => void;
  toast: typeof whatsAppToastFn;
}

export interface UseSocketHandlersParams {
  socket: Socket | null;
  token: AuthToken | null;
  allowedPhoneConfigs: ChannelPhoneConfig[];
  /** True once GET /api/whatsapp/phone-configs has settled (avoids empty-then-loaded room churn). */
  phoneConfigsReady: boolean;
  refs: SocketHandlerRefs;
  actions: SocketHandlerActions;
}

function getTokenUserId(token: AuthToken | null): string | undefined {
  if (!token) return undefined;
  return token.id ?? token._id;
}

function buildSocketRoomKeys(configs: ChannelPhoneConfig[]): {
  phoneIds: string[];
  channelIds: string[];
  roomKey: string;
} {
  const phoneIds = configs
    .filter((c) => c.phoneNumberId && !c.isInternal)
    .map((c) => c.phoneNumberId)
    .sort();
  const channelIds = configs
    .filter((c) => c.channelId && !c.isInternal)
    .map((c) => c.channelId as string)
    .sort();
  return {
    phoneIds,
    channelIds,
    roomKey: `${phoneIds.join(",")}|${channelIds.join(",")}`,
  };
}

export function useSocketHandlers(params: UseSocketHandlersParams): void {
  const queryClient = useQueryClient();
  const { socket, token, allowedPhoneConfigs, phoneConfigsReady, refs, actions } = params;

  const {
    seenEventIdsRef,
    seenMessageIdsRef,
    handleWhatsAppMessageRef,
    selectedPhoneIdRef,
    allowedPhoneIdsRef,
    retargetOnlyRef,
    selectedConversationRef,
    conversationsFiltersRef,
    markConversationAsReadRef,
    pendingIncomingInviteRef,
    incomingCallRingRef,
    activeCallIdRef,
    peerRef,
    sdpAnswerAppliedHashRef,
    signalingAnswerTimerRef,
    remoteAudioRef,
    callSoundRef,
    pendingOutboundCallRef,
    refetchConversationsListRef,
    archivedConversationIdsRef,
    threadActionsRef,
    convUpdateTimerRef,
    fetchArchivedConversationsRef,
  } = refs;

  const {
    patchConversationsList,
    mutateActiveMessages,
    patchArchivedConversations,
    adjustArchivedUnreadCount,
    setSelectedConversation,
    maskConversationForViewer,
    syncArchivedStorage,
    playNotificationSound,
    cleanupOutboundCallResources,
    setPendingIncomingInvite,
    setOutboundCallUi,
    setActiveCallId,
    setRemoteAudioPlayBlocked,
    setLastAnswerSdpPreview,
    toast,
  } = actions;

  // Consolidated room join/leave (user room, retarget, phone, channel).
  const currentUserId = getTokenUserId(token);
  const userRole = token?.role || "";
  const retargetPhoneId =
    (userRole === "Advert" || userRole === "SuperAdmin")
      ? getRetargetPhoneId()
      : null;
  // Primitive roomKey is the only subscription identity we need for scoped rooms.
  const { phoneIds, channelIds, roomKey } =
    buildSocketRoomKeys(allowedPhoneConfigs);

  useWhatsAppSocketRooms(
    socket,
    currentUserId,
    retargetPhoneId,
    roomKey,
    phoneIds,
    channelIds,
    phoneConfigsReady,
  );

  const handleWhatsAppMessage = useCallback(
    (data: WhatsAppNewMessagePayload) => {
      const currentUserId = getTokenUserId(token);

      // Strong per-tab deduplication: ensure each eventId is processed at most once.
      // This protects the chat UI from any backend retries or duplicate socket emits.
      if (data.eventId) {
        if (seenEventIdsRef.current.has(data.eventId)) {
          return;
        }
        addToLRUSet(seenEventIdsRef.current, data.eventId);
      }

      if (
        data.userId &&
        currentUserId &&
        String(data.userId) !== String(currentUserId)
      ) {
        return;
      }

      const currentPhoneId = selectedPhoneIdRef.current;
      const currentConversation = selectedConversationRef.current;
      const isForCurrentConversation =
        currentConversation?._id === data.conversationId;
      const role = token?.role || "";
      const isFullAccessRole = (FULL_ACCESS_ROLES as readonly string[]).includes(
        role,
      );
      if (
        !isFullAccessRole &&
        data.businessPhoneId &&
        allowedPhoneIdsRef.current.length > 0 &&
        !allowedPhoneIdsRef.current.includes(data.businessPhoneId) &&
        !isForCurrentConversation
      ) {
        return;
      }

      // In retargetOnly mode, ignore messages from non-retarget conversations
      if (retargetOnlyRef.current && !data.isRetarget) {
        return;
      }

      const { conversationId, message } = data;

      if (!conversationId || !message) {
        return;
      }

      if (message.messageId && seenMessageIdsRef.current.has(message.messageId)) {
        return;
      }

      try {
        handleWhatsAppMessageRef.current = handleWhatsAppMessage;
      } catch {
        // ignore
      }

      const displayText =
        data.lastMessagePreview != null && data.lastMessagePreview !== ""
          ? data.lastMessagePreview
          : typeof message.content === "string"
            ? message.content
            : message.content?.text ||
              message.content?.caption ||
              `${message.type} message`;

      const isCurrentConversation = currentConversation?._id === conversationId;
      const isIncomingMessage = message.direction === "incoming";
      const outgoingStatus =
        message.direction === "outgoing"
          ? (message.status as Message["status"]) || "sent"
          : undefined;

      if (isCurrentConversation) {
        addToLRUSet(seenMessageIdsRef.current, message.messageId!);

        mutateActiveMessages((prev) => {
          if (message.type === "reaction" && message.reactedToMessageId) {
            return prev.map((msg) => {
              if (msg.messageId === message.reactedToMessageId) {
                const existingReactions = msg.reactions || [];
                const reactionEmoji =
                  message.reactionEmoji ||
                  (typeof message.content !== "string"
                    ? message.content?.text?.replace("Reacted: ", "")
                    : undefined) ||
                  "👍";
                const hasReaction = existingReactions.some(
                  (r) =>
                    r.emoji === reactionEmoji &&
                    r.direction === message.direction,
                );
                if (!hasReaction) {
                  return {
                    ...msg,
                    reactions: [
                      ...existingReactions,
                      {
                        emoji: reactionEmoji,
                        direction: message.direction!,
                      },
                    ],
                  };
                }
              }
              return msg;
            });
          }

          const exists = prev.find((m) => m.messageId === message.messageId);
          if (exists) return prev;

          if (message.direction === "outgoing") {
            const tempIdx = prev.findIndex(
              (m) =>
                typeof m.messageId === "string" &&
                m.messageId.startsWith("temp-") &&
                (m.status === "sending" || m.status === "sent") &&
                m.type === message.type &&
                m.direction === "outgoing",
            );
            if (tempIdx !== -1) {
              return prev.map((m, i) =>
                i === tempIdx
                  ? {
                      ...m,
                      _id: message._id || message.id || m._id,
                      messageId: message.messageId!,
                      content: message.content ?? m.content,
                      mediaUrl: message.mediaUrl ?? m.mediaUrl,
                      timestamp: new Date(message.timestamp!),
                      status: message.status || "sent",
                    }
                  : m,
              );
            }
          }

          return [
            ...prev,
            {
              _id: message._id || message.id,
              messageId: message.messageId!,
              from: message.from!,
              to: message.to!,
              type: message.type!,
              content: message.content!,
              mediaUrl: message.mediaUrl,
              timestamp: new Date(message.timestamp!),
              status: message.status!,
              direction: message.direction!,
              reactions: message.reactions || [],
              replyToMessageId: message.replyToMessageId,
              replyContext: message.replyContext,
            },
          ];
        });

        if (message.direction === "incoming") {
          void markConversationAsReadRef.current(conversationId, {
            lastMessageId: message.messageId,
          });
        }
      }

      requestAnimationFrame(() => {
        const filters = conversationsFiltersRef.current;
        let unreadBadgeDelta = 0;

        patchConversationsList((prev) =>
          repositionConversationAfterUpdate(prev, conversationId, (conv) => {
            const prevUnreadCount = conv.unreadCount || 0;
            const newUnreadCount =
              isIncomingMessage && !isCurrentConversation
                ? prevUnreadCount + 1
                : isCurrentConversation
                  ? 0
                  : prevUnreadCount;

            if (
              isIncomingMessage &&
              !isCurrentConversation &&
              prevUnreadCount === 0 &&
              newUnreadCount > 0
            ) {
              unreadBadgeDelta += 1;
            }

            return {
              ...conv,
              lastMessageContent: displayText,
              lastMessageTime: message.timestamp as Conversation["lastMessageTime"],
              lastMessageDirection: message.direction,
              lastMessageId: message.messageId,
              lastMessageStatus: outgoingStatus,
              unreadCount: newUnreadCount,
              ...(isIncomingMessage
                ? {
                    lastCustomerMessageAt: new Date(message.timestamp!),
                    ...(data.businessPhoneId
                      ? {
                          lastCustomerMessageAtByPhone: {
                            ...(conv.lastCustomerMessageAtByPhone ?? {}),
                            [String(data.businessPhoneId)]: new Date(
                              message.timestamp!,
                            ).toISOString(),
                          },
                        }
                      : {}),
                  }
                : {}),
            } as Conversation;
          }),
        );

        if (unreadBadgeDelta !== 0) {
          syncWhatsAppInboxUnreadCountAcrossFilters(
            queryClient,
            filters,
            unreadBadgeDelta,
          );
        }

        patchArchivedConversations((prev) =>
          repositionConversationAfterUpdate(prev, conversationId, (conv) => {
            const prevUnreadCount = conv.unreadCount || 0;
            const newUnreadCount =
              isIncomingMessage && !isCurrentConversation
                ? prevUnreadCount + 1
                : prevUnreadCount;
            if (
              isIncomingMessage &&
              !isCurrentConversation &&
              prevUnreadCount === 0
            ) {
              adjustArchivedUnreadCount(1);
            }
            return {
              ...conv,
              lastMessageContent: displayText,
              lastMessageTime: message.timestamp as Conversation["lastMessageTime"],
              lastMessageDirection: message.direction,
              lastMessageId: message.messageId,
              lastMessageStatus: outgoingStatus,
              unreadCount: newUnreadCount,
            } as Conversation;
          }),
        );

        if (isCurrentConversation) {
          setSelectedConversation((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              lastMessageTime: message.timestamp as Conversation["lastMessageTime"],
              lastMessageId: message.messageId,
              lastMessageStatus: outgoingStatus,
              ...(isIncomingMessage
                ? {
                    lastCustomerMessageAt: new Date(message.timestamp!),
                    ...(data.businessPhoneId
                      ? {
                          lastCustomerMessageAtByPhone: {
                            ...(prev.lastCustomerMessageAtByPhone ?? {}),
                            [String(data.businessPhoneId)]: new Date(
                              message.timestamp!,
                            ).toISOString(),
                          },
                        }
                      : {}),
                  }
                : {}),
            } as Conversation;
          });
        }
      });

      const internalLike =
        message.isInternal === true ||
        message.source === "internal" ||
        (typeof message.messageId === "string" &&
          message.messageId.startsWith("internal_"));
      if (message.direction === "incoming" && !internalLike) {
        playNotificationSound();
      }

      if (
        data.businessPhoneId === INTERNAL_YOU_PHONE_ID ||
        internalLike
      ) {
        void queryClient.invalidateQueries({
          queryKey: WHATSAPP_YOU_CONVERSATION_QUERY_KEY,
        });
      }

      getWhatsAppNotificationController().process(
        data as unknown as RawWhatsAppMessage,
      );
    },
    [
      token,
      seenEventIdsRef,
      seenMessageIdsRef,
      handleWhatsAppMessageRef,
      selectedPhoneIdRef,
      allowedPhoneIdsRef,
      retargetOnlyRef,
      selectedConversationRef,
      markConversationAsReadRef,
      conversationsFiltersRef,
      mutateActiveMessages,
      patchConversationsList,
      patchArchivedConversations,
      adjustArchivedUnreadCount,
      setSelectedConversation,
      playNotificationSound,
      queryClient,
    ],
  );

  const handleNewConversation = useCallback(
    (data: WhatsAppNewConversationPayload) => {
      const { conversation } = data;
      patchConversationsList((prev) => {
        const exists = prev.find((c) => c._id === conversation.id);
        if (exists) return prev;
        const newConversation = maskConversationForViewer({
          _id: conversation.id,
          participantPhone: conversation.participantPhone,
          participantName: conversation.participantName,
          unreadCount: conversation.unreadCount || 0,
          lastMessageTime: conversation.lastMessageTime,
          conversationType: conversation.conversationType,
          status: "active",
        } as Conversation);
        return insertConversationAtCorrectPosition(prev, newConversation);
      });
      toast({
        title: "New conversation",
        description: `${conversation.participantName} started a chat`,
      });
      playNotificationSound();
    },
    [patchConversationsList, maskConversationForViewer, toast, playNotificationSound],
  );

  const handleMessageStatus = useCallback(
    (data: WhatsAppMessageStatusPayload) => {
      const { conversationId, messageId, status } = data;
      const currentConversation = selectedConversationRef.current;
      if (currentConversation?._id === conversationId) {
        mutateActiveMessages((prev) => {
          const idx = prev.findIndex((msg) => msg.messageId === messageId);
          if (idx === -1 || prev[idx].status === status) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status };
          return updated;
        });
      }

      patchConversationsList((prev) => {
        const idx = prev.findIndex(
          (conv) =>
            conv._id === conversationId &&
            (conv.lastMessageId === messageId || !conv.lastMessageId),
        );
        if (idx === -1 || prev[idx].lastMessageStatus === status) return prev;
        return patchConversationInList(prev, conversationId, {
          lastMessageStatus: status,
          lastMessageId: messageId,
        });
      });
    },
    [selectedConversationRef, mutateActiveMessages, patchConversationsList],
  );

  const handleMessageEcho = useCallback(
    (data: WhatsAppMessageEchoPayload) => {
      const { conversationId, message } = data;
      const currentConversation = selectedConversationRef.current;

      if (!message.messageId) return;
      if (seenMessageIdsRef.current.has(message.messageId)) return;
      addToLRUSet(seenMessageIdsRef.current, message.messageId);

      const displayText =
        typeof message.content === "string"
          ? message.content
          : message.content?.text ||
            message.content?.caption ||
            `${message.type} message`;

      patchConversationsList((prev) =>
        repositionConversationAfterUpdate(prev, conversationId, (conv) =>
          ({
            ...conv,
            lastMessageContent: displayText,
            lastMessageTime: message.timestamp as Conversation["lastMessageTime"],
            lastMessageDirection: message.direction,
            lastMessageId: message.messageId || message.id,
            lastMessageStatus:
              message.direction === "outgoing"
                ? (message.status as Message["status"]) || "sent"
                : undefined,
          }) as Conversation,
        ),
      );

      if (currentConversation?._id === conversationId) {
        mutateActiveMessages((prev) => {
          const exists = prev.find((m) => m.messageId === message.messageId);
          if (exists) return prev;
          return [
            ...prev,
            {
              _id: message._id || message.id,
              messageId: message.messageId,
              from: message.from!,
              to: message.to!,
              type: message.type!,
              content: message.content!,
              mediaUrl: message.mediaUrl,
              timestamp: new Date(message.timestamp!),
              status: message.status!,
              direction: message.direction!,
              isEcho: true,
            } as Message,
          ];
        });
      }
    },
    [
      selectedConversationRef,
      seenMessageIdsRef,
      patchConversationsList,
      mutateActiveMessages,
    ],
  );

  // All socket event listeners in a single effect.
  useEffect(() => {
    if (!socket) return;

    const currentUserId = getTokenUserId(token);
    const isFullAccessRole = (FULL_ACCESS_ROLES as readonly string[]).includes(
      token?.role || "",
    );

    // Dev-only safeguard: Count listener registrations
    if (process.env.NODE_ENV === "development") {
      console.count("[WHATSAPP] Registering whatsapp-new-message handler");
    }

    socket.on("whatsapp-new-message", handleWhatsAppMessage);

    const handleIncomingCall = (data: WhatsAppIncomingCallPayload) => {
      if (
        data.userId &&
        currentUserId &&
        String(data.userId) !== String(currentUserId)
      ) {
        return;
      }
      const name = data.callerInfo?.profile?.name || data.from || "Caller";
      const callIdStr = data.callId != null ? String(data.callId) : "";
      toast({
        title: "📞 Incoming Call",
        description: `${name} is calling...`,
        duration: 10000,
      });
      playNotificationSound();
      showDesktopNotification({
        title: "Incoming WhatsApp call",
        body: `${name} is calling`,
        tag: callIdStr ? `wa-incoming-${callIdStr}` : "wa-incoming-call",
        requireInteraction: true,
      });
    };

    const handleCallIncomingOffer = (data: Record<string, unknown>) => {
      if (
        data.userId &&
        currentUserId &&
        String(data.userId) !== String(currentUserId)
      ) {
        return;
      }
      const phoneId =
        data.businessPhoneId != null ? String(data.businessPhoneId) : "";
      if (
        !isFullAccessRole &&
        phoneId &&
        allowedPhoneIdsRef.current.length > 0 &&
        !allowedPhoneIdsRef.current.includes(phoneId)
      ) {
        return;
      }

      const callId = typeof data.callId === "string" ? data.callId.trim() : "";
      const sdp = typeof data.sdp === "string" ? data.sdp : "";
      if (!callId || !sdp.trim()) return;

      const resolvedPhoneId =
        phoneId.trim() ||
        (selectedPhoneIdRef.current != null
          ? String(selectedPhoneIdRef.current).trim()
          : "");
      if (!resolvedPhoneId) {
        toast({
          title: "Incoming WhatsApp call",
          description:
            "Could not determine which business line this call is for. Select the correct WhatsApp number in the sidebar.",
          variant: "destructive",
          duration: 10_000,
        });
        playNotificationSound();
        return;
      }

      const conversationId =
        data.conversationId != null && String(data.conversationId).trim() !== ""
          ? String(data.conversationId).trim()
          : "";

      const contactLabelRaw =
        (typeof data.contactLabel === "string" && data.contactLabel.trim()
          ? String(data.contactLabel).trim()
          : null) ||
        (data.callerInfo as { profile?: { name?: string } } | undefined)
          ?.profile?.name ||
        (typeof data.from === "string" ? data.from : null) ||
        "Caller";

      const next: PendingIncomingCallInvite = {
        callId,
        conversationId,
        phoneNumberId: resolvedPhoneId,
        offerSdp: sdp,
        contactLabel: contactLabelRaw,
      };
      pendingIncomingInviteRef.current = next;
      setPendingIncomingInvite(next);

      incomingCallRingRef.current?.stop();
      incomingCallRingRef.current?.dispose();
      const ring = new IncomingCallRingController();
      incomingCallRingRef.current = ring;
      void ring.start();

      toast({
        title: "📞 Incoming call",
        description: `${contactLabelRaw} is calling. Tap Answer to connect.`,
        duration: 12_000,
      });
      playNotificationSound();
      showDesktopNotification({
        title: "Incoming WhatsApp call",
        body: `${contactLabelRaw} is calling — tap to answer in the app`,
        tag: `wa-incoming-${callId}`,
        requireInteraction: true,
      });
    };

    const handleCallMissed = (data: WhatsAppCallMissedPayload) => {
      if (
        data.userId &&
        currentUserId &&
        String(data.userId) !== String(currentUserId)
      ) {
        return;
      }
      toast({
        title: "📞 Missed Call",
        description: `Missed call from ${data.from}`,
        variant: "destructive",
      });
    };

    const handleCallStatus = (data: WhatsAppCallStatusPayload) => {
      if (
        data.userId &&
        currentUserId &&
        String(data.userId) !== String(currentUserId)
      ) {
        return;
      }
      const callIdStr = data?.callId != null ? String(data.callId) : "";
      const pendingInv = pendingIncomingInviteRef.current;
      if (pendingInv && callIdStr && callIdStr === pendingInv.callId) {
        const st0 = String(data?.callStatus || "").toLowerCase();
        if (isRemoteCallTerminalStatus(st0)) {
          pendingIncomingInviteRef.current = null;
          setPendingIncomingInvite(null);
          incomingCallRingRef.current?.stop();
          incomingCallRingRef.current?.dispose();
          incomingCallRingRef.current = null;
        }
      }

      const currentId = activeCallIdRef.current;
      if (!currentId || callIdStr !== String(currentId)) return;
      const st = String(data?.callStatus || "").toLowerCase();
      if (isRemoteCallTerminalStatus(st)) {
        toast({
          title: "Call ended",
          description: `Status: ${data.callStatus ?? "unknown"}`,
          variant: st === "missed" ? "default" : "destructive",
        });
        cleanupOutboundCallResources();
      }
    };

    const handleCallSdpAnswer = async (data: Record<string, unknown>) => {
      if (
        data.userId &&
        currentUserId &&
        String(data.userId) !== String(currentUserId)
      ) {
        return;
      }
      try {
        const convId =
          data?.conversationId != null ? String(data.conversationId) : "";
        if (!convId) return;
        const pending = pendingOutboundCallRef.current;
        const selectedId = selectedConversationRef.current?._id;
        const matches =
          pending?.conversationId === convId ||
          (selectedId != null && String(selectedId) === convId);
        if (!matches) return;

        const pc = peerRef.current;
        const rawSdp = data?.sdp;
        if (!pc || typeof rawSdp !== "string" || !rawSdp.trim()) return;

        const browserSdp = sanitizeMetaAnswerSdpForBrowser(rawSdp);
        const sdpHash = simpleHashUtf8(browserSdp);
        if (sdpAnswerAppliedHashRef.current === sdpHash) {
          return;
        }

        await pc.setRemoteDescription({ type: "answer", sdp: browserSdp });
        sdpAnswerAppliedHashRef.current = sdpHash;
        setLastAnswerSdpPreview(browserSdp.slice(0, 1600));
        logWebRtcMediaDiagnostics(pc, "post-setRemoteDescription-answer");

        if (signalingAnswerTimerRef.current) {
          clearTimeout(signalingAnswerTimerRef.current);
          signalingAnswerTimerRef.current = null;
        }

        setOutboundCallUi((prev) => {
          if (!prev) return prev;
          if (prev.phase === "connecting")
            return { ...prev, phase: "ringing", signalingState: pc.signalingState };
          return { ...prev, signalingState: pc.signalingState };
        });

        try {
          if (
            typeof navigator !== "undefined" &&
            typeof navigator.vibrate === "function"
          ) {
            navigator.vibrate([120, 80, 120]);
          }
        } catch {
          /* ignore */
        }

        const el = remoteAudioRef.current;
        if (el) {
          const audioTracks = pc
            .getReceivers()
            .map((r) => r.track)
            .filter((t): t is MediaStreamTrack => t != null && t.kind === "audio");
          if (audioTracks.length > 0 && el.srcObject == null) {
            el.srcObject = new MediaStream(audioTracks);
            void el.play().catch((err) => {
              console.warn("[call] receiver fallback play() failed:", err);
              setRemoteAudioPlayBlocked(true);
            });
            callSoundRef.current?.stopRing();
            void callSoundRef.current?.playConnectChime();
            setOutboundCallUi((prev) =>
              prev ? { ...prev, phase: "connected" } : prev,
            );
          }
        }

        const cid = data?.callId;
        if (typeof cid === "string" && cid.trim()) {
          setActiveCallId(cid.trim());
        }
      } catch (err) {
        console.error("Failed to apply SDP answer:", err);
        cleanupOutboundCallResources();
        toast({
          title: "Call signaling failed",
          description: "Could not apply SDP answer.",
          variant: "destructive",
        });
      }
    };

    const handleHistorySync = (data: WhatsAppHistorySyncPayload) => {
      console.log("History sync:", data);
      if (data.status === "completed") {
        toast({
          title: "📜 History Sync Complete",
          description: `${data.messagesCount} messages synced`,
        });
        // Refresh conversations after history sync
        void refetchConversationsListRef.current();
      }
    };

    const handleAppStateSync = (data: unknown) => {
      console.log("App state sync:", data);
    };

    const handleConversationRead = (data: WhatsAppConversationReadPayload) => {
      const { conversationId, userId } = data;
      const currentConversation = selectedConversationRef.current;

      const readCurrentUserId = getTokenUserId(token);

      // Only refetch readers when someone else read the open chat (not our own mark-read).
      if (
        currentConversation?._id === conversationId &&
        readCurrentUserId &&
        String(userId) !== String(readCurrentUserId)
      ) {
        threadActionsRef.current.bumpReadersRefreshToken();
      }

      // If this read event is for the current logged-in user, clear unread
      // state for that conversation across all tabs/devices (both main and archived).
      if (readCurrentUserId && String(userId) === String(readCurrentUserId)) {
        const filters = conversationsFiltersRef.current;
        const isUnreadList = filters.labelFilter === "unread";

        patchConversationsList((prev) => {
          const conv = prev.find(
            (c) => String(c._id) === String(conversationId),
          );
          const hadUnread = (conv?.unreadCount || 0) > 0;

          if (hadUnread) {
            syncWhatsAppInboxUnreadCountAcrossFilters(
              queryClient,
              filters,
              -1,
            );
          }

          if (isUnreadList) {
            return prev.filter(
              (c) => String(c._id) !== String(conversationId),
            );
          }

          return patchConversationInList(prev, conversationId, {
            unreadCount: 0,
          });
        });

        // Also clear unread count for archived conversations
        patchArchivedConversations((prev) => {
          const conv = prev.find((c) => c._id === conversationId);
          if (conv && (conv.unreadCount || 0) > 0) {
            adjustArchivedUnreadCount(-1);
          }
          return prev.map((c) =>
            c._id === conversationId ? { ...c, unreadCount: 0 } : c,
          );
        });
      }
    };

    const scheduleConversationListRefetch = () => {
      if (convUpdateTimerRef.current) {
        clearTimeout(convUpdateTimerRef.current);
      }
      convUpdateTimerRef.current = setTimeout(() => {
        void invalidateWhatsAppConversationsList(queryClient);
      }, 300);
    };

    const applyConversationPatch = (
      conversationId: string,
      patch: Partial<Conversation>,
    ) => {
      const matches = (conv: Conversation) =>
        String(conv._id) === String(conversationId);
      patchConversationsList((prev) =>
        mapConversationsInList(prev, (conv) =>
          matches(conv) ? { ...conv, ...patch } : conv,
        ),
      );
      patchArchivedConversations((prev) =>
        prev.map((conv) => (matches(conv) ? { ...conv, ...patch } : conv)),
      );
      setSelectedConversation((prev) =>
        prev && matches(prev) ? { ...prev, ...patch } : prev,
      );
    };

    const handleConversationUpdate = (
      data: WhatsAppConversationUpdatePayload,
    ) => {
      const conversationId = data.conversationId;
      if (!conversationId) {
        scheduleConversationListRefetch();
        return;
      }

      const updateType =
        data.type ?? inferWhatsAppConversationUpdateType(data);

      switch (updateType) {
        case "archive": {
          if (typeof data.isArchived !== "boolean") {
            scheduleConversationListRefetch();
            return;
          }

          if (data.isArchived) {
            archivedConversationIdsRef.current.add(String(conversationId));
            patchConversationsList((prev) =>
              prev.filter(
                (conv) => String(conv._id) !== String(conversationId),
              ),
            );
            syncArchivedStorage([...archivedConversationIdsRef.current]);
            void fetchArchivedConversationsRef.current({ silent: true });

            if (selectedConversationRef.current?._id === conversationId) {
              threadActionsRef.current.setSelectedConversation(null);
              clearWhatsAppMessagesCache(queryClient, conversationId);
            }
          } else {
            archivedConversationIdsRef.current.delete(String(conversationId));
            syncArchivedStorage([...archivedConversationIdsRef.current]);
            void fetchArchivedConversationsRef.current({ silent: true });
            scheduleConversationListRefetch();
          }
          break;
        }

        case "meta": {
          const metaPatch = extractMetaConversationPatch(data);
          if (Object.keys(metaPatch).length === 0) {
            scheduleConversationListRefetch();
            return;
          }
          applyConversationPatch(
            conversationId,
            metaPatch as Partial<Conversation>,
          );
          break;
        }

        case "label": {
          if (!Array.isArray(data.labels)) {
            return;
          }
          applyConversationPatch(conversationId, { labels: data.labels });
          break;
        }

        case "transfer": {
          scheduleConversationListRefetch();
          break;
        }

        case "lead": {
          // Lead CRM flags — no inbox row shape change required.
          break;
        }

        default:
          scheduleConversationListRefetch();
      }
    };

    socket.on("whatsapp-new-conversation", handleNewConversation);
    socket.on("whatsapp-message-status", handleMessageStatus);
    socket.on("whatsapp-message-echo", handleMessageEcho);
    socket.on("whatsapp-incoming-call", handleIncomingCall);
    socket.on("whatsapp-call-incoming-offer", handleCallIncomingOffer);
    socket.on("whatsapp-call-missed", handleCallMissed);
    socket.on("whatsapp-call-status", handleCallStatus);
    socket.on("whatsapp-call-sdp-answer", handleCallSdpAnswer);
    socket.on("whatsapp-history-sync", handleHistorySync);
    socket.on("whatsapp-app-state-sync", handleAppStateSync);
    socket.on("whatsapp-conversation-read", handleConversationRead);
    socket.on("whatsapp-conversation-update", handleConversationUpdate);

    return () => {
      if (convUpdateTimerRef.current) {
        clearTimeout(convUpdateTimerRef.current);
      }
      socket.off("whatsapp-new-message", handleWhatsAppMessage);
      socket.off("whatsapp-new-conversation", handleNewConversation);
      socket.off("whatsapp-message-status", handleMessageStatus);
      socket.off("whatsapp-message-echo", handleMessageEcho);
      socket.off("whatsapp-incoming-call", handleIncomingCall);
      socket.off("whatsapp-call-incoming-offer", handleCallIncomingOffer);
      socket.off("whatsapp-call-missed", handleCallMissed);
      socket.off("whatsapp-call-status", handleCallStatus);
      socket.off("whatsapp-call-sdp-answer", handleCallSdpAnswer);
      socket.off("whatsapp-history-sync", handleHistorySync);
      socket.off("whatsapp-app-state-sync", handleAppStateSync);
      socket.off("whatsapp-conversation-read", handleConversationRead);
      socket.off("whatsapp-conversation-update", handleConversationUpdate);
    };
  }, [
    socket,
    token,
    toast,
    playNotificationSound,
    cleanupOutboundCallResources,
    syncArchivedStorage,
    handleWhatsAppMessage,
    handleNewConversation,
    handleMessageStatus,
    handleMessageEcho,
    queryClient,
    allowedPhoneIdsRef,
    selectedPhoneIdRef,
    pendingIncomingInviteRef,
    incomingCallRingRef,
    activeCallIdRef,
    peerRef,
    sdpAnswerAppliedHashRef,
    signalingAnswerTimerRef,
    remoteAudioRef,
    callSoundRef,
    pendingOutboundCallRef,
    selectedConversationRef,
    refetchConversationsListRef,
    archivedConversationIdsRef,
    threadActionsRef,
    convUpdateTimerRef,
    fetchArchivedConversationsRef,
    conversationsFiltersRef,
    patchConversationsList,
    patchArchivedConversations,
    adjustArchivedUnreadCount,
    setSelectedConversation,
    setPendingIncomingInvite,
    setOutboundCallUi,
    setActiveCallId,
    setRemoteAudioPlayBlocked,
    setLastAnswerSdpPreview,
  ]);
}
