"use client";
import { useState, useEffect, useRef, useCallback, useMemo, startTransition, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/AuthStore";
import { useSocket } from "@/hooks/useSocket";
import axios from "@/util/axios";
// Card components no longer needed for WhatsApp Web-style layout
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, ArrowLeft } from "lucide-react";
import type { Message, Conversation, Template } from "./types";
import { useMobileView, type MobileView } from "./hooks/useMobileView";
import {
  repositionConversationAfterUpdate,
  insertConversationAtCorrectPosition,
  patchConversationInList,
  buildMessagesQueryKey,
} from "./lib/whatsappQueryCache";
import { buildWhatsAppInboxUrl } from "./lib/whatsappInboxUrl";
import { cn } from "@/lib/utils";
import {
  buildTemplateComponents,
  isMessageWindowActive,
  getTemplatePreviewText,
  getConversationTemplateContext,
  getConversationBusinessPhoneId,
  resolveTemplatesCacheKey,
} from "./utils";
import {
  isWhatsAppAccessRole,
} from "@/lib/whatsapp/config";
import { ConversationSidebarContainer, type ConversationSidebarContainerProps } from "./containers/ConversationSidebarContainer";
import { MessageThreadContainer, type MessageThreadContainerProps, type SendActions } from "./containers/MessageThreadContainer";
import { getWhatsAppNotificationController } from "@/lib/notifications/whatsappNotificationController";
import { collectMetaGraphErrorText } from "@/lib/whatsapp/metaGraphError";
import {
  shouldMaskConversationPhone,
  type WhatsAppPhoneMaskRules,
} from "@/lib/whatsapp/phoneMask";
import {
  restrictPeerConnectionAudioToOpus,
  buildCleanWhatsAppOfferDetailed,
  validateWhatsAppCallingSdp,
  sanitizeMetaAnswerSdpForBrowser,
  sanitizeMetaOfferSdpForBrowser,
  formatNoUsableMetaCandidatesMessage,
  summarizeMetaCandidates,
} from "@/lib/whatsapp/callingSdp";
import {
  OutboundCallSoundController,
  IncomingCallRingController,
  getOutboundCallAudioConstraints,
  WA_CALL_SIGNALING_ANSWER_TIMEOUT_MS,
  WA_CALL_ICE_DISCONNECTED_GRACE_MS,
  type OutboundCallUiState,
  type SilentOutboundAudioHandle,
  attachSilentOutboundAudioTrack,
  logWebRtcMediaDiagnostics,
  collectOutboundRtpAudioSummary,
  CLIENT_FALLBACK_ICE_SERVERS,
  createWhatsAppCallPeerConnection,
  awaitIceGatheringForMeta,
  getIceGatheredCandidates,
  type IceGatheredCandidate,
} from "@/lib/whatsapp/calling";
import {
  requestDesktopNotificationPermission,
  getDesktopNotificationPermission,
  isDesktopNotificationSupported,
} from "@/lib/whatsapp/browserDesktopNotify";
import { usePeerConnectionStats } from "./hooks/usePeerConnectionStats";
import { WhatsAppProviders } from "./context/WhatsAppProviders";
import {
  useConversationListState,
  useConversationListActionsRef,
} from "./context/ConversationListContext";
import {
  useActiveThreadState,
  useActiveThreadActionsRef,
} from "./context/ActiveThreadContext";
import { useWhatsAppUIState } from "./context/WhatsAppUIContext";
import { useSocketHandlers } from "./modules/useSocketHandlers";
import {
  addToLRUSet,
  simpleHashUtf8,
  type PendingIncomingCallInvite,
} from "./modules/socketUtils";

const WhatsAppCallOverlay = dynamic(
  () =>
    import("./components/calling/WhatsAppCallOverlay").then((m) => ({
      default: m.WhatsAppCallOverlay,
    })),
  { ssr: false, loading: () => null },
);

const ForwardDialog = dynamic(
  () => import("./components/ForwardDialog").then((m) => ({ default: m.ForwardDialog })),
  { ssr: false, loading: () => null },
);

const LeadTransferDialog = dynamic(
  () =>
    import("./components/LeadTransferDialog").then((m) => ({
      default: m.LeadTransferDialog,
    })),
  { ssr: false, loading: () => null },
);

const AddGuestModal = dynamic(
  () => import("./components/AddGuestModal").then((m) => ({ default: m.AddGuestModal })),
  { ssr: false, loading: () => null },
);


/**
 * `/api/whatsapp/call` returns Zod `issues`, or `{ error, data }` (Meta body in `data`).
 * Axios only logs "400"; the real reason is in `response.data` ? use this for toasts.
 */
function formatWhatsAppCallApiError(error: unknown): string {
  if (typeof error !== "object" || error === null) return String(error);
  const ax = error as {
    response?: { data?: Record<string, unknown>; status?: number };
    message?: string;
  };
  const body = ax.response?.data;
  if (body && typeof body === "object") {
    if (Array.isArray(body.issues)) {
      const zod = body.issues
        .map((i: unknown) => (typeof i === "object" && i !== null ? JSON.stringify(i) : String(i)))
        .join("; ");
      if (zod) return `Invalid request: ${zod}`;
    }

    if (typeof body.error === "string" && body.error.trim()) return body.error.trim();

    const fromGraph = collectMetaGraphErrorText(body.data);
    if (fromGraph) return fromGraph;
  }
  return ax.message || "Request failed";
}

type IceServersFetchResult = {
  servers: RTCIceServer[];
  relayConfigured: boolean;
};

const ICE_GATHER_TIMEOUT_MS = 20_000;

/** Cache so we don't re-fetch on every single call attempt within a session. */
let _iceServerCache: IceServersFetchResult | null = null;
let _iceServerCacheTs = 0;
const ICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchIceServers(): Promise<IceServersFetchResult> {
  const now = Date.now();
  if (_iceServerCache && now - _iceServerCacheTs < ICE_CACHE_TTL_MS) {
    return _iceServerCache;
  }
  try {
    const res = await fetch("/api/whatsapp/ice-servers");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      servers?: RTCIceServer[];
      relayConfigured?: boolean;
      iceConfig?: {
        source?: string;
        turnServerCount?: number;
        credentialPresent?: boolean;
        totalServers?: number;
      };
    };
    if (Array.isArray(json.servers) && json.servers.length > 0) {
      _iceServerCache = {
        servers: json.servers,
        relayConfigured: Boolean(json.relayConfigured),
      };
      _iceServerCacheTs = now;
      console.log("[ice] loaded from GET /api/whatsapp/ice-servers", {
        relayConfigured: _iceServerCache.relayConfigured,
        serverCount: json.servers.length,
        iceConfig: json.iceConfig,
        turnUrls: json.servers.map((s) => s.urls),
        hasTurnUsername: json.servers.some((s) => Boolean(s.username)),
      });
      return _iceServerCache;
    }
  } catch (err) {
    console.warn("[ice] failed to fetch ICE servers from API, using fallback:", err);
  }
  return { servers: CLIENT_FALLBACK_ICE_SERVERS, relayConfigured: false };
}

function snapshotIceGathered(pc: RTCPeerConnection): IceGatheredCandidate[] {
  return getIceGatheredCandidates(pc);
}

/**
 * Wait until ICE gathering finishes **or** the timeout elapses, then resolve.
 *
 * We intentionally RESOLVE (never reject) on timeout so callers can proceed
 * with whatever candidates Chrome gathered so far.  Rejecting here would kill
 * the call even when Chrome already has a usable srflx candidate but the
 * `iceGatheringState === "complete"` event arrived slightly after our cutoff.
 *
 * Listens to both:
 *   - `icegatheringstatechange` ? "complete"  (standard)
 *   - `icecandidate` ? null candidate          (Chrome trickle-ICE end signal)
 */
function awaitIceGatheringOrTimeout(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }

    let done = false;
    const finish = (reason: string) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onStateChange);
      pc.removeEventListener("icecandidate", onCandidate);
      console.log(`[ice] gathering finished (${reason}), state=${pc.iceGatheringState}`);
      resolve();
    };

    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") finish("state-complete");
    };

    const onCandidate = (ev: RTCPeerConnectionIceEvent) => {
      // Chrome signals end-of-candidates with a null candidate (trickle ICE).
      if (ev.candidate === null) finish("null-candidate");
    };

    const timer = window.setTimeout(() => {
      const count = (pc.localDescription?.sdp?.match(/^a=candidate:/gm) ?? []).length;
      console.warn(`[ice] gathering timeout after ${timeoutMs}ms; ${count} raw candidate(s) in SDP so far ? continuing anyway`);
      finish("timeout");
    }, timeoutMs);

    pc.addEventListener("icegatheringstatechange", onStateChange);
    pc.addEventListener("icecandidate", onCandidate);
  });
}

/**
 * Prefer real mic for two-way audio. If no mic or permission denied, attach a **near-silent**
 * generated track so Opus still emits RTP toward Meta (avoids ~20s media-timeout drops).
 */
async function attachLocalAudioOrRecvOnly(
  pc: RTCPeerConnection,
  streamHolder: { current: MediaStream | null },
): Promise<{ usedMic: boolean; silentHandle: SilentOutboundAudioHandle | null }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: getOutboundCallAudioConstraints(),
      video: false,
    });
    streamHolder.current = stream;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    return { usedMic: true, silentHandle: null };
  } catch (err: unknown) {
    const dom = err instanceof DOMException ? err : null;
    const name = dom?.name || "";
    const msg = err instanceof Error ? err.message : "";
    const noDevice =
      name === "NotFoundError" ||
      name === "DevicesNotFoundError" ||
      /requested device not found/i.test(msg);
    const denied = name === "NotAllowedError" || name === "PermissionDeniedError";

    if (noDevice || denied) {
      const silentHandle = attachSilentOutboundAudioTrack(pc);
      streamHolder.current = silentHandle.stream;
      return { usedMic: false, silentHandle };
    }
    throw err;
  }
}

export default function WhatsAppChat() {
  return (
    <WhatsAppProviders>
      <WhatsAppChatInner />
    </WhatsAppProviders>
  );
}

function WhatsAppChatInner() {
  const { token } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // Stable ref that MessageThreadContainer calls to reach shell's send handlers.
  // Updated every render (after all handlers are defined) so closures are always fresh.
  const sendActionsRef = useRef<SendActions>({
    sendMessage: async () => {},
    sendTemplateMessage: async () => {},
    handleFileUpload: async () => {},
    handleSendMediaWithCaptions: async () => {},
  });
  const messagesFetchGenRef = useRef(0);
  const lastSoundPlayedRef = useRef<number>(0);
  const handleWhatsAppMessageRef = useRef<((data: unknown) => void) | null>(null);
  const [clientMounted, setClientMounted] = useState(false);

  useEffect(() => {
    setClientMounted(true);
  }, []);

  const playNotificationSound = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundPlayedRef.current < 1000) return;
    lastSoundPlayedRef.current = now;
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);
  
  // Mobile-first responsive view management
  const {
    mobileView,
    setMobileView,
    isMobile,
    isTablet,
    isDesktop,
    navigateToChat,
    navigateToConversations,
    handleBack,
    viewport,
    safeAreaInsets,
  } = useMobileView();

  const listActionsRef = useConversationListActionsRef();
  const threadActionsRef = useActiveThreadActionsRef();

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
    archivedUnreadCount,
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
  } = useActiveThreadState();

  const {
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
  } = useWhatsAppUIState();

  const conversationsFiltersRef = listActionsRef.current.conversationsFiltersRef;
  const refetchConversationsListRef = listActionsRef.current.refetchConversationsListRef;
  const archivedConversationIdsRef = listActionsRef.current.archivedConversationIdsRef;
  const selectedConversationRef = threadActionsRef.current.selectedConversationRef;
  const markConversationAsReadRef = threadActionsRef.current.markConversationAsReadRef;

  const patchConversationsList = useCallback(
    (mutator: (list: Conversation[]) => Conversation[]) => {
      listActionsRef.current.patchConversationsList(mutator);
    },
    [listActionsRef],
  );

  const mutateActiveMessages = useCallback(
    (mutator: (messages: Message[]) => Message[]) => {
      threadActionsRef.current.mutateActiveMessages(mutator);
    },
    [threadActionsRef],
  );

  const refetchConversationsList = useCallback(
    () => listActionsRef.current.refetchConversationsList(),
    [listActionsRef],
  );

  const fetchNextConversationsPage = useCallback(() => {
    listActionsRef.current.fetchNextConversationsPage();
  }, [listActionsRef]);

  const maskConversationForViewer = useCallback(
    (conv: Conversation) => listActionsRef.current.maskConversationForViewer(conv),
    [listActionsRef],
  );

  const maskConversationListForViewer = useCallback(
    (list: Conversation[]) => listActionsRef.current.maskConversationListForViewer(list),
    [listActionsRef],
  );

  const syncArchivedStorage = useCallback(
    (ids: string[]) => listActionsRef.current.syncArchivedStorage(ids),
    [listActionsRef],
  );

  const handleUpdateConversation = useCallback(
    (conversationId: string, patch: Partial<Conversation>) => {
      threadActionsRef.current.handleUpdateConversation(conversationId, patch);
    },
    [threadActionsRef],
  );

  const handleCrmLabelsUpdated = useCallback(
    (labels: string[]) => threadActionsRef.current.handleCrmLabelsUpdated(labels),
    [threadActionsRef],
  );

  const selectConversation = useCallback(
    (conversation: Conversation | null) => {
      threadActionsRef.current.selectConversation(conversation);
    },
    [threadActionsRef],
  );

  const loadOlderMessages = useCallback(() => {
    threadActionsRef.current.loadOlderMessages();
  }, [threadActionsRef]);

  const markConversationAsRead = useCallback(
    (conversationId: string, opts?: { lastMessageId?: string }) =>
      threadActionsRef.current.markConversationAsRead(conversationId, opts),
    [threadActionsRef],
  );

  const archiveConversation = useCallback(
    (conversationId: string) => listActionsRef.current.archiveConversation(conversationId),
    [listActionsRef],
  );

  const unarchiveConversation = useCallback(
    (conversationId: string) => listActionsRef.current.unarchiveConversation(conversationId),
    [listActionsRef],
  );

  const toggleArchiveView = useCallback(() => {
    listActionsRef.current.toggleArchiveView();
  }, [listActionsRef]);

  const fetchArchivedConversations = useCallback(
    (opts?: { silent?: boolean; loadMore?: boolean }) =>
      listActionsRef.current.fetchArchivedConversations(opts),
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

  const setAdminQueue = useCallback(
    (value: boolean) => listActionsRef.current.setAdminQueue(value),
    [listActionsRef],
  );

  const patchArchivedConversations = useCallback(
    (mutator: (list: Conversation[]) => Conversation[]) => {
      listActionsRef.current.patchArchivedConversations(mutator);
    },
    [listActionsRef],
  );

  const adjustArchivedUnreadCount = useCallback(
    (delta: number) => listActionsRef.current.adjustArchivedUnreadCount(delta),
    [listActionsRef],
  );

  const setSelectedConversation = useCallback(
    (value: SetStateAction<Conversation | null>) => {
      threadActionsRef.current.setSelectedConversation(value);
    },
    [threadActionsRef],
  );

  const templatesCacheKey = useMemo(
    () => resolveTemplatesCacheKey(selectedConversation, allowedPhoneConfigs),
    [selectedConversation, allowedPhoneConfigs],
  );

  const phoneMaskRulesRef = useRef(phoneMaskRules);
  const viewerRoleRef = useRef(token?.role || "");

  useEffect(() => {
    phoneMaskRulesRef.current = phoneMaskRules;
  }, [phoneMaskRules]);

  useEffect(() => {
    viewerRoleRef.current = token?.role || "";
  }, [token?.role]);

  const isInitialLoadRef = useRef(true);

  // Call state
  const [callingAudio, setCallingAudio] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeCallIdRef.current = activeCallId;
  }, [activeCallId]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localCallStreamRef = useRef<MediaStream | null>(null);
  const [callPermissions, setCallPermissions] = useState({
    canMakeCalls: false,
  });
  const [callPermsFetched, setCallPermsFetched] = useState(false);
  const callPermissionsRef = useRef(callPermissions);
  const callPermsFetchInFlightRef = useRef(false);
  const [outboundCallUi, setOutboundCallUi] = useState<OutboundCallUiState | null>(null);
  const [pendingIncomingInvite, setPendingIncomingInvite] = useState<PendingIncomingCallInvite | null>(null);
  const pendingIncomingInviteRef = useRef<PendingIncomingCallInvite | null>(null);
  const [answeringIncoming, setAnsweringIncoming] = useState(false);
  const [remoteAudioPlayBlocked, setRemoteAudioPlayBlocked] = useState(false);
  const [callDiagnosticsOpen, setCallDiagnosticsOpen] = useState(false);
  const [peerForStats, setPeerForStats] = useState<RTCPeerConnection | null>(null);
  const [lastIceDiagnostics, setLastIceDiagnostics] = useState<{
    kept: string[];
    dropped: { line: string; reason: string }[];
    metaOfferPreview: string;
    relayConfigured: boolean;
    gathered: IceGatheredCandidate[];
  } | null>(null);
  const relayConfiguredRef = useRef(false);
  const [lastAnswerSdpPreview, setLastAnswerSdpPreview] = useState<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  /** Single MediaStream for all remote audio tracks ? avoids replace races / duplicate playback. */
  const remotePlaybackStreamRef = useRef<MediaStream | null>(null);
  const pendingOutboundCallRef = useRef<{ conversationId: string } | null>(null);
  const callSoundRef = useRef<OutboundCallSoundController | null>(null);
  const incomingCallRingRef = useRef<IncomingCallRingController | null>(null);
  const signalingAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceDisconnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sdpAnswerAppliedHashRef = useRef<string | null>(null);
  const reconnectIceAttemptedRef = useRef(false);
  const statsSnapshotRef = useRef<Record<string, unknown> | undefined>(undefined);
  const silentOutboundAudioRef = useRef<SilentOutboundAudioHandle | null>(null);
  const callSessionMetaRef = useRef<{
    startedAtMs: number;
    conversationId: string;
    phoneNumberId: string;
    summaryVariant?: "outbound" | "inbound";
  } | null>(null);
  const mediaStallWarnedRef = useRef(false);
  const hangUpInProgressRef = useRef(false);
  /**
   * Inbound answer: ICE can briefly hit failed/closed before Meta receives our `accept` SDP.
   * {@link attachOutboundCallMediaHandlers} must not tear down the PC during that window.
   */
  const suppressPrematureInboundIceCleanupRef = useRef(false);

  const selectedPhoneIdRef = useRef<string | null>(null);
  selectedPhoneIdRef.current = getConversationBusinessPhoneId(selectedConversation) ?? null;
  const allowedPhoneIdsRef = useRef<string[]>([]);
  const allowedChannelIdsRef = useRef<string[]>([]);

  useEffect(() => {
    allowedPhoneIdsRef.current = allowedPhoneConfigs
      .filter((c) => c.phoneNumberId && !c.isInternal)
      .map((c) => c.phoneNumberId);

    allowedChannelIdsRef.current = allowedPhoneConfigs
      .filter((c) => c.channelId && !c.isInternal)
      .map((c) => c.channelId as string);
  }, [allowedPhoneConfigs]);

  const convUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchArchivedConversationsRef = useRef<
    (opts?: { silent?: boolean; loadMore?: boolean }) => Promise<void>
  >(async () => {});
  fetchArchivedConversationsRef.current = fetchArchivedConversations;

  const handleConversationTypeChange = useCallback(
    async (conversationId: string, conversationType: "owner" | "guest") => {
      try {
        const response = await axios.post(
          `/api/whatsapp/conversations/${conversationId}/meta`,
          { conversationType },
        );
        const patch: Partial<Conversation> = { conversationType };
        const updated = response.data?.updated as Record<string, string> | undefined;
        if (updated?.businessPhoneId) {
          patch.businessPhoneId = updated.businessPhoneId;
        }
        if (updated?.whatsappChannelId) {
          (patch as { whatsappChannelId?: string }).whatsappChannelId =
            updated.whatsappChannelId;
        }
        if (updated?.channelType === "guest" || updated?.channelType === "owner") {
          (patch as { channelType?: "guest" | "owner" }).channelType =
            updated.channelType;
        }
        handleUpdateConversation(conversationId, patch);
        toast({
          title: "Conversation updated",
          description: `Marked as ${conversationType}.`,
        });
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

  const cleanupOutboundCallResources = useCallback(() => {
    suppressPrematureInboundIceCleanupRef.current = false;
    if (signalingAnswerTimerRef.current) {
      clearTimeout(signalingAnswerTimerRef.current);
      signalingAnswerTimerRef.current = null;
    }
    if (iceDisconnectedTimerRef.current) {
      clearTimeout(iceDisconnectedTimerRef.current);
      iceDisconnectedTimerRef.current = null;
    }
    callSoundRef.current?.stopRing();
    callSoundRef.current?.dispose();
    callSoundRef.current = null;
    incomingCallRingRef.current?.stop();
    incomingCallRingRef.current?.dispose();
    incomingCallRingRef.current = null;

    const pc = peerRef.current;
    peerRef.current = null;
    localCallStreamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    localCallStreamRef.current = null;
    if (pc) {
      for (const s of pc.getSenders()) {
        try {
          s.track?.stop();
        } catch {
          /* ignore */
        }
      }
      pc.close();
    }
    setPeerForStats(null);
    const el = remoteAudioRef.current;
    if (el) {
      el.srcObject = null;
      el.volume = 1;
    }
    pendingOutboundCallRef.current = null;
    sdpAnswerAppliedHashRef.current = null;
    reconnectIceAttemptedRef.current = false;
    silentOutboundAudioRef.current?.stop();
    silentOutboundAudioRef.current = null;
    remotePlaybackStreamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    remotePlaybackStreamRef.current = null;
    callSessionMetaRef.current = null;
    mediaStallWarnedRef.current = false;
    setActiveCallId(null);
    setOutboundCallUi(null);
    setRemoteAudioPlayBlocked(false);
    setCallDiagnosticsOpen(false);
    setLastIceDiagnostics(null);
    setLastAnswerSdpPreview(null);
  }, []);

  const attachOutboundCallMediaHandlers = useCallback(
    (pc: RTCPeerConnection) => {
      const syncConn = () => {
        if (peerRef.current !== pc) return;
        setOutboundCallUi((prev) =>
          prev
            ? {
                ...prev,
                connectionState: pc.connectionState,
                iceState: pc.iceConnectionState,
                signalingState: pc.signalingState,
              }
            : prev,
        );
      };

      pc.ontrack = (ev: RTCTrackEvent) => {
        if (peerRef.current !== pc) return;
        if (ev.track.kind !== "audio") {
          try {
            ev.track.stop();
          } catch {
            /* ignore */
          }
          return;
        }

        const el = remoteAudioRef.current;
        if (!el) return;

        let ms = remotePlaybackStreamRef.current;
        if (!ms) {
          ms = new MediaStream();
          remotePlaybackStreamRef.current = ms;
        }
        if (!ms.getTracks().some((t) => t.id === ev.track.id)) {
          ms.addTrack(ev.track);
        }
        el.srcObject = ms;
        el.muted = false;
        void el.play().catch((err) => {
          console.warn("[call] remote audio play() failed:", err);
          setRemoteAudioPlayBlocked(true);
        });
        callSoundRef.current?.stopRing();
        void callSoundRef.current?.playConnectChime();
        setOutboundCallUi((prev) => (prev ? { ...prev, phase: "connected" } : prev));
      };

      pc.onconnectionstatechange = () => {
        if (peerRef.current !== pc) return;
        console.log("[PC STATE]", pc.connectionState, {
          iceConnectionState: pc.iceConnectionState,
          signalingState: pc.signalingState,
          iceGatheringState: pc.iceGatheringState,
          suppress: suppressPrematureInboundIceCleanupRef.current,
        });
        syncConn();
        const st = pc.connectionState;
        if (st === "closed") {
          if (!suppressPrematureInboundIceCleanupRef.current) {
            cleanupOutboundCallResources();
          } else {
            console.warn("[call] PC closed during inbound ICE gather ? suppress is ON, skipping cleanup");
          }
          return;
        }
        if (st === "failed") {
          setOutboundCallUi((prev) => (prev ? { ...prev, phase: "failed" } : prev));
          if (suppressPrematureInboundIceCleanupRef.current) {
            console.warn(
              "[call] connectionState failed during inbound answer prep ? waiting for Meta accept; not closing PC yet",
            );
            return;
          }
          cleanupOutboundCallResources();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (peerRef.current !== pc) return;
        console.log("[ICE STATE]", pc.iceConnectionState, {
          connectionState: pc.connectionState,
          signalingState: pc.signalingState,
          suppress: suppressPrematureInboundIceCleanupRef.current,
        });
        syncConn();
        const ice = pc.iceConnectionState;
        if (ice === "disconnected") {
          setOutboundCallUi((prev) => (prev ? { ...prev, phase: "reconnecting" } : prev));
          if (iceDisconnectedTimerRef.current) clearTimeout(iceDisconnectedTimerRef.current);
          iceDisconnectedTimerRef.current = setTimeout(() => {
            if (peerRef.current !== pc) return;
            const s = pc.iceConnectionState;
            if (s === "connected" || s === "completed") return;
            try {
              if (!reconnectIceAttemptedRef.current) {
                pc.restartIce();
                reconnectIceAttemptedRef.current = true;
              }
            } catch {
              /* ignore */
            }
          }, WA_CALL_ICE_DISCONNECTED_GRACE_MS);
        } else if (ice === "connected" || ice === "completed") {
          if (iceDisconnectedTimerRef.current) {
            clearTimeout(iceDisconnectedTimerRef.current);
            iceDisconnectedTimerRef.current = null;
          }
          reconnectIceAttemptedRef.current = false;
          setOutboundCallUi((prev) => {
            if (!prev) return prev;
            if (prev.phase === "reconnecting") return { ...prev, phase: "connected" };
            return prev;
          });
        } else if (ice === "failed") {
          setOutboundCallUi((prev) => (prev ? { ...prev, phase: "failed" } : prev));
          if (suppressPrematureInboundIceCleanupRef.current) {
            console.warn(
              "[call] ICE failed during inbound answer prep ? waiting for Meta accept; not closing PC yet",
            );
            return;
          }
          cleanupOutboundCallResources();
        }
      };
    },
    [cleanupOutboundCallResources],
  );

  const rejectPendingIncomingForNewOutbound = useCallback(() => {
    const inv = pendingIncomingInviteRef.current;
    if (!inv) return;
    pendingIncomingInviteRef.current = null;
    setPendingIncomingInvite(null);
    incomingCallRingRef.current?.stop();
    incomingCallRingRef.current?.dispose();
    incomingCallRingRef.current = null;
    void axios
      .post("/api/whatsapp/call", {
        action: "reject_incoming_call",
        callId: inv.callId,
        phoneNumberId: inv.phoneNumberId,
        ...(inv.conversationId.trim() ? { conversationId: inv.conversationId.trim() } : {}),
      })
      .catch(() => {});
  }, []);

  const handleDeclineIncomingCall = useCallback(() => {
    const inv = pendingIncomingInviteRef.current;
    if (!inv) return;
    pendingIncomingInviteRef.current = null;
    setPendingIncomingInvite(null);
    incomingCallRingRef.current?.stop();
    incomingCallRingRef.current?.dispose();
    incomingCallRingRef.current = null;
    void axios
      .post("/api/whatsapp/call", {
        action: "reject_incoming_call",
        callId: inv.callId,
        phoneNumberId: inv.phoneNumberId,
        ...(inv.conversationId.trim() ? { conversationId: inv.conversationId.trim() } : {}),
      })
      .catch((e: unknown) => {
        toast({
          title: "Could not decline call",
          description: formatWhatsAppCallApiError(e),
          variant: "destructive",
        });
      });
  }, [toast]);

  const handleAnswerIncomingWhatsAppCall = useCallback(async () => {
    const inv = pendingIncomingInviteRef.current;
    if (!inv || answeringIncoming) return;
    setAnsweringIncoming(true);
    pendingIncomingInviteRef.current = null;
    setPendingIncomingInvite(null);
    incomingCallRingRef.current?.stop();
    incomingCallRingRef.current?.dispose();
    incomingCallRingRef.current = null;

    try {
      if (peerRef.current) {
        cleanupOutboundCallResources();
      }

      const { servers: iceServers, relayConfigured } = await fetchIceServers();
      relayConfiguredRef.current = relayConfigured;
      console.log("[call-inbound] ICE servers:", iceServers.map((s) => s.urls));
      const pc = createWhatsAppCallPeerConnection(iceServers);
      peerRef.current = pc;
      sdpAnswerAppliedHashRef.current = null;
      reconnectIceAttemptedRef.current = false;
      setPeerForStats(pc);
      callSoundRef.current?.dispose();
      callSoundRef.current = new OutboundCallSoundController();
      pendingOutboundCallRef.current = null;

      const startedAtMs = Date.now();
      callSessionMetaRef.current = {
        startedAtMs,
        conversationId: inv.conversationId,
        summaryVariant: "inbound",
        phoneNumberId: inv.phoneNumberId,
      };

      suppressPrematureInboundIceCleanupRef.current = true;
      attachOutboundCallMediaHandlers(pc);

      setOutboundCallUi({
        sessionKind: "inbound",
        phase: "connecting",
        surface: "floating",
        contactLabel: inv.contactLabel,
        connectionState: pc.connectionState,
        iceState: pc.iceConnectionState,
        signalingState: pc.signalingState,
        startedAtMs,
        muted: false,
        speaker: true,
      });

      const browserOffer = sanitizeMetaOfferSdpForBrowser(inv.offerSdp);
      await pc.setRemoteDescription({ type: "offer", sdp: browserOffer });

      const { usedMic, silentHandle } = await attachLocalAudioOrRecvOnly(pc, localCallStreamRef);
      silentOutboundAudioRef.current = silentHandle;
      if (!usedMic) {
        toast({
          title: "Microphone unavailable",
          description:
            "Using a low-level silent carrier so RTP keeps flowing. Allow the mic for two-way audio with the customer.",
          duration: 10_000,
        });
      }

      restrictPeerConnectionAudioToOpus(pc);

      const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio");
      if (audioSender) {
        try {
          const params = audioSender.getParameters();
          if (!params.encodings?.length) params.encodings = [{}];
          const enc = params.encodings[0];
          if (enc) {
            // 64 kbps gives noticeably better Opus fidelity for voice without
            // stressing the connection; Meta's infra handles the media relay.
            enc.maxBitrate = 64_000;
            enc.networkPriority = "high";
          }
          await audioSender.setParameters(params);
        } catch {
          /* optional tuning */
        }
      }

      logWebRtcMediaDiagnostics(pc, "inbound-pre-createAnswer");
      const rawAnswer = await pc.createAnswer();
      await pc.setLocalDescription(rawAnswer);

      const rawIceSummary = await awaitIceGatheringForMeta(
        pc,
        relayConfigured,
        awaitIceGatheringOrTimeout,
      );

      // Guard: if PC closed during gather abort here with diagnostic context.
      console.log("[call-inbound] post-gather PC state", {
        signalingState: pc.signalingState,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
      });
      if (pc.signalingState === "closed" || pc.connectionState === "closed") {
        throw new Error(
          `[inbound] RTCPeerConnection closed during ICE gathering ? ` +
            `signalingState=${pc.signalingState} connectionState=${pc.connectionState} ` +
            `iceConnectionState=${pc.iceConnectionState}. ` +
            `Possible causes: premature cleanup, TURN auth rejected, or browser closed PC.`,
        );
      }

      logWebRtcMediaDiagnostics(pc, "inbound-post-ICE-gather");

      // Log sender track health before reading localDescription.
      pc.getSenders().forEach((s) => {
        if (s.track) {
          console.log("[call-inbound] sender track", s.track.kind, "readyState:", s.track.readyState);
        }
      });

      const gathered = pc.localDescription?.sdp ?? "";
      if (!gathered) throw new Error("Failed to generate SDP answer");

      const { sdp, kept, dropped } = buildCleanWhatsAppOfferDetailed(gathered, { role: "answer" });
      const metaSummary = summarizeMetaCandidates(kept);
      console.log("[call-inbound] Meta candidates:", metaSummary);
      setLastIceDiagnostics({
        kept: [...kept],
        dropped: [...dropped],
        metaOfferPreview: sdp.slice(0, 1600),
        relayConfigured,
        gathered: snapshotIceGathered(pc),
      });

      const sdpProblems = validateWhatsAppCallingSdp(sdp);
      if (sdpProblems.length > 0) {
        console.warn("[call inbound] SDP validation warnings:", sdpProblems);
      }

      if (kept.length === 0) {
        suppressPrematureInboundIceCleanupRef.current = false;
        cleanupOutboundCallResources();
        toast({
          title: "No usable ICE candidates",
          description: formatNoUsableMetaCandidatesMessage(dropped, relayConfigured, rawIceSummary),
          variant: "destructive",
          duration: 10_000,
        });
        return;
      }

      const phoneNumberId =
        inv.phoneNumberId.trim() || (selectedPhoneIdRef.current != null ? String(selectedPhoneIdRef.current).trim() : "");
      if (!phoneNumberId) {
        suppressPrematureInboundIceCleanupRef.current = false;
        cleanupOutboundCallResources();
        toast({
          title: "Could not answer call",
          description: "Missing WhatsApp phone line id. Select the correct business number in the sidebar and try again.",
          variant: "destructive",
        });
        return;
      }

      const sdpForMeta = sdp.includes("\r\n") ? sdp : sdp.replace(/\n/g, "\r\n");

      const answerPayload: Record<string, unknown> = {
        action: "answer_incoming_call",
        callId: inv.callId,
        phoneNumberId,
        session: { sdpType: "answer" as const, sdp: sdpForMeta },
      };
      if (inv.conversationId.trim()) {
        answerPayload.conversationId = inv.conversationId.trim();
      }

      const response = await axios.post("/api/whatsapp/call", answerPayload);

      if (!response.data?.success) {
        suppressPrematureInboundIceCleanupRef.current = false;
        cleanupOutboundCallResources();
        toast({
          title: "Answer failed",
          description:
            typeof response.data?.error === "string" && response.data.error.trim()
              ? response.data.error.trim()
              : "Meta did not accept the call answer.",
          variant: "destructive",
        });
        return;
      }

      suppressPrematureInboundIceCleanupRef.current = false;

      setActiveCallId(inv.callId);
      // Do NOT play the outbound ring here ? the call is already live from the
      // customer's side. Playing a ring tone through speakers while the mic is
      // open feeds it back to the customer (the "ting" noise). Instead wait for
      // `ontrack` to fire which plays the connect chime quietly.
      //
      // If ICE was in a failed/closed state during the answer-prep window
      // (suppressed above), nudge the connection by restarting ICE now that
      // Meta has confirmed the accept.
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "closed" ||
        pc.connectionState === "failed"
      ) {
        try {
          pc.restartIce();
        } catch {
          /* ignore ? best-effort */
        }
      }

      setOutboundCallUi((prev) =>
        prev ? { ...prev, signalingState: pc.signalingState, phase: "ringing" } : prev,
      );
      toast({
        title: "Call answered",
        description: "Connecting audio with the customer?",
      });
    } catch (error: unknown) {
      cleanupOutboundCallResources();
      console.error("Incoming call answer failed:", error);
      toast({
        title: "Could not answer call",
        description: formatWhatsAppCallApiError(error),
        variant: "destructive",
      });
    } finally {
      setAnsweringIncoming(false);
    }
  }, [
    answeringIncoming,
    attachOutboundCallMediaHandlers,
    cleanupOutboundCallResources,
    toast,
  ]);

  const handleHangUpWhatsAppCall = useCallback(() => {
    if (hangUpInProgressRef.current) return;
    hangUpInProgressRef.current = true;

    const sessionSnap = callSessionMetaRef.current;
    const callId = activeCallId;
    const convId = sessionSnap?.conversationId?.trim() ?? "";
    const phoneId =
      sessionSnap?.phoneNumberId?.trim() ||
      (selectedPhoneIdRef.current != null ? String(selectedPhoneIdRef.current).trim() : "");

    let durationSeconds: number | undefined;
    if (sessionSnap && convId) {
      durationSeconds = Math.max(0, Math.round((Date.now() - sessionSnap.startedAtMs) / 1000));
    }

    void callSoundRef.current?.playEndChime().catch(() => {});

    // Close UI + peer immediately so End always responds (terminate/telemetry can lag or hang).
    cleanupOutboundCallResources();

    if (callId && (convId || phoneId)) {
      void axios
        .post("/api/whatsapp/call", {
          action: "terminate_call",
          callId,
          ...(convId ? { conversationId: convId } : {}),
          ...(phoneId ? { phoneNumberId: phoneId } : {}),
        })
        .catch((e) => {
          console.warn("[call] terminate_call failed:", e);
        });
    }
    if (callId && convId) {
      void axios
        .post("/api/whatsapp/calls/telemetry", {
          callId,
          conversationId: convId,
          event: "client_ended",
          disconnectReason: "user_hangup",
          stats: statsSnapshotRef.current,
          ...(typeof durationSeconds === "number" ? { durationSeconds } : {}),
          recordChatSummary: true,
          ...(sessionSnap?.summaryVariant === "inbound" ? { chatSummaryVariant: "inbound" as const } : {}),
        })
        .catch(() => {
          /* non-fatal */
        });
    }

    hangUpInProgressRef.current = false;
  }, [activeCallId, cleanupOutboundCallResources]);

  const handleResumeRemoteCallAudio = useCallback(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    void el.play().then(
      () => setRemoteAudioPlayBlocked(false),
      (err) => {
        console.warn("[call] resume play failed:", err);
      },
    );
  }, []);

  const callStats = usePeerConnectionStats(peerForStats, !!outboundCallUi);
  useEffect(() => {
    if (callStats) statsSnapshotRef.current = callStats as unknown as Record<string, unknown>;
  }, [callStats]);

  // Cleanup all WebRTC resources on unmount (navigation, page close, HMR).
  useEffect(() => {
    return () => {
      cleanupOutboundCallResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fn = () => {
      const el = remoteAudioRef.current;
      if (document.visibilityState === "visible" && el?.srcObject) {
        void el.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);

  const handleToggleCallMute = useCallback(() => {
    setOutboundCallUi((prev) => {
      if (!prev) return prev;
      const nextMuted = !prev.muted;
      localCallStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
      return { ...prev, muted: nextMuted };
    });
  }, []);

  const handleToggleCallSpeaker = useCallback(() => {
    const el = remoteAudioRef.current;
    setOutboundCallUi((prev) => {
      if (!prev) return prev;
      const next = !prev.speaker;
      if (el) el.volume = next ? 1 : 0.88;
      return { ...prev, speaker: next };
    });
  }, []);

  const handleCallMinimize = useCallback(() => {
    setOutboundCallUi((prev) => (prev ? { ...prev, surface: "floating" } : prev));
  }, []);

  const handleCallExpand = useCallback(() => {
    setOutboundCallUi((prev) => (prev ? { ...prev, surface: "fullscreen" } : prev));
  }, []);

  useEffect(() => {
    if (!outboundCallUi) return;
    const id = window.setInterval(() => {
      setOutboundCallUi((prev) => (prev ? { ...prev } : prev));
    }, 1000);
    return () => window.clearInterval(id);
  }, [outboundCallUi]);

  const callElapsedLabel = !outboundCallUi
    ? "0:00"
    : (() => {
        const sec = Math.floor((Date.now() - outboundCallUi.startedAtMs) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
      })();

  /** RTP / outbound media watchdog ? Meta drops calls when packetsSent stays ~0. */
  useEffect(() => {
    if (!outboundCallUi || outboundCallUi.phase !== "connected") return;
    const pc = peerRef.current;
    if (!pc) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const p = peerRef.current;
      if (!p) return;
      void (async () => {
        logWebRtcMediaDiagnostics(p, "periodic");
        const rtp = await collectOutboundRtpAudioSummary(p);
        const sent = rtp.packetsSent;
        if (
          (sent === 0 || sent === undefined) &&
          Date.now() - t0 > 12_000 &&
          !mediaStallWarnedRef.current
        ) {
          mediaStallWarnedRef.current = true;
          toast({
            title: "No outbound RTP (audio)",
            description:
              "packetsSent is still 0 ? Meta may disconnect (~20s). Check mic, mute, and console [call-media:periodic] logs.",
            variant: "destructive",
            duration: 14_000,
          });
        }
      })();
    }, 4000);
    return () => {
      window.clearInterval(id);
      mediaStallWarnedRef.current = false;
    };
  }, [outboundCallUi?.phase, toast]);

  // Initialize cross-tab WhatsApp notification controller
  useEffect(() => {
    const notificationController = getWhatsAppNotificationController();

    console.log("?? Initializing notification controller");

    const hasWhatsAppAccess = isWhatsAppAccessRole(token?.role || "");

    const userLocations =
      Array.isArray(token?.allotedArea)
        ? token.allotedArea
        : token?.allotedArea
        ? [token.allotedArea]
        : [];

    notificationController.init({
      hasWhatsAppAccess,
      userId: token?.id,
      userRole: token?.role || "",
      userLocations,
      getMuted: () => {
        if (typeof window === "undefined") return new Set();
        try {
          const muted = localStorage.getItem("whatsapp_muted_conversations");
          if (!muted) return new Set();
          const parsed = JSON.parse(muted);
          const now = Date.now();
          const valid = Object.entries(parsed)
            .filter(
              ([_, timestamp]: [string, any]) =>
                now - (timestamp as number) < 30 * 60 * 1000
            )
            .map(([id]) => id);
          return new Set(valid);
        } catch {
          return new Set();
        }
      },
      getArchived: () => {
        if (typeof window === "undefined") return new Set();
        try {
          const raw = localStorage.getItem("whatsapp_archived_conversations");
          if (!raw) return new Set();
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return new Set(parsed as string[]);
          } else if (parsed && typeof parsed === "object") {
            return new Set(Object.keys(parsed));
          }
          return new Set();
        } catch {
          return new Set();
        }
      },
      getLastReadAt: (conversationId: string) => {
        if (typeof window === "undefined") return undefined;
        try {
          const raw = localStorage.getItem("whatsapp_last_read_at");
          if (!raw) return undefined;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && parsed[conversationId]) {
            const ms = new Date(parsed[conversationId] as string).getTime();
            return Number.isNaN(ms) ? undefined : ms;
          }
          return undefined;
        } catch {
          return undefined;
        }
      },
      getActiveConversationId: () => {
        if (typeof window === "undefined") return null;
        try {
          const raw = localStorage.getItem("whatsapp_active_conversation");
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed?.conversationId || null;
        } catch {
          return null;
        }
      },
      isTabVisible: () => {
        return typeof document === "undefined"
          ? true
          : document.visibilityState === "visible";
      },
      isOnWhatsAppRoute: () => {
        if (typeof window === "undefined") return true;
        return window.location.pathname.startsWith("/whatsapp");
      },
      onInApp: () => {
        // Toast handled by SystemNotificationToast ? do not re-enter socket handler
      },
      onBrowser: (raw) => {
        try {
          const displayText =
            typeof raw.message?.content === "string"
              ? raw.message.content
              : raw.message?.content?.text ||
                raw.message?.content?.caption ||
                "New message";

          const notif = new Notification(
            raw.participantName || raw.message?.from || "WhatsApp",
            {
              body: displayText.substring(0, 100),
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: raw.conversationId,
            },
          );

          notif.onclick = () => {
            window.focus();
            notif.close();
            if (raw.conversationId) {
              router.push(`/whatsapp?conversation=${raw.conversationId}`);
            }
          };
        } catch (err) {
          console.error("[NOTIF] Browser notification failed:", err);
        }
      },
    });
  }, [token, router]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);




  useEffect(() => {
    callPermissionsRef.current = callPermissions;
  }, [callPermissions]);

  const fetchCallPermissions = useCallback(async (): Promise<boolean> => {
    if (callPermsFetched) {
      return callPermissionsRef.current.canMakeCalls;
    }
    if (callPermsFetchInFlightRef.current) {
      return callPermissionsRef.current.canMakeCalls;
    }
    callPermsFetchInFlightRef.current = true;
    try {
      const response = await axios.get("/api/whatsapp/call");
      if (response.data.success) {
        const next = { canMakeCalls: Boolean(response.data.canMakeCalls) };
        setCallPermissions(next);
        callPermissionsRef.current = next;
        setCallPermsFetched(true);
        return next.canMakeCalls;
      }
    } catch (error) {
      console.error("Failed to check call permissions:", error);
    } finally {
      callPermsFetchInFlightRef.current = false;
    }
    setCallPermsFetched(true);
    return false;
  }, [callPermsFetched]);

  const searchParams = useSearchParams();
  const isRetargetOnly = searchParams?.get("retargetOnly") === "1";
  const retargetOnlyRef = useRef(isRetargetOnly);
  retargetOnlyRef.current = isRetargetOnly;
  const legacyPhoneIdStrippedRef = useRef(false);

  // Legacy links used ?phoneId= ? strip it; inbox is unified (location + visibility, not phone tabs).
  useEffect(() => {
    const phoneIdParam = searchParams?.get("phoneId");
    if (!phoneIdParam || legacyPhoneIdStrippedRef.current) return;
    legacyPhoneIdStrippedRef.current = true;
    const conv =
      searchParams?.get("conversation") || searchParams?.get("conversationId");
    const retargetOnlyFlag = searchParams?.get("retargetOnly");
    const locationParam = searchParams?.get("location");
    const typeParam = searchParams?.get("conversationType");
    const phoneParam = searchParams?.get("phone");
    const nameParam = searchParams?.get("name");
    const profilePicParam = searchParams?.get("profilePic");
    const next = new URLSearchParams();
    if (retargetOnlyFlag) next.set("retargetOnly", retargetOnlyFlag);
    if (conv) next.set("conversation", conv);
    const inboxLocationFilter = searchParams?.get("locationFilter");
    if (inboxLocationFilter) {
      next.set("locationFilter", inboxLocationFilter);
    }
    if (searchParams?.get("adminQueue") === "true") {
      next.set("adminQueue", "true");
    }
    if (locationParam) next.set("location", locationParam);
    if (typeParam) next.set("conversationType", typeParam);
    if (phoneParam) next.set("phone", phoneParam);
    if (nameParam) next.set("name", nameParam);
    if (profilePicParam) next.set("profilePic", profilePicParam);
    const qs = next.toString();
    router.replace(qs ? `/whatsapp?${qs}` : "/whatsapp", { scroll: false });
  }, [searchParams, router]);

  const canManagePhoneMask =
    token?.role === "HR" || token?.role === "SuperAdmin";

  useSocketHandlers({
    socket,
    token: token ?? null,
    allowedPhoneConfigs,
    phoneConfigsReady,
    activeConversationId: selectedConversation?._id ?? null,
    refs: {
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
    },
    actions: {
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
    },
  });

  const handleGuestAdded = async (conversationId: string, conversation?: Conversation) => {
    try {
      // New owners have a location key ? they never belong in Admin Queue
      setAdminQueue(false);

      const businessPhoneId = conversation?.businessPhoneId?.trim() || "";

      const addedType = conversation?.conversationType === "guest" ? "guests" : "owners";
      setSidebarTabHint(addedType === "guests" ? "guests" : "all");

      let newConversation: Conversation | null = null;

      if (conversation) {
        const conversationType = conversation.conversationType ?? "owner";
        newConversation = {
          ...conversation,
          _id: String(conversation._id || conversationId),
          businessPhoneId: businessPhoneId || conversation.businessPhoneId || "",
          participantPhone: conversation.participantPhone || "",
          participantName:
            conversation.participantName || conversation.participantPhone || "Unknown",
          unreadCount: conversation.unreadCount ?? 0,
          status: conversation.status || "active",
          conversationType,
          lastMessageTime: conversation.lastMessageTime || new Date(),
          isArchivedByUser: conversation.isArchivedByUser || false,
          isInternal: conversation.isInternal || conversation.source === "internal" || false,
        } as Conversation;
      } else {
        try {
          const response = await axios.get(
            `/api/whatsapp/conversations?conversation=${conversationId}`,
          );
          if (response.data.success && response.data.conversations?.[0]) {
            newConversation = response.data.conversations[0] as Conversation;
          }
        } catch (fetchError) {
          console.error("Error fetching conversation:", fetchError);
        }
      }

      if (newConversation) {
        const id = String(newConversation._id);
        patchConversationsList((prev) => {
          const without = prev.filter((c) => c._id !== id);
          return insertConversationAtCorrectPosition(without, newConversation!);
        });

        selectConversation(newConversation);
      } else {
        router.push(
          buildWhatsAppInboxUrl(searchParams, {
            conversation: conversationId,
            retargetOnly: retargetOnlyRef.current,
          }),
          { scroll: false },
        );
      }
    } catch (error) {
      console.error("Error handling guest added:", error);
      router.push(
        buildWhatsAppInboxUrl(searchParams, {
          conversation: conversationId,
          retargetOnly: retargetOnlyRef.current,
        }),
        { scroll: false },
      );
    }
  };

  const openedByPhoneRef = useRef<string | null>(null);

  useEffect(() => {
    const phoneParam = searchParams?.get("phone");
    if (!phoneParam || !token) return;

    const locationParam = searchParams?.get("location")?.trim() || "";
    const typeParam = searchParams?.get("conversationType");
    const openType =
      typeParam === "guest" || typeParam === "owner" ? typeParam : undefined;
    const rentalTypeParam = searchParams?.get("rentalType");
    const openRentalType =
      rentalTypeParam === "Short Term" || rentalTypeParam === "Long Term"
        ? rentalTypeParam
        : undefined;
    const cacheKey = `${phoneParam}_${locationParam}_${openType ?? ""}_${openRentalType ?? ""}`;
    if (openedByPhoneRef.current === cacheKey) return;
    openedByPhoneRef.current = cacheKey;

    const normalized = phoneParam.replace(/\D/g, "");
    const nameParam = searchParams?.get("name") || undefined;
    const profilePicParam = searchParams?.get("profilePic") || undefined;

    (async () => {
      try {
        let phoneNumberId = "";

        if (locationParam) {
          try {
            const resolveRes = await axios.get(
              "/api/whatsapp/resolve-phone-for-location",
              {
                params: {
                  location: locationParam,
                  ...(openType ? { conversationType: openType } : {}),
                  ...(openRentalType ? { rentalType: openRentalType } : {}),
                },
              },
            );
            phoneNumberId = resolveRes.data.phoneNumberId || phoneNumberId;
          } catch {
            // fall through
          }
        }

        if (!phoneNumberId) {
          toast({
            title: "Cannot open chat",
            description: locationParam
              ? `No WhatsApp line configured for ${locationParam}`
              : "Missing location or phone line",
            variant: "destructive",
          });
          return;
        }

        const convs = await refetchConversationsList();
        const found = convs.find((c: Conversation) => {
          const phoneMatch = (c.participantPhone || "")
            .replace(/\D/g, "")
            .endsWith(normalized);
          const lineMatch =
            !phoneNumberId || c.businessPhoneId === phoneNumberId;
          return phoneMatch && lineMatch;
        });

        if (found) {
          let conversationToOpen = found;
          if (
            openType &&
            found.conversationType !== openType
          ) {
            try {
              await axios.post(
                `/api/whatsapp/conversations/${found._id}/meta`,
                { conversationType: openType },
              );
              conversationToOpen = {
                ...found,
                conversationType: openType,
              };
            } catch {
              // non-blocking ? still open the thread
            }
          }
          patchConversationsList((prev) => {
            const exists = prev.find((c) => c._id === conversationToOpen._id);
            if (exists) {
              return repositionConversationAfterUpdate(
                prev,
                conversationToOpen._id,
                () => conversationToOpen,
                { reposition: false },
              );
            }
            return insertConversationAtCorrectPosition(prev, conversationToOpen);
          });
          selectConversation(conversationToOpen);
        } else {
          const createRes = await axios.post("/api/whatsapp/conversations", {
            participantPhone: normalized,
            participantName: nameParam || phoneParam,
            phoneNumberId,
            participantLocation: locationParam || undefined,
            location: locationParam || undefined,
            conversationType: openType,
            ...(openRentalType ? { rentalType: openRentalType } : {}),
            ...(profilePicParam ? { participantProfilePic: profilePicParam } : {}),
          });
          if (createRes.data.success) {
            const conversation = createRes.data.conversation as Conversation;
            patchConversationsList((prev) => {
              const exists = prev.find((c) => c._id === conversation._id);
              if (exists) {
                return repositionConversationAfterUpdate(
                  prev,
                  conversation._id,
                  () => conversation,
                  { reposition: false },
                );
              }
              return insertConversationAtCorrectPosition(prev, conversation);
            });
            selectConversation(conversation);
          }
        }
      } catch (err) {
        console.error("Error opening conversation by phone", err);
        toast({
          title: "Error",
          description: "Failed to open conversation",
          variant: "destructive",
        });
      }
    })();
  }, [searchParams, token]);

  // Deep-link: ?conversation=<id> ? restore the selected conversation on
  // page load / refresh / back-forward navigation.
  const deepLinkConvRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    const convParam =
      searchParams?.get("conversation") || searchParams?.get("conversationId");
    if (!convParam || !token) return;
    // Already restored for this exact value ? avoid re-running on unrelated searchParam changes.
    if (deepLinkConvRestoredRef.current === convParam) return;
    // If a conversation is already selected (user navigated manually) don't override.
    if (selectedConversation) {
      deepLinkConvRestoredRef.current = convParam;
      return;
    }

    deepLinkConvRestoredRef.current = convParam;

    (async () => {
      // First try the already-loaded conversation list.
      const fromList = conversations.find((c) => c._id === convParam);
      if (fromList) {
        selectConversation(fromList);
        return;
      }
      // Fall back to a direct API lookup.
      try {
        const res = await axios.get(
          `/api/whatsapp/conversations?conversation=${encodeURIComponent(convParam)}`,
        );
        if (res.data.success && res.data.conversations?.[0]) {
          const conv = res.data.conversations[0] as Conversation;
          patchConversationsList((prev) => {
            const exists = prev.find((c) => c._id === conv._id);
            if (exists) return prev;
            return insertConversationAtCorrectPosition(prev, conv);
          });
          selectConversation(conv);
        } else {
          // Conversation not found or access denied ? strip the stale param gracefully.
          toast({
            title: "Conversation not found",
            description: "The linked conversation could not be loaded.",
            variant: "destructive",
          });
          router.replace("/whatsapp", { scroll: false });
        }
      } catch {
        // Network error ? don't navigate away, let the user retry.
      }
    })();
  }, [searchParams, token, conversations, selectedConversation, selectConversation, patchConversationsList, router, toast]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Skip 24-hour window check for "You" conversations (always active)
    const isYouConv = selectedConversation.isInternal || selectedConversation.source === "internal";
    if (
      !isYouConv &&
      !isMessageWindowActive(
        selectedConversation,
        getConversationBusinessPhoneId(selectedConversation),
      )
    ) {
      setShowTemplateDialog(true);
      return;
    }

    setSendingMessage(true);  
    const tempId = `temp-${Date.now()}`;
    const messageContent = newMessage;
    const sendTimestamp = new Date();
    const currentReplyTo = replyToMessage; // Capture current reply context

    // Add message to UI optimistically with content object and reply context
    const tempMsg: Message = {
      _id: tempId,
      messageId: tempId,
      from: "me",
      to: selectedConversation.participantPhone,
      type: "text",
      content: { text: messageContent },
      timestamp: sendTimestamp,
      status: "sending",
      direction: "outgoing",
      // Include reply context if replying (use both old and new field names for compatibility)
      ...(currentReplyTo && {
        replyToMessageId: currentReplyTo.messageId,
        replyContext: {
          messageId: currentReplyTo.messageId,
          from: currentReplyTo.from,
          type: currentReplyTo.type,
          content: typeof currentReplyTo.content === "string"
            ? { text: currentReplyTo.content }
            : { text: currentReplyTo.content?.text, caption: currentReplyTo.content?.caption },
          mediaUrl: currentReplyTo.mediaUrl,
        },
        // Also include old field names for backwards compatibility
        quotedMessageId: currentReplyTo.messageId,
        quotedMessage: {
          messageId: currentReplyTo.messageId,
          from: currentReplyTo.from,
          type: currentReplyTo.type,
          content: typeof currentReplyTo.content === "string"
            ? { text: currentReplyTo.content }
            : { text: currentReplyTo.content?.text, caption: currentReplyTo.content?.caption },
          mediaUrl: currentReplyTo.mediaUrl,
        },
      }),
    };
    mutateActiveMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");
    setReplyToMessage(null); // Clear reply after sending

    // Immediately update conversation list optimistically
    patchConversationsList((prev) => {
      const exists = prev.find((c) => c._id === selectedConversation._id);
      if (exists) {
        return repositionConversationAfterUpdate(prev, selectedConversation._id, (conv) => ({
          ...conv,
          lastMessageContent: messageContent,
          lastMessageTime: sendTimestamp,
          lastMessageDirection: "outgoing",
          lastMessageId: tempId,
          lastMessageStatus: "sending" as const,
        }));
      }
      const newConv = {
        ...selectedConversation,
        lastMessageContent: messageContent,
        lastMessageTime: sendTimestamp,
        lastMessageDirection: "outgoing",
      };
      return insertConversationAtCorrectPosition(prev, newConv);
    });

    // Update selected conversation timestamp instantly
    setSelectedConversation((prev) => {
      if (prev && prev._id === selectedConversation._id) {
        return {
          ...prev,
          lastMessageTime: sendTimestamp,
        };
      }
      return prev;
    });

    try {
      const response = await axios.post("/api/whatsapp/send-message", {
        to: selectedConversation.participantPhone,
        message: messageContent,
        conversationId: selectedConversation._id,
        // Include reply context for WhatsApp API
        ...(currentReplyTo && {
          replyToMessageId: currentReplyTo.messageId,
        }),
      });

      if (response.data.success) {
        const realMessageId = response.data.messageId;
        const savedMessageId = response.data.savedMessageId;
        const realTimestamp = new Date(response.data.timestamp || sendTimestamp);

        mutateActiveMessages((prev) => {
          const existingIdx = prev.findIndex((m) => m.messageId === realMessageId);
          if (existingIdx !== -1) {
            return prev
              .filter((m) => m._id !== tempId)
              .map((m) =>
                m.messageId === realMessageId
                  ? { ...m, _id: savedMessageId, status: "sent", timestamp: realTimestamp }
                  : m,
              );
          }

          return prev.map((msg) =>
            msg._id === tempId
              ? {
                  ...msg,
                  _id: savedMessageId,
                  messageId: realMessageId,
                  status: "sent",
                  timestamp: realTimestamp,
                }
              : msg,
          );
        });

        patchConversationsList((prev) =>
          patchConversationInList(prev, selectedConversation._id, {
            lastMessageId: realMessageId,
            lastMessageStatus: "sent" as const,
          }),
        );

        // Mark this messageId as seen to avoid duplicate processing
        try {
          addToLRUSet(seenMessageIdsRef.current, response.data.messageId);
        } catch (e) {}
      }
    } catch (error: any) {
      mutateActiveMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, status: "failed" } : msg
        )
      );

      // Server-side 24-hour window enforcement: redirect to templates.
      if (error.response?.data?.code === "WINDOW_CLOSED") {
        const closedPhoneId =
          typeof error.response.data.businessPhoneId === "string"
            ? error.response.data.businessPhoneId
            : selectedOutboundPhoneId;
        if (closedPhoneId) {
          const priorByPhone =
            selectedConversation.lastCustomerMessageAtByPhone ?? {};
          handleUpdateConversation(selectedConversation._id, {
            lastCustomerMessageAtByPhone: {
              ...priorByPhone,
              [closedPhoneId]: new Date(0).toISOString(),
            },
          } as Partial<Conversation>);
        }
        setShowTemplateDialog(true);
        toast({
          title: "24-hour window closed",
          description: "Please use a template message to re-open the conversation.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const sendTemplateMessage = async () => {
    if (!selectedTemplate || !selectedConversation) return;

    // Templates are not needed for "You" conversations
    const isYouConv = selectedConversation.isInternal || selectedConversation.source === "internal";
    if (isYouConv) {
      toast({
        title: "Templates not needed",
        description: "You can send regular messages to yourself",
        variant: "default",
      });
      return;
    }

    setSendingMessage(true);
    const tempId = `temp-${Date.now()}`;
    const sendTimestamp = new Date();
    
    // Get the filled template text for display
    const templatePreviewText = getTemplatePreviewText(selectedTemplate, templateParams);
    const templateDisplayText = templatePreviewText || `Template: ${selectedTemplate.name}`;

    const tempMsg: Message = {
      _id: tempId,
      messageId: tempId,
      from: "me",
      to: selectedConversation.participantPhone,
      type: "template",
      content: { text: templateDisplayText },
      timestamp: sendTimestamp,
      status: "sending",
      direction: "outgoing",
    };
    mutateActiveMessages((prev) => [...prev, tempMsg]);

    // Update conversation list optimistically
    const templatePreview = templateDisplayText.substring(0, 50) + (templateDisplayText.length > 50 ? "..." : "");
    patchConversationsList((prev) => {
      const exists = prev.find((c) => c._id === selectedConversation._id);
      if (exists) {
        return repositionConversationAfterUpdate(prev, selectedConversation._id, (conv) => ({
          ...conv,
          lastMessageContent: templatePreview,
          lastMessageTime: sendTimestamp,
          lastMessageDirection: "outgoing",
        }));
      }
      const newConv = {
        ...selectedConversation,
        lastMessageContent: templatePreview,
        lastMessageTime: sendTimestamp,
        lastMessageDirection: "outgoing",
      };
      return insertConversationAtCorrectPosition(prev, newConv);
    });

    // Update selected conversation timestamp instantly
    setSelectedConversation((prev) => {
      if (prev && prev._id === selectedConversation._id) {
        return {
          ...prev,
          lastMessageTime: sendTimestamp,
        };
      }
      return prev;
    });

    try {
      // Build components array with parameters using existing helper function
      const components = buildTemplateComponents(selectedTemplate, templateParams);

      const response = await axios.post("/api/whatsapp/send-template", {
        to: selectedConversation.participantPhone,
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language,
        conversationId: selectedConversation._id,
        components: components.length > 0 ? components : undefined,
        templateText: templateDisplayText, // Send the filled template text for DB storage
      });

      if (response.data.success) {
        const realMessageId = response.data.messageId;
        const savedMessageId = response.data.savedMessageId;
        const realTimestamp = new Date(response.data.timestamp || sendTimestamp);

        mutateActiveMessages((prev) => {
          const existingIdx = prev.findIndex((m) => m.messageId === realMessageId);
          if (existingIdx !== -1) {
            return prev
              .filter((m) => m._id !== tempId)
              .map((m) =>
                m.messageId === realMessageId
                  ? {
                      ...m,
                      _id: savedMessageId,
                      status: "sent",
                      timestamp: realTimestamp,
                    }
                  : m
              );
          }

          return prev.map((msg) =>
            msg._id === tempId
              ? {
                  ...msg,
                  _id: savedMessageId,
                  messageId: realMessageId,
                  status: "sent",
                  timestamp: realTimestamp,
                }
              : msg
          );
        });

        try {
          addToLRUSet(seenMessageIdsRef.current, realMessageId);
        } catch {
          // ignore
        }

        toast({
          title: "Template Sent",
          description: "Your template message was sent successfully",
        });
        setShowTemplateDialog(false);
        setSelectedTemplate(null);
        setTemplateParams({}); // Clear parameters after successful send
      }
    } catch (error: any) {
      mutateActiveMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, status: "failed" } : msg
        )
      );
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send template",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const startNewConversation = async () => {
    if (!newCountryCode.trim() || !newPhoneNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both country code and phone number",
        variant: "destructive",
      });
      return;
    }

    // E.164: country code (no +), no leading zeros, no spaces, only digits, e.g. 919876543210
    const country = newCountryCode.replace(/\D/g, "");
    const phone = newPhoneNumber.replace(/\D/g, "");
    if (!country || !phone) {
      toast({
        title: "Invalid Number",
        description: "Country code and phone number must be digits only.",
        variant: "destructive",
      });
      return;
    }
    if (country.startsWith("0") || phone.startsWith("0")) {
      toast({
        title: "Invalid Number",
        description: "Country code and phone number must not start with 0.",
        variant: "destructive",
      });
      return;
    }
    if (country.length < 1 || country.length > 4) {
      toast({
        title: "Invalid Country Code",
        description: "Country code must be 1-4 digits.",
        variant: "destructive",
      });
      return;
    }
    if (phone.length < 6 || phone.length > 15) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be 6-15 digits.",
        variant: "destructive",
      });
      return;
    }
    const fullPhoneNumber = `${country}${phone}`;

    const alreadyInList = conversations.find(
      (c) => (c.participantPhone || "").replace(/\D/g, "") === fullPhoneNumber.replace(/\D/g, ""),
    );
    if (alreadyInList) {
      selectConversation(alreadyInList);
      setNewPhoneNumber("");
      toast({
        title: "Conversation exists",
        description: "Opening existing chat instead of creating a duplicate.",
      });
      return;
    }

    toast({
      title: "Add location first",
      description:
        "Use the + person icon ? Owner or Guest and pick a city, or open the contact from a lead.",
      variant: "destructive",
    });
  };

  // Handle forward messages
  const handleForwardMessages = (messageIds: string[]) => {
    setMessagesToForward(messageIds);
    setShowForwardDialog(true);
  };

  // Handle reply to message
  const handleReplyMessage = (message: Message) => {
    setReplyToMessage(message);
    
    // Focus on message composer
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="Type a message"]') as HTMLTextAreaElement;
      textarea?.focus();
    }, 100);
  };
  
  // Cancel reply
  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  // Handle react to message
  const handleReactMessage = async (message: Message, emoji: string = "??") => {
    if (!selectedConversation || !message.messageId) return;

    // Optimistically add reaction to the message
    mutateActiveMessages((prev) =>
      prev.map((msg) => {
        if (msg.messageId === message.messageId) {
          const existingReactions = msg.reactions || [];
          // Check if this reaction already exists
          const hasReaction = existingReactions.some(
            (r) => r.emoji === emoji && r.direction === "outgoing"
          );
          if (!hasReaction) {
            return {
              ...msg,
              reactions: [...existingReactions, { emoji, direction: "outgoing" }],
            };
          }
        }
        return msg;
      })
    );

    try {
      const response = await axios.post("/api/whatsapp/send-reaction", {
        messageId: message.messageId, // WhatsApp message ID (wamid)
        emoji: emoji,
        conversationId: selectedConversation._id,
      });

      if (response.data.success) {
        toast({
          title: "Reaction Sent",
          description: `Reacted with ${emoji}`,
        });
      } else {
        throw new Error(response.data.error || "Failed to send reaction");
      }
    } catch (error: any) {
      console.error("React error:", error);
      // Revert optimistic update on error
      mutateActiveMessages((prev) =>
        prev.map((msg) => {
          if (msg.messageId === message.messageId) {
            const reactions = msg.reactions || [];
            return {
              ...msg,
              reactions: reactions.filter(
                (r) => !(r.emoji === emoji && r.direction === "outgoing")
              ),
            };
          }
          return msg;
        })
      );
      toast({
        title: "Reaction Failed",
        description: error.response?.data?.error || "Failed to send reaction",
        variant: "destructive",
      });
    }
  };

  const handleForwardConfirm = async (conversationIds: string[]) => {
    if (messagesToForward.length === 0 || conversationIds.length === 0) return;

    setForwardingMessages(true);
    try {
      const response = await axios.post("/api/whatsapp/forward-message", {
        messageIds: messagesToForward,
        conversationIds,
      });

      if (response.data.success) {
        toast({
          title: "Messages Forwarded",
          description: `Successfully forwarded ${response.data.summary.successful} message(s)`,
        });
        setShowForwardDialog(false);
        setMessagesToForward([]);
      } else {
        throw new Error(response.data.error || "Failed to forward messages");
      }
    } catch (error: any) {
      console.error("Forward error:", error);
      toast({
        title: "Forward Failed",
        description: error.response?.data?.error || "Failed to forward messages",
        variant: "destructive",
      });
    } finally {
      setForwardingMessages(false);
    }
  };

  const handleTransferLead = async (targetPhoneId: string) => {
    if (!selectedConversation) return;

    setTransferringLead(true);
    const transferredConversationId = selectedConversation._id;
    
    try {
      const response = await axios.post("/api/whatsapp/conversations/transfer", {
        conversationId: selectedConversation._id,
        targetPhoneId,
      });

      if (response.data.success) {
        toast({
          title: "Lead Transferred",
          description: `Conversation transferred successfully. ${response.data.messagesTransferred} message(s) moved.`,
        });
        
        // Refresh conversations to reflect the transfer
        const refreshedConversations = await refetchConversationsList();
        
        const finalConversationId = response.data.conversationId;
        const finalConv = refreshedConversations.find(
          (c) => c._id === finalConversationId
        );
        
        if (finalConv) {
          selectConversation(finalConv);
          await queryClient.invalidateQueries({
            queryKey: buildMessagesQueryKey(finalConv._id),
          });
        } else {
          // If conversation not found in current list, it might be in a different phone's list
          // Clear selection and let user navigate manually
          selectConversation(null);
        }
      } else {
        throw new Error(response.data.error || "Failed to transfer conversation");
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: "Transfer Failed",
        description: error.response?.data?.error || "Failed to transfer conversation",
        variant: "destructive",
      });
    } finally {
      setTransferringLead(false);
    }
  };

  // Handle drag & drop file upload
  useEffect(() => {
    const handleFileDropped = async (event: Event) => {
      const customEvent = event as CustomEvent<{ file: File; mediaType: string; bunnyUrl: string; filename: string }>;
      const { file, mediaType, bunnyUrl, filename } = customEvent.detail;
      
      if (!selectedConversation) return;

      // Skip 24-hour window check for "You" conversations (always active)
      const isYouConv = selectedConversation.isInternal || selectedConversation.source === "internal";
      if (
      !isYouConv &&
      !isMessageWindowActive(
        selectedConversation,
        getConversationBusinessPhoneId(selectedConversation),
      )
    ) {
        setShowTemplateDialog(true);
        return;
      }

      setUploadingMedia(true);

      const tempId = `temp-${Date.now()}`;
      const sendTimestamp = new Date();
      const mediaDisplayText = `?? ${file.name}`;

      // Add optimistic message
      const tempMsg: Message = {
        _id: tempId,
        messageId: tempId,
        from: "me",
        to: selectedConversation.participantPhone,
        type: mediaType,
        content: {},
        mediaUrl: bunnyUrl,
        filename: filename || file.name, // Include filename for audio/video display
        timestamp: sendTimestamp,
        status: "sending",
        direction: "outgoing",
      };
      mutateActiveMessages((prev) => [...prev, tempMsg]);

      // Update conversation list optimistically
      patchConversationsList((prev) =>
        repositionConversationAfterUpdate(prev, selectedConversation._id, (conv) => ({
          ...conv,
          lastMessageContent: mediaDisplayText,
          lastMessageTime: sendTimestamp,
          lastMessageDirection: "outgoing",
        })),
      );

      // Update selected conversation timestamp instantly
      setSelectedConversation((prev) => {
        if (prev && prev._id === selectedConversation._id) {
          return {
            ...prev,
            lastMessageTime: sendTimestamp,
          };
        }
        return prev;
      });

      try {
        // Send via send-media API using Bunny URL
        const sendResponse = await axios.post("/api/whatsapp/send-media", {
          to: selectedConversation.participantPhone,
          conversationId: selectedConversation._id,
          mediaType: mediaType,
          mediaUrl: bunnyUrl, // Use Bunny CDN URL directly
          filename: filename || file.name,
        });

        if (sendResponse.data.success) {
          mutateActiveMessages((prev) =>
            prev.map((msg) =>
              msg._id === tempId
                ? {
                    ...msg,
                    _id: sendResponse.data.savedMessageId,
                    messageId: sendResponse.data.messageId,
                    status: "sent",
                  }
                : msg
            )
          );
          toast({
            title: "Media Sent",
            description: `${
              mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
            } sent successfully`,
          });
        }
      } catch (error: any) {
        mutateActiveMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempId ? { ...msg, status: "failed" } : msg
          )
        );
        toast({
          title: "Send Failed",
          description:
            error.response?.data?.error || "Failed to send media",
          variant: "destructive",
        });
      } finally {
        setUploadingMedia(false);
      }
    };

    window.addEventListener("fileDropped", handleFileDropped);
    return () => {
      window.removeEventListener("fileDropped", handleFileDropped);
    };
  }, [selectedConversation]);

  // Handle file/media upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    mediaType: "image" | "document" | "audio" | "video"
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedConversation) return;

    // For images, support multiple files; for others, use first file only
    const filesToProcess = mediaType === "image" ? Array.from(files) : [files[0]];

    // Validate all files before upload
    const maxSize = mediaType === "document" ? 100 * 1024 * 1024 : 200 * 1024 * 1024; // 100MB for documents, 200MB for media (including WebP)
    const invalidFiles = filesToProcess.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: `${invalidFiles.length} file(s) exceed maximum allowed size (${maxSize / 1024 / 1024}MB)`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    // Skip 24-hour window check for "You" conversations (always active)
    const isYouConv = selectedConversation.isInternal || selectedConversation.source === "internal";
    if (
      !isYouConv &&
      !isMessageWindowActive(
        selectedConversation,
        getConversationBusinessPhoneId(selectedConversation),
      )
    ) {
      setShowTemplateDialog(true);
      // Reset the file input
      event.target.value = "";
      return;
    }

    setUploadingMedia(true);

    // Process multiple images in parallel, or single file for other types
    if (mediaType === "image" && filesToProcess.length > 1) {
      // Handle multiple images
      await handleMultipleImageUpload(filesToProcess);
    } else {
      // Handle single file (original logic)
      await handleSingleFileUpload(filesToProcess[0], mediaType);
    }

    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
    setUploadingMedia(false);
  };

  const handleSingleFileUpload = async (
    file: File,
    mediaType: "image" | "document" | "audio" | "video",
    customCaption?: string
  ) => {
    if (!selectedConversation) return;

    const tempId = `temp-${Date.now()}`;
    const sendTimestamp = new Date();
    const captionText = customCaption?.trim() || "";
    const mediaDisplayText = captionText ? `?? ${captionText}` : `?? ${file.name}`;
    
    // Create a local preview URL for images/videos
    const localPreviewUrl = (mediaType === "image" || mediaType === "video") 
      ? URL.createObjectURL(file) 
      : undefined;

    // Add optimistic message with content object and local preview
    const tempMsg: Message = {
      _id: tempId,
      messageId: tempId,
      from: "me",
      to: selectedConversation.participantPhone,
      type: mediaType,
      content: captionText ? { caption: captionText } : {},
      mediaUrl: localPreviewUrl || (mediaType === "audio" ? URL.createObjectURL(file) : undefined), // Show local preview immediately (for audio, create URL for player)
      filename: file.name,
      timestamp: sendTimestamp,
      status: "sending",
      direction: "outgoing",
    };
    mutateActiveMessages((prev) => [...prev, tempMsg]);

    // Update conversation list optimistically
    patchConversationsList((prev) =>
      repositionConversationAfterUpdate(prev, selectedConversation._id, (conv) => ({
        ...conv,
        lastMessageContent: mediaDisplayText,
        lastMessageTime: sendTimestamp,
        lastMessageDirection: "outgoing",
      })),
    );

    // Update selected conversation timestamp instantly
    setSelectedConversation((prev) => {
      if (prev && prev._id === selectedConversation._id) {
        return {
          ...prev,
          lastMessageTime: sendTimestamp,
        };
      }
      return prev;
    });

    try {
      // First upload to Bunny CDN with progress tracking
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await axios.post(
        "/api/whatsapp/upload-to-bunny",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              // Update optimistic message to show upload progress
              mutateActiveMessages((prev) =>
                prev.map((msg) =>
                  msg._id === tempId
                    ? { ...msg, uploadProgress: percentCompleted }
                    : msg
                )
              );
            }
          },
        }
      );

      if (!uploadResponse.data.success) {
        throw new Error("Failed to upload to CDN");
      }

      const { url: bunnyUrl, filename: bunnyFilename } = uploadResponse.data;

      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      mutateActiveMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, mediaUrl: bunnyUrl } : msg
        )
      );

      const sendResponse = await axios.post("/api/whatsapp/send-media", {
        to: selectedConversation.participantPhone,
        conversationId: selectedConversation._id,
        mediaType: mediaType,
        mediaUrl: bunnyUrl,
        ...(captionText ? { caption: captionText } : {}),
        filename: bunnyFilename || file.name,
      });

      if (sendResponse.data.success) {
        mutateActiveMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempId
              ? {
                  ...msg,
                  _id: sendResponse.data.savedMessageId,
                  messageId: sendResponse.data.messageId,
                  status: "sent",
                }
              : msg
          )
        );
        toast({
          title: "Media Sent",
          description: `${
            mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
          } sent successfully`,
        });
      }
    } catch (error: any) {
      console.error("? File upload error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        fileType: mediaType,
        fileName: file.name,
        fileSize: file.size,
      });
      mutateActiveMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, status: "failed" } : msg
        )
      );
      toast({
        title: "Upload Failed",
        description:
          error.response?.data?.error || error.response?.data?.details || error.message || "Failed to upload and send media",
        variant: "destructive",
      });
    }
  };

  // Handle sending media with individual captions
  const handleSendMediaWithCaptions = async (files: Array<{ file: File; caption: string }>) => {
    if (!selectedConversation || files.length === 0) return;

    setUploadingMedia(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const { file, caption } = files[i];
        const mediaType = file.type.startsWith("image/") ? "image" 
          : file.type.startsWith("video/") ? "video"
          : file.type.startsWith("audio/") ? "audio" 
          : "document";

        if (mediaType === "image") {
          await handleSingleImageWithCaption(file, caption);
        } else {
          await handleSingleFileUpload(
            file,
            mediaType as "video" | "audio" | "document",
            caption
          );
        }

        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error: any) {
      console.error("Error sending media:", error);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.error || error.message || "Failed to send media",
        variant: "destructive",
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  // Helper to send a single image with optional caption
  const handleSingleImageWithCaption = async (file: File, caption: string) => {
    if (!selectedConversation) return;

    const tempId = `temp-${Date.now()}`;
    const sendTimestamp = new Date();
    const mediaDisplayText = caption || `?? ${file.name}`;
    
    // Create local preview URL
    const localPreviewUrl = URL.createObjectURL(file);

    // Add optimistic message
    const tempMsg: Message = {
      _id: tempId,
      messageId: tempId,
      from: "me",
      to: selectedConversation.participantPhone,
      type: "image",
      content: caption?.trim() ? { caption: caption.trim() } : {},
      mediaUrl: localPreviewUrl,
      filename: file.name,
      timestamp: sendTimestamp,
      status: "sending",
      direction: "outgoing",
    };
    mutateActiveMessages((prev) => [...prev, tempMsg]);

    // Update conversation list optimistically
    patchConversationsList((prev) =>
      repositionConversationAfterUpdate(prev, selectedConversation._id, (conv) => ({
        ...conv,
        lastMessageContent: mediaDisplayText,
        lastMessageTime: sendTimestamp,
        lastMessageDirection: "outgoing",
      })),
    );

    try {
      // Upload to Bunny CDN
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await axios.post(
        "/api/whatsapp/upload-to-bunny",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              mutateActiveMessages((prev) =>
                prev.map((msg) =>
                  msg._id === tempId
                    ? { ...msg, uploadProgress: percentCompleted }
                    : msg
                )
              );
            }
          },
        }
      );

      if (!uploadResponse.data.success) {
        throw new Error("Failed to upload to CDN");
      }

      const { url: bunnyUrl, filename: bunnyFilename } = uploadResponse.data;

      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      mutateActiveMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, mediaUrl: bunnyUrl } : msg
        )
      );

      // Send via WhatsApp API with caption
      const sendResponse = await axios.post("/api/whatsapp/send-media", {
        to: selectedConversation.participantPhone,
        conversationId: selectedConversation._id,
        mediaType: "image",
        mediaUrl: bunnyUrl,
        ...(caption?.trim() ? { caption: caption.trim() } : {}),
        filename: bunnyFilename || file.name,
      });

      if (sendResponse.data.success) {
        mutateActiveMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempId
              ? {
                  ...msg,
                  _id: sendResponse.data.savedMessageId,
                  messageId: sendResponse.data.messageId,
                  status: "sent",
                }
              : msg
          )
        );
      }
    } catch (error: any) {
      console.error("? Image send error:", error);
      mutateActiveMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, status: "failed" } : msg
        )
      );
      throw error; // Re-throw to be handled by caller
    }
  };

  // Handle multiple image uploads
  const handleMultipleImageUpload = async (files: File[]) => {
    if (!selectedConversation) return;

    const sendTimestamp = new Date();
    const tempIds: string[] = [];
    const uploadPromises: Promise<void>[] = [];

    // Create optimistic messages for all images
    files.forEach((file, index) => {
      const tempId = `temp-${Date.now()}-${index}`;
      tempIds.push(tempId);
      
      const localPreviewUrl = URL.createObjectURL(file);
      const tempMsg: Message = {
        _id: tempId,
        messageId: tempId,
        from: "me",
        to: selectedConversation.participantPhone,
        type: "image",
        content: {},
        mediaUrl: localPreviewUrl,
        filename: file.name,
        timestamp: sendTimestamp,
        status: "sending",
        direction: "outgoing",
      };
      mutateActiveMessages((prev) => [...prev, tempMsg]);
    });

    // Update conversation list optimistically
    const mediaDisplayText = `?? ${files.length} image${files.length > 1 ? 's' : ''}`;
    patchConversationsList((prev) =>
      repositionConversationAfterUpdate(prev, selectedConversation._id, (conv) => ({
        ...conv,
        lastMessageContent: mediaDisplayText,
        lastMessageTime: sendTimestamp,
        lastMessageDirection: "outgoing",
      })),
    );

    // Update selected conversation timestamp
    setSelectedConversation((prev) => {
      if (prev && prev._id === selectedConversation._id) {
        return {
          ...prev,
          lastMessageTime: sendTimestamp,
        };
      }
      return prev;
    });

    // Upload and send all images in parallel
    files.forEach((file, index) => {
      const tempId = tempIds[index];
      const uploadPromise = (async () => {
        try {
          // Upload to Bunny CDN
          const formData = new FormData();
          formData.append("file", file);

          const uploadResponse = await axios.post(
            "/api/whatsapp/upload-to-bunny",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                  const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  mutateActiveMessages((prev) =>
                    prev.map((msg) =>
                      msg._id === tempId
                        ? { ...msg, uploadProgress: percentCompleted }
                        : msg
                    )
                  );
                }
              },
            }
          );

          if (!uploadResponse.data.success) {
            throw new Error("Failed to upload to CDN");
          }

          const { url: bunnyUrl, filename: bunnyFilename } = uploadResponse.data;

          // Revoke the per-iteration blob URL before replacing with CDN URL
          mutateActiveMessages((prev) => {
            const existing = prev.find((m) => m._id === tempId);
            if (existing?.mediaUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(existing.mediaUrl);
            }
            return prev.map((msg) =>
              msg._id === tempId ? { ...msg, mediaUrl: bunnyUrl } : msg
            );
          });

          // Send the image via WhatsApp API
          const sendResponse = await axios.post("/api/whatsapp/send-media", {
            to: selectedConversation.participantPhone,
            conversationId: selectedConversation._id,
            mediaType: "image",
            mediaUrl: bunnyUrl,
            filename: bunnyFilename || file.name,
          });

          if (sendResponse.data.success) {
            mutateActiveMessages((prev) =>
              prev.map((msg) =>
                msg._id === tempId
                  ? {
                      ...msg,
                      _id: sendResponse.data.savedMessageId,
                      messageId: sendResponse.data.messageId,
                      status: "sent",
                    }
                  : msg
              )
            );
          }
        } catch (error: any) {
          console.error(`? Image ${index + 1} upload error:`, error);
          mutateActiveMessages((prev) =>
            prev.map((msg) =>
              msg._id === tempId ? { ...msg, status: "failed" } : msg
            )
          );
        }
      })();
      
      uploadPromises.push(uploadPromise);
    });

    // Wait for all uploads to complete
    await Promise.allSettled(uploadPromises);

    // Show success toast
    const successCount = files.length;
    toast({
      title: "Images Sent",
      description: `${successCount} image${successCount > 1 ? 's' : ''} sent successfully`,
    });
  };

  // Handle audio call
  const handleAudioCall = async () => {
    const canCall = await fetchCallPermissions();
    if (!selectedConversation || !canCall) return;

    const phoneNumberId = getConversationBusinessPhoneId(selectedConversation);
    if (!phoneNumberId) {
      toast({
        title: "Calls not available",
        description: "Voice calls are not supported for internal chats.",
        variant: "destructive",
      });
      return;
    }

    setCallingAudio(true);
    try {
      rejectPendingIncomingForNewOutbound();
      if (peerRef.current) {
        cleanupOutboundCallResources();
      }
      // 0) Check permission state first (prevents wasting the limited permission-request sends)
      const userWaId = selectedConversation.participantPhone;
      if (phoneNumberId && userWaId) {
        try {
          const permRes = await axios.get("/api/whatsapp/call", { params: { phoneNumberId, userWaId } });
          const perm = permRes.data?.data?.permission;
          const actions = Array.isArray(permRes.data?.data?.actions) ? permRes.data.data.actions : [];
          const startAction = actions.find((a: any) => a.action_name === "start_call");
          const canStart = startAction?.can_perform_action;

          if (!canStart) {
            const canReq = actions.find((a: any) => a.action_name === "send_call_permission_request")?.can_perform_action;
            if (canReq) {
              await axios.post("/api/whatsapp/call", {
                conversationId: selectedConversation._id,
                action: "permission_request",
                bodyText: "We would like to call you to help resolve your query. Please allow calls.",
              });
              toast({
                title: "Call permission request sent",
                description: "User must accept before we can call.",
              });
              return;
            }

            toast({
              title: "Cannot start call yet",
              description: (() => {
                const status = perm?.status || "unknown";
                const limits = Array.isArray(startAction?.limits) ? startAction.limits : [];
                const limitText = limits
                  .map((l: any) => {
                    const tp = l.time_period || "";
                    const cur = typeof l.current_usage === "number" ? l.current_usage : "?";
                    const max = typeof l.max_allowed === "number" ? l.max_allowed : "?";
                    const exp = l.limit_expiration_time ? ` exp:${new Date(Number(l.limit_expiration_time) * 1000).toLocaleString()}` : "";
                    return `${tp} ${cur}/${max}${exp}`;
                  })
                  .filter(Boolean)
                  .join(" | ");
                return `Permission: ${status}. start_call not allowed right now.${limitText ? ` Limits: ${limitText}` : ""}`;
              })(),
              variant: "destructive",
            });
            return;
          }
        } catch (e: any) {
          // If the permission-state endpoint fails, continue and let start_call return the real error.
          console.warn("Call permission state check failed:", e?.response?.data || e?.message);
        }
      }

      // Build WebRTC offer (audio only) and start call via Calls API
      const { servers: iceServers, relayConfigured } = await fetchIceServers();
      relayConfiguredRef.current = relayConfigured;
      console.log("[call-outbound] ICE servers:", iceServers.map((s) => s.urls));
      const pc = createWhatsAppCallPeerConnection(iceServers);
      peerRef.current = pc;
      sdpAnswerAppliedHashRef.current = null;
      reconnectIceAttemptedRef.current = false;
      setPeerForStats(pc);
      callSoundRef.current?.dispose();
      callSoundRef.current = new OutboundCallSoundController();
      attachOutboundCallMediaHandlers(pc);
      pendingOutboundCallRef.current = { conversationId: String(selectedConversation._id) };
      const contactLabel =
        selectedConversation.participantName?.trim() ||
        selectedConversation.participantPhone ||
        "Contact";
      const startedAtMs = Date.now();
      callSessionMetaRef.current = {
        startedAtMs,
        conversationId: String(selectedConversation._id),
        summaryVariant: "outbound",
        phoneNumberId,
      };
      setOutboundCallUi({
        sessionKind: "outbound",
        phase: "connecting",
        surface: "floating",
        contactLabel,
        connectionState: pc.connectionState,
        iceState: pc.iceConnectionState,
        signalingState: pc.signalingState,
        startedAtMs,
        muted: false,
        speaker: true,
      });

      const { usedMic, silentHandle } = await attachLocalAudioOrRecvOnly(pc, localCallStreamRef);
      silentOutboundAudioRef.current = silentHandle;
      if (!usedMic) {
        toast({
          title: "Microphone unavailable",
          description:
            "Using a low-level silent carrier so RTP keeps flowing to WhatsApp (avoids ~20s media drops). Allow the mic for real two-way audio.",
          duration: 10000,
        });
      }

      restrictPeerConnectionAudioToOpus(pc);
      const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio");
      if (audioSender) {
        try {
          const params = audioSender.getParameters();
          if (!params.encodings?.length) params.encodings = [{}];
          const enc = params.encodings[0];
          if (enc) {
            enc.maxBitrate = 64_000;
            enc.networkPriority = "high";
          }
          await audioSender.setParameters(params);
        } catch {
          /* optional tuning */
        }
      }

      logWebRtcMediaDiagnostics(pc, "pre-createOffer");
      console.log("[call] pre-createOffer PC state", {
        signalingState: pc.signalingState,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
      });
      // Set Chrome's ORIGINAL offer as local description (Chrome rejects any modification).
      const rawOffer = await pc.createOffer();
      console.log("[call] raw Chrome offer SDP:\n", rawOffer.sdp);
      await pc.setLocalDescription(rawOffer);

      // Wait for ICE gathering (resolves on complete OR timeout ? never rejects).
      const rawIceSummary = await awaitIceGatheringForMeta(
        pc,
        relayConfigured,
        awaitIceGatheringOrTimeout,
      );

      // Guard: if PC closed during gather abort here with diagnostic context.
      console.log("[call] post-gather PC state", {
        signalingState: pc.signalingState,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
      });
      if (pc.signalingState === "closed" || pc.connectionState === "closed") {
        throw new Error(
          `[outbound] RTCPeerConnection closed during ICE gathering ? ` +
            `signalingState=${pc.signalingState} connectionState=${pc.connectionState} ` +
            `iceConnectionState=${pc.iceConnectionState}. ` +
            `Possible causes: premature cleanup, TURN auth rejected, or browser closed PC.`,
        );
      }

      logWebRtcMediaDiagnostics(pc, "post-ICE-gather");

      // Build a fresh minimal RFC 8866 SDP from Chrome's local description.  This drops
      // all Chrome-only attributes (extmap, rtcp-fb, ?) and filters ICE candidates so we
      // send Meta only public IPv4 srflx/relay candidates.
      const gathered = pc.localDescription?.sdp ?? "";
      if (!gathered) throw new Error("Failed to generate SDP offer");

      const { sdp, kept, dropped } = buildCleanWhatsAppOfferDetailed(gathered, { role: "offer" });
      const metaSummary = summarizeMetaCandidates(kept);
      console.log("[call] kept ICE candidates:", kept);
      console.log("[call] dropped ICE candidates:", dropped);
      console.log("[call] Meta candidate summary:", metaSummary);
      console.log("[call] clean offer SDP sent to Meta:\n", sdp);
      setLastIceDiagnostics({
        kept: [...kept],
        dropped: [...dropped],
        metaOfferPreview: sdp.slice(0, 1600),
        relayConfigured,
        gathered: snapshotIceGathered(pc),
      });

      const sdpProblems = validateWhatsAppCallingSdp(sdp);
      if (sdpProblems.length > 0) {
        console.warn("[call] SDP validation warnings:", sdpProblems);
      }

      if (kept.length === 0) {
        cleanupOutboundCallResources();
        toast({
          title: "No usable ICE candidates",
          description: formatNoUsableMetaCandidatesMessage(dropped, relayConfigured, rawIceSummary),
          variant: "destructive",
          duration: 10_000,
        });
        return;
      }

      const response = await axios.post("/api/whatsapp/call", {
        conversationId: String(selectedConversation._id),
        action: "start_call",
        session: { sdpType: "offer", sdp },
        bizOpaqueCallbackData: String(selectedConversation._id),
      });

      if (!response.data?.success) {
        cleanupOutboundCallResources();
        toast({
          title: "Call Failed",
          description:
            typeof response.data?.error === "string" && response.data.error.trim()
              ? response.data.error.trim()
              : "Call did not start.",
          variant: "destructive",
        });
        return;
      }

      const startedCallId =
        typeof response.data.callId === "string" && response.data.callId.trim()
          ? response.data.callId.trim()
          : null;
      if (startedCallId) {
        setActiveCallId(startedCallId);
      }
      if (signalingAnswerTimerRef.current) {
        clearTimeout(signalingAnswerTimerRef.current);
        signalingAnswerTimerRef.current = null;
      }
      signalingAnswerTimerRef.current = setTimeout(() => {
        const p = peerRef.current;
        if (!p || p.signalingState === "stable") return;
        toast({
          title: "Call timed out",
          description: "No SDP answer received in time. Check webhook connectivity.",
          variant: "destructive",
        });
        cleanupOutboundCallResources();
      }, WA_CALL_SIGNALING_ANSWER_TIMEOUT_MS);
      void callSoundRef.current?.startOutboundRing();
      setOutboundCallUi((prev) =>
        prev
          ? {
              ...prev,
              phase: "ringing",
              signalingState: pc.signalingState,
            }
          : prev,
      );
      toast({
        title: "?? Calling?",
        description: "Call initiated. Waiting for SDP answer?",
      });
    } catch (error: unknown) {
      cleanupOutboundCallResources();
      console.error("Call initiation failed:", error);
      const ax = error as { response?: { data?: unknown; status?: number; headers?: unknown } };
      console.error("Call API response status:", ax?.response?.status);
      console.error("Call API response headers:", ax?.response?.headers);
      console.error("Call API response body:", ax?.response?.data);
      toast({
        title: "Call Failed",
        description: formatWhatsAppCallApiError(error),
        variant: "destructive",
      });
    } finally {
      setCallingAudio(false);
    }
  };


  // "You" conversations are always active - no template requirement, no 24-hour window
  const isYouConversation = selectedConversation?.isInternal || selectedConversation?.source === "internal";
  const selectedOutboundPhoneId =
    getConversationBusinessPhoneId(selectedConversation) ?? null;
  const canSendFreeForm =
    isYouConversation ||
    (selectedConversation
      ? isMessageWindowActive(selectedConversation, selectedOutboundPhoneId)
      : false);
  const showCrmActions =
    Boolean(selectedConversation) &&
    !selectedConversation?.isInternal &&
    selectedConversation?.source !== "internal";

  const copyPhoneNumber = () => {
    if (!selectedConversation) return;
    const role = token?.role || "";
    if (
      shouldMaskConversationPhone(
        selectedConversation.conversationType,
        phoneMaskRules,
        role,
      )
    ) {
      toast({
        variant: "destructive",
        title: "Phone hidden",
        description: "This number is masked for your role and cannot be copied.",
      });
      return;
    }
    navigator.clipboard.writeText(selectedConversation.participantPhone);
    toast({
      title: "Copied",
      description: "Phone number copied to clipboard",
    });
  };

  // Handle mobile back navigation
  const handleMobileBack = useCallback(() => {
    setSelectedConversation(null);
    navigateToConversations();
  }, [navigateToConversations]);

  // -- Stable ref wrapper for handleAudioCall so containers don't break memoization --
  const handleAudioCallRef = useRef(handleAudioCall);
  handleAudioCallRef.current = handleAudioCall;
  const stableHandleAudioCall = useCallback(async () => handleAudioCallRef.current(), []);

  // -- Stable dialog-opener callbacks for containers --
  const stableOpenDisposition = useCallback(() => setShowDispositionDialog(true), [setShowDispositionDialog]);
  const stableOpenSetVisit = useCallback(() => setShowVisitDialog(true), [setShowVisitDialog]);
  const stableOpenReminder = useCallback(() => setShowReminderDialog(true), [setShowReminderDialog]);
  const stableOpenAddOwner = useCallback(() => {
    setAddContactType("owner");
    setShowAddContactModal(true);
  }, [setAddContactType, setShowAddContactModal]);
  const stableOpenAddGuestModal = useCallback(() => {
    setAddContactType("guest");
    setShowAddContactModal(true);
  }, [setAddContactType, setShowAddContactModal]);
  const stableOpenTransferDialog = useCallback(() => setShowTransferDialog(true), [setShowTransferDialog]);

  // -- Keep sendActionsRef fresh every render so containers always call the latest closures --
  sendActionsRef.current.sendMessage = sendMessage;
  sendActionsRef.current.sendTemplateMessage = sendTemplateMessage;
  sendActionsRef.current.handleFileUpload = handleFileUpload as SendActions["handleFileUpload"];
  sendActionsRef.current.handleSendMediaWithCaptions = handleSendMediaWithCaptions as SendActions["handleSendMediaWithCaptions"];

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[#f0f2f5] dark:bg-[#0b141a] overflow-x-hidden">
        

        {clientMounted &&
          isDesktopNotificationSupported() &&
          getDesktopNotificationPermission() === "default" &&
          !desktopNotifyBannerDismissed && (
            <div
              role="region"
              aria-label="Desktop notifications"
              className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <span className="text-center">Enable browser notifications for new messages and incoming calls.</span>
              <button
                type="button"
                className="rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                onClick={async () => {
                  const p = await requestDesktopNotificationPermission();
                  if (p === "granted") {
                    toast({ title: "Notifications on", description: "You will get alerts when the tab is in the background." });
                  } else if (p === "denied") {
                    toast({
                      title: "Notifications blocked",
                      description: "Allow notifications for this site in your browser settings.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Turn on
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
                onClick={() => {
                  try {
                    localStorage.setItem("whatsapp_desktop_notify_dismissed", "1");
                  } catch {
                    /* ignore */
                  }
                  setDesktopNotifyBannerDismissed(true);
                }}
              >
                Not now
              </button>
            </div>
          )}

        <div className="flex-1 overflow-x-hidden max-w-full min-h-0">
          {/* Mobile-first responsive layout */}
          <div className="flex h-full relative w-full max-w-full min-h-0 overflow-hidden">
            {/* -- Sidebar Container ----------------------------------------- */}
            <ConversationSidebarContainer
              isMobile={isMobile}
              mobileView={mobileView}
              isConnected={isConnected}
              token={token as ConversationSidebarContainerProps["token"]}
              canManagePhoneMask={canManagePhoneMask}
              onOpenAddOwner={stableOpenAddOwner}
              onOpenAddGuestModal={stableOpenAddGuestModal}
              onOpenDisposition={stableOpenDisposition}
              onOpenSetVisit={stableOpenSetVisit}
              onOpenReminder={stableOpenReminder}
            />

            {/* -- Message Thread Container ---------------------------------- */}
            <MessageThreadContainer
              isMobile={isMobile}
              mobileView={mobileView}
              token={token as MessageThreadContainerProps["token"]}
              canManagePhoneMask={canManagePhoneMask}
              isConnected={isConnected}
              phoneMaskRules={phoneMaskRules}
              initiationLimitRefreshKey={initiationLimitRefreshKey}
              callPermissions={callPermissions}
              callPermsFetched={callPermsFetched}
              callingAudio={callingAudio}
              onAudioCall={stableHandleAudioCall}
              onFetchCallPermissions={fetchCallPermissions}
              onOpenTransferDialog={stableOpenTransferDialog}
              fileInputRef={fileInputRef}
              imageInputRef={imageInputRef}
              videoInputRef={videoInputRef}
              audioInputRef={audioInputRef}
              messagesEndRef={messagesEndRef}
              sendActionsRef={sendActionsRef}
              onMobileBack={handleMobileBack}
            />

          </div>
        </div>
      
      {showAddContactModal && (
        <AddGuestModal
          open={showAddContactModal}
          onOpenChange={setShowAddContactModal}
          onGuestAdded={handleGuestAdded}
          conversationType={addContactType}
          userRole={token?.role}
          userEmail={token?.email}
          userAreas={token?.allotedArea}
          userRentalType={token?.rentalType}
          hidePhoneLineLabel
        />
      )}

      {showForwardDialog && (
        <ForwardDialog
          open={showForwardDialog}
          onOpenChange={setShowForwardDialog}
          onForward={handleForwardConfirm}
          selectedMessageCount={messagesToForward.length}
          conversations={conversations}
          loading={forwardingMessages}
        />
      )}

      {showTransferDialog && (
        <LeadTransferDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          conversation={selectedConversation}
          currentPhoneId={getConversationBusinessPhoneId(selectedConversation) ?? null}
          availablePhoneConfigs={allowedPhoneConfigs}
          onTransfer={handleTransferLead}
          loading={transferringLead}
        />
      )}

      <audio ref={remoteAudioRef} playsInline className="hidden" aria-hidden />

      {pendingIncomingInvite && !outboundCallUi ? (
        <div className="pointer-events-auto fixed inset-x-0 top-[max(3.25rem,env(safe-area-inset-top,0px))] z-[190] flex justify-center px-3 pt-2">
          <div className="flex max-w-lg flex-1 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2a3942] bg-[#202c33] px-4 py-3.5 shadow-xl">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#8696a0]">Incoming voice call</p>
              <p className="truncate text-[15px] font-normal text-[#e9edef]">{pendingIncomingInvite.contactLabel}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={handleDeclineIncomingCall}
                className="min-h-[44px] rounded-full bg-[#2a3942] px-5 text-[14px] font-medium text-[#e9edef] hover:bg-[#3b4a54]"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={answeringIncoming}
                onClick={() => {
                  void handleAnswerIncomingWhatsAppCall();
                }}
                className="min-h-[44px] rounded-full bg-[#25d366] px-5 text-[14px] font-semibold text-[#0b141a] hover:bg-[#20bd5a] disabled:opacity-50"
              >
                {answeringIncoming ? "Connecting?" : "Answer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {outboundCallUi ? (
        <WhatsAppCallOverlay
          visible
          sessionKind={outboundCallUi.sessionKind ?? "outbound"}
          surface={outboundCallUi.surface}
          phase={outboundCallUi.phase}
          contactLabel={outboundCallUi.contactLabel}
          connectionState={outboundCallUi.connectionState}
          iceState={outboundCallUi.iceState}
          signalingState={outboundCallUi.signalingState}
          elapsedLabel={callElapsedLabel}
          reconnecting={outboundCallUi.phase === "reconnecting"}
          muted={outboundCallUi.muted}
          speaker={outboundCallUi.speaker}
          remoteAudioPlayBlocked={remoteAudioPlayBlocked}
          diagnosticsOpen={callDiagnosticsOpen}
          onDiagnosticsOpenChange={setCallDiagnosticsOpen}
          stats={callStats}
          relayConfigured={lastIceDiagnostics?.relayConfigured ?? relayConfiguredRef.current}
          keptCandidates={lastIceDiagnostics?.kept ?? []}
          droppedCandidates={lastIceDiagnostics?.dropped ?? []}
          gatheredCandidates={lastIceDiagnostics?.gathered ?? []}
          metaOfferSdpPreview={lastIceDiagnostics?.metaOfferPreview}
          lastAnswerSdpPreview={lastAnswerSdpPreview ?? undefined}
          onToggleMute={handleToggleCallMute}
          onToggleSpeaker={handleToggleCallSpeaker}
          onHangUp={handleHangUpWhatsAppCall}
          onResumeAudio={handleResumeRemoteCallAudio}
          onMinimize={handleCallMinimize}
          onExpand={handleCallExpand}
        />
      ) : null}
    </div>
  );
}
