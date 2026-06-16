"use client";
import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { flushSync } from "react-dom";
import { type WhatsAppPhoneConfig } from "@/lib/whatsapp/config";
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
import { cn } from "@/lib/utils";
import {
  buildTemplateComponents,
  isMessageWindowActive,
  getTemplatePreviewText,
  getConversationTemplateContext,
  getConversationBusinessPhoneId,
} from "./utils";
import {
  FULL_ACCESS_ROLES,
  getRetargetPhoneId,
  isWhatsAppAccessRole,
} from "@/lib/whatsapp/config";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { MessageComposer } from "./components/MessageComposer";
import { AddGuestModal } from "./components/AddGuestModal";
import { useInitiationLimit } from "./hooks/useInitiationLimit";
import { InitiationLimitBadge } from "./components/InitiationLimitBadge";
import { CrmQuickActionsBar } from "./components/CrmQuickActionsBar";
import { DispositionDialog } from "./components/DispositionDialog";
import { SetVisitDialog } from "./components/SetVisitDialog";
import { ReminderDialog } from "./components/ReminderDialog";
import {
  canUseInboxLocationFilter,
  getInboxLocationFilterOptionsForUser,
} from "@/lib/whatsapp/participantLocationPrivileges";
import { SUPERADMIN_DEFAULT_INBOX_LOCATION } from "@/lib/whatsapp/locationAccess";
import { ForwardDialog } from "./components/ForwardDialog";
import { LeadTransferDialog } from "./components/LeadTransferDialog";
import { CrmPanel } from "./components/CrmPanel";
import { getWhatsAppNotificationController } from "@/lib/notifications/whatsappNotificationController";
import { collectMetaGraphErrorText } from "@/lib/whatsapp/metaGraphError";
import {
  applyPhoneMaskToConversation,
  getWhatsAppPhoneMaskFromToken,
  maskConversationsForViewer,
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
  showDesktopNotification,
  requestDesktopNotificationPermission,
  getDesktopNotificationPermission,
  isDesktopNotificationSupported,
} from "@/lib/whatsapp/browserDesktopNotify";
import { usePeerConnectionStats } from "./hooks/usePeerConnectionStats";
import { WhatsAppCallOverlay } from "./components/calling/WhatsAppCallOverlay";

/**
 * `/api/whatsapp/call` returns Zod `issues`, or `{ error, data }` (Meta body in `data`).
 * Axios only logs "400"; the real reason is in `response.data` â€” use this for toasts.
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

function simpleHashUtf8(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Webhook / socket call status â†’ remote leg ended; close local UI + PC. */
function isRemoteCallTerminalStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return (
    s === "busy" ||
    s === "rejected" ||
    s === "declined" ||
    s === "missed" ||
    s === "failed" ||
    s === "terminated" ||
    s === "completed" ||
    s === "ended" ||
    s === "disconnect"
  );
}

type PendingIncomingCallInvite = {
  callId: string;
  conversationId: string;
  phoneNumberId: string;
  offerSdp: string;
  contactLabel: string;
};

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
 *   - `icegatheringstatechange` â†’ "complete"  (standard)
 *   - `icecandidate` â†’ null candidate          (Chrome trickle-ICE end signal)
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
      console.warn(`[ice] gathering timeout after ${timeoutMs}ms; ${count} raw candidate(s) in SDP so far â€” continuing anyway`);
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
  const { token } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const messagesFetchGenRef = useRef(0);
  const lastSoundPlayedRef = useRef<number>(0);
  const handleWhatsAppMessageRef = useRef<((data: any) => void) | null>(null);
  
  const addToLRUSet = (set: Set<string>, value: string, maxSize = 500) => {
    if (set.size >= maxSize) {
      const first = set.values().next().value;
      if (first) set.delete(first);
    }
    set.add(value);
  };

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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allowedPhoneConfigs, setAllowedPhoneConfigs] = useState<WhatsAppPhoneConfig[]>([]);

  const sortConversations = (convs: Conversation[]) => {
    return convs.sort((a, b) => {
      const aIsInternal = a.isInternal || a.source === "internal";
      const bIsInternal = b.isInternal || b.source === "internal";
      if (aIsInternal && !bIsInternal) return -1;
      if (!aIsInternal && bIsInternal) return 1;
      return new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime();
    });
  };
  const isInitialLoadRef = useRef(true); // Track if this is the first load
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Infinite scroll state for conversations
  const [conversationsCursor, setConversationsCursor] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  
  // Progressive message loading state
  const [messagesCursor, setMessagesCursor] = useState<{ messageId: string; timestamp: string } | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  
  // Conversation counts from database
  const [conversationCounts, setConversationCounts] = useState({
    totalCount: 0,
    ownerCount: 0,
    guestCount: 0,
  });

  // Archive functionality (WhatsApp-style per-user archive)
  const [archivedCount, setArchivedCount] = useState(0);
  const [archivedUnreadCount, setArchivedUnreadCount] = useState(0);
  const [showingArchived, setShowingArchived] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);

  // Admin Queue: show conversations without a location key (full-access roles only)
  const [adminQueue, setAdminQueue] = useState(false);
  /** SuperAdmin: filter inbox by participant city ("all" = no filter) */
  const [adminLocationFilter, setAdminLocationFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("locationFilter");
    if (fromUrl) return fromUrl;
    if (params.get("adminQueue") === "true") return "all";
    try {
      const stored = JSON.parse(localStorage.getItem("token") || "null") as {
        role?: string;
      } | null;
      if (stored?.role === "SuperAdmin") {
        return SUPERADMIN_DEFAULT_INBOX_LOCATION;
      }
    } catch {
      /* ignore malformed token */
    }
    return "all";
  });
  const inboxLocationFilterInitializedRef = useRef(false);
  const [adminLocationOptions, setAdminLocationOptions] = useState<string[]>([]);
  /** After Add Owner/Guest, switch sidebar tab so the new chat is not hidden by tab filter */
  const [sidebarTabHint, setSidebarTabHint] = useState<"all" | "owners" | "guests" | null>(null);
  const [labelFilter, setLabelFilter] = useState("all");
  const [initiationLimitRefreshKey, setInitiationLimitRefreshKey] = useState(0);
  const { status: initiationLimitStatus } = useInitiationLimit(initiationLimitRefreshKey);
  const guestInitiationAtLimit = initiationLimitStatus?.atLimit ?? false;
  const [showDispositionDialog, setShowDispositionDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  const [showCrmPanel, setShowCrmPanel] = useState(false);

  // Total unread messages count (socket-based, real-time)
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const [desktopNotifyBannerDismissed, setDesktopNotifyBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("whatsapp_desktop_notify_dismissed") === "1";
    } catch {
      return false;
    }
  });
  
  // Add Guest Modal state
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addContactType, setAddContactType] = useState<"owner" | "guest">("owner");

  const [phoneMaskRules, setPhoneMaskRules] = useState<WhatsAppPhoneMaskRules>({
    maskOwnerPhones: false,
    maskGuestPhones: false,
  });
  const phoneMaskRulesRef = useRef(phoneMaskRules);
  const viewerRoleRef = useRef(token?.role || "");

  const maskConversationForViewer = useCallback((conv: Conversation): Conversation => {
    return applyPhoneMaskToConversation(
      conv,
      phoneMaskRulesRef.current,
      viewerRoleRef.current,
    );
  }, []);

  const maskConversationListForViewer = useCallback((list: Conversation[]): Conversation[] => {
    return maskConversationsForViewer(
      list,
      phoneMaskRulesRef.current,
      viewerRoleRef.current,
    );
  }, []);
  
  // Forward Dialog state
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<string[]>([]);
  const [forwardingMessages, setForwardingMessages] = useState(false);
  
  // Lead Transfer Dialog state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferringLead, setTransferringLead] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [newCountryCode, setNewCountryCode] = useState("91"); // Default to India
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingScrollToMessageId, setPendingScrollToMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesChannelScoped, setTemplatesChannelScoped] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);

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
  /** Single MediaStream for all remote audio tracks â€” avoids replace races / duplicate playback. */
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

  // Search in messages
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");

  
  // Cross-tab helpers for notification filtering
  const syncArchivedStorage = useCallback((ids: string[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        "whatsapp_archived_conversations",
        JSON.stringify(ids)
      );
    } catch (err) {
      console.error("Failed to sync archived conversations to storage", err);
    }
  }, []);

  const updateLocalLastReadAt = useCallback((conversationId: string) => {
    if (typeof window === "undefined" || !conversationId) return;
    try {
      const raw = localStorage.getItem("whatsapp_last_read_at");
      const map = raw ? JSON.parse(raw) : {};
      map[conversationId] = new Date().toISOString();
      localStorage.setItem("whatsapp_last_read_at", JSON.stringify(map));
    } catch (err) {
      console.error("Failed to persist last read state locally", err);
    }
  }, []);

  const markReadInFlightRef = useRef(new Set<string>());
  const lastMarkedReadMessageRef = useRef<Record<string, string>>({});
  const markConversationAsReadRef = useRef<
    (conversationId: string, opts?: { lastMessageId?: string }) => Promise<void>
  >(async () => {});

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
        if (response.data?.skipped) return;

        const markedId = response.data?.lastReadMessageId;
        if (markedId) {
          lastMarkedReadMessageRef.current[conversationId] = String(markedId);
        } else if (messageId) {
          lastMarkedReadMessageRef.current[conversationId] = messageId;
        }

        updateLocalLastReadAt(conversationId);
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c._id === conversationId ? { ...c, unreadCount: 0 } : c,
          );
          setTotalUnreadCount(
            updated.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0),
          );
          return updated;
        });
        setArchivedConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
      } catch {
        // Non-blocking — read state will reconcile on next inbox fetch
      } finally {
        markReadInFlightRef.current.delete(conversationId);
      }
    },
    [updateLocalLastReadAt],
  );

  useEffect(() => {
    markConversationAsReadRef.current = markConversationAsRead;
  }, [markConversationAsRead]);

  const persistActiveConversation = useCallback(
    (conversationId?: string | null) => {
      if (typeof window === "undefined") return;
      if (conversationId) {
        localStorage.setItem(
          "whatsapp_active_conversation",
          JSON.stringify({
            conversationId,
            updatedAt: Date.now(),
          })
        );
      } else {
        localStorage.removeItem("whatsapp_active_conversation");
      }
    },
    []
  );


  // Readers refresh token (bumps when we receive a real-time read event)
  const [readersRefreshToken, setReadersRefreshToken] = useState(0);

  // Ref to track selected conversation for socket events (avoids stale closure)
  const selectedConversationRef = useRef<Conversation | null>(null);
  const selectedPhoneIdRef = useRef<string | null>(null);
  selectedPhoneIdRef.current = getConversationBusinessPhoneId(selectedConversation) ?? null;
  const allowedPhoneIdsRef = useRef<string[]>([]);
  /** Stable channel IDs the user can access — used for dual-room socket subscriptions. */
  const allowedChannelIdsRef = useRef<string[]>([]);

  const handleUpdateConversation = useCallback((conversationId: string, patch: Partial<Conversation>) => {
    setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, ...patch } : c)));
    setArchivedConversations((prev) =>
      prev.map((c) => (c._id === conversationId ? { ...c, ...patch } : c)),
    );
    setSelectedConversation((prev) => (prev && prev._id === conversationId ? { ...prev, ...patch } : prev));
  }, []);

  const handleCrmLabelsUpdated = useCallback(
    (labels: string[]) => {
      if (selectedConversationRef.current) {
        handleUpdateConversation(selectedConversationRef.current._id, { labels });
      }
      setInitiationLimitRefreshKey((k) => k + 1);
    },
    [handleUpdateConversation],
  );

  const handleConversationTypeChange = useCallback(
    async (conversationId: string, conversationType: "owner" | "guest") => {
      try {
        await axios.post(`/api/whatsapp/conversations/${conversationId}/meta`, {
          conversationType,
        });
        handleUpdateConversation(conversationId, { conversationType });
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

  const archivedConversationIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    archivedConversationIdsRef.current = new Set(archivedConversations.map((c) => c._id));
  }, [archivedConversations]);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    persistActiveConversation(selectedConversation?._id);
    return () => {
      persistActiveConversation(null);
    };
  }, [selectedConversation, persistActiveConversation]);

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
            console.warn("[call] PC closed during inbound ICE gather â€” suppress is ON, skipping cleanup");
          }
          return;
        }
        if (st === "failed") {
          setOutboundCallUi((prev) => (prev ? { ...prev, phase: "failed" } : prev));
          if (suppressPrematureInboundIceCleanupRef.current) {
            console.warn(
              "[call] connectionState failed during inbound answer prep â€” waiting for Meta accept; not closing PC yet",
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
              "[call] ICE failed during inbound answer prep â€” waiting for Meta accept; not closing PC yet",
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
          `[inbound] RTCPeerConnection closed during ICE gathering â€” ` +
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
      // Do NOT play the outbound ring here â€” the call is already live from the
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
          /* ignore â€” best-effort */
        }
      }

      setOutboundCallUi((prev) =>
        prev ? { ...prev, signalingState: pc.signalingState, phase: "ringing" } : prev,
      );
      toast({
        title: "Call answered",
        description: "Connecting audio with the customerâ€¦",
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

  /** RTP / outbound media watchdog â€” Meta drops calls when packetsSent stays ~0. */
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
              "packetsSent is still 0 â€” Meta may disconnect (~20s). Check mic, mute, and console [call-media:periodic] logs.",
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

    console.log("ðŸ”§ Initializing notification controller");

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
        // Toast handled by SystemNotificationToast — do not re-enter socket handler
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




  // Check call permissions on mount
  useEffect(() => {
    const checkCallPermissions = async () => {
      try {
        const response = await axios.get("/api/whatsapp/call");
        if (response.data.success) {
          setCallPermissions({
            canMakeCalls: response.data.canMakeCalls,
          });
        }
      } catch (error) {
        console.error("Failed to check call permissions:", error);
      }
    };
    checkCallPermissions();
  }, []);

  const searchParams = useSearchParams();
  const isRetargetOnly = searchParams?.get("retargetOnly") === "1";
  const retargetOnlyRef = useRef(isRetargetOnly);
  retargetOnlyRef.current = isRetargetOnly;

  const fetchPhoneConfigs = async () => {
    try {
      const response = await axios.get("/api/whatsapp/phone-configs");
      if (response.data.success) {
        const phoneConfigs = response.data.phoneConfigs || [];
        setAllowedPhoneConfigs(phoneConfigs);
        allowedPhoneIdsRef.current = phoneConfigs
          .filter((c: WhatsAppPhoneConfig) => c.phoneNumberId && !c.isInternal)
          .map((c: WhatsAppPhoneConfig) => c.phoneNumberId);

        // Collect channel IDs for dual-room socket subscriptions.
        allowedChannelIdsRef.current = phoneConfigs
          .filter((c: WhatsAppPhoneConfig) => (c as any).channelId && !c.isInternal)
          .map((c: WhatsAppPhoneConfig) => (c as any).channelId as string);
      }
    } catch (error: any) {
      console.error("Error fetching phone configs:", error);
      toast({
        title: "Error",
        description: "Failed to load phone numbers",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPhoneConfigs();
  }, [searchParams]);

  // Load templates from the selected conversation's WABA (short-term vs long-term portfolios).
  useEffect(() => {
    fetchTemplates(selectedConversation?._id ?? null);
  }, [selectedConversation?._id]);

  useEffect(() => {
    const fromUrl = searchParams?.get("locationFilter");
    if (fromUrl) {
      setAdminLocationFilter(fromUrl);
      inboxLocationFilterInitializedRef.current = true;
      return;
    }

    if (!token || inboxLocationFilterInitializedRef.current) return;

    const adminQueueFromUrl = searchParams?.get("adminQueue") === "true";
    if (token.role === "SuperAdmin" && !adminQueueFromUrl) {
      setAdminLocationFilter(SUPERADMIN_DEFAULT_INBOX_LOCATION);
    }

    inboxLocationFilterInitializedRef.current = true;
  }, [token, searchParams]);

  useEffect(() => {
    if (!token) return;
    const privilegeUser = {
      role: token.role,
      email: token.email,
      allotedArea: token.allotedArea,
    };

    if (token.role === "SuperAdmin") {
      let cancelled = false;
      axios
        .get("/api/monthlyTargets/getLocations")
        .then((res) => {
          if (cancelled) return;
          const raw = res.data?.locations;
          const cities: string[] = Array.isArray(raw)
            ? raw
                .map((item: unknown) =>
                  typeof item === "string" ? item : String((item as { city?: string })?.city ?? ""),
                )
                .filter(Boolean)
            : [];
          setAdminLocationOptions([...new Set(cities)].sort((a, b) => a.localeCompare(b)));
        })
        .catch(() => {
          if (!cancelled) setAdminLocationOptions([]);
        });
      return () => {
        cancelled = true;
      };
    }

    if (canUseInboxLocationFilter(privilegeUser)) {
      setAdminLocationOptions(getInboxLocationFilterOptionsForUser(privilegeUser));
    } else {
      setAdminLocationOptions([]);
    }
  }, [token?.role, token?.email, token?.allotedArea]);

  const syncWhatsAppUrlParams = useCallback(
    (patch: { locationFilter?: string; adminQueue?: boolean }) => {
      const next = new URLSearchParams();
      const retargetOnlyFlag = searchParams?.get("retargetOnly");
      const conv =
        searchParams?.get("conversation") || searchParams?.get("conversationId");
      if (retargetOnlyFlag) next.set("retargetOnly", retargetOnlyFlag);
      if (conv) next.set("conversation", conv);

      const queue = patch.adminQueue ?? adminQueue;
      const locFilter = patch.locationFilter ?? adminLocationFilter;

      if (queue) {
        next.set("adminQueue", "true");
      } else if (locFilter && locFilter !== "all") {
        next.set("locationFilter", locFilter);
      }

      const qs = next.toString();
      router.replace(qs ? `/whatsapp?${qs}` : "/whatsapp", { scroll: false });
    },
    [adminQueue, adminLocationFilter, router, searchParams],
  );

  const handleAdminLocationFilterChange = useCallback(
    (value: string) => {
      setAdminLocationFilter(value);
      if (value !== "all") {
        setAdminQueue(false);
      }
      syncWhatsAppUrlParams({ locationFilter: value, adminQueue: false });
    },
    [syncWhatsAppUrlParams],
  );

  // Persist SuperAdmin default (Athens) in the URL when no explicit filter was linked.
  useEffect(() => {
    if (!token || token.role !== "SuperAdmin") return;
    if (searchParams?.get("locationFilter")) return;
    if (searchParams?.get("adminQueue") === "true") return;
    if (adminLocationFilter !== SUPERADMIN_DEFAULT_INBOX_LOCATION) return;
    if (!inboxLocationFilterInitializedRef.current) return;

    syncWhatsAppUrlParams({
      locationFilter: SUPERADMIN_DEFAULT_INBOX_LOCATION,
      adminQueue: false,
    });
  }, [
    token,
    adminLocationFilter,
    searchParams,
    syncWhatsAppUrlParams,
  ]);

  const handleAdminQueueChange = useCallback(
    (value: boolean) => {
      setAdminQueue(value);
      syncWhatsAppUrlParams({ adminQueue: value });
    },
    [syncWhatsAppUrlParams],
  );

  // Legacy links used ?phoneId= — strip it; inbox is unified (location + visibility, not phone tabs).
  useEffect(() => {
    const phoneIdParam = searchParams?.get("phoneId");
    if (!phoneIdParam) return;
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
    if (inboxLocationFilter && inboxLocationFilter !== "all") {
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

  // CRITICAL: Refetch conversations when phone filter, search, or adminQueue changes
  // Database is source of truth - always query backend, never filter client-side
  useEffect(() => {
    if (!token) return;
    const timeoutId = setTimeout(() => {
      fetchConversations(true);
    }, searchQuery.trim() ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, token, adminQueue, adminLocationFilter, labelFilter]);

  // Prefetch archived conversations so the "Archived" row can show unread count without opening archive
  useEffect(() => {
    if (token) {
      fetchArchivedConversations({ silent: true });
    }
  }, [token]);

  useEffect(() => {
    phoneMaskRulesRef.current = phoneMaskRules;
  }, [phoneMaskRules]);

  useEffect(() => {
    viewerRoleRef.current = token?.role || "";
  }, [token?.role]);

  useEffect(() => {
    const fromToken = getWhatsAppPhoneMaskFromToken(token);
    setPhoneMaskRules(fromToken);
    phoneMaskRulesRef.current = fromToken;

    const userId = token?.id || (token as { _id?: string })?._id;
    if (!userId) return;
    let cancelled = false;
    axios
      .get("/api/employee/whatsapp-phone-mask", { params: { employeeId: String(userId) } })
      .then((res) => {
        if (!cancelled && res.data?.whatsappPhoneMask) {
          const rules = res.data.whatsappPhoneMask as WhatsAppPhoneMaskRules;
          setPhoneMaskRules(rules);
          phoneMaskRulesRef.current = rules;
          setConversations((prev) => maskConversationsForViewer(prev, rules, viewerRoleRef.current));
          setArchivedConversations((prev) =>
            maskConversationsForViewer(prev, rules, viewerRoleRef.current),
          );
          setSelectedConversation((prev) =>
            prev ? applyPhoneMaskToConversation(prev, rules, viewerRoleRef.current) : prev,
          );
        }
      })
      .catch(() => {
        /* keep token defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [token?.id, (token as { _id?: string })?._id, token?.whatsappPhoneMask]);

  const canManagePhoneMask =
    token?.role === "HR" || token?.role === "SuperAdmin";

  // Socket.io event listeners
  // CRITICAL: This is the SINGLE canonical place where whatsapp-new-message listener is registered.
  // All other components should NOT register their own listeners to avoid duplicate processing.
  useEffect(() => {
    if (!socket) return;

    // Dev-only safeguard: Count listener registrations
    if (process.env.NODE_ENV === "development") {
      console.count("[WHATSAPP] Registering whatsapp-new-message handler");
    }

    const currentUserId = token?.id || (token as any)?._id;
    socket.emit("join-whatsapp-room", currentUserId?.toString());

    const joinAllAllowedPhones = () => {
      for (const id of allowedPhoneIdsRef.current) {
        if (id) socket.emit("join-whatsapp-phone", id);
      }
    };
    joinAllAllowedPhones();

    let previousUnifiedPhones = new Set(allowedPhoneIdsRef.current);
    const phoneWatcher = setInterval(() => {
      const currentSet = new Set(allowedPhoneIdsRef.current);
      for (const id of previousUnifiedPhones) {
        if (!currentSet.has(id)) socket.emit("leave-whatsapp-phone", id);
      }
      for (const id of currentSet) {
        if (!previousUnifiedPhones.has(id)) socket.emit("join-whatsapp-phone", id);
      }
      previousUnifiedPhones = currentSet;
    }, 500);

    // Dual-room: also join stable channel rooms so events survive number migrations.
    const joinAllChannelRooms = () => {
      for (const id of allowedChannelIdsRef.current) {
        if (id) socket.emit("join-whatsapp-channel", id);
      }
    };
    joinAllChannelRooms();

    let previousChannelIds = new Set(allowedChannelIdsRef.current);
    const channelWatcher = setInterval(() => {
      const currentSet = new Set(allowedChannelIdsRef.current);
      for (const id of previousChannelIds) {
        if (!currentSet.has(id)) socket.emit("leave-whatsapp-channel", id);
      }
      for (const id of currentSet) {
        if (!previousChannelIds.has(id)) socket.emit("join-whatsapp-channel", id);
      }
      previousChannelIds = currentSet;
    }, 500);

    const role = token?.role || "";
    const isFullAccessRole = (FULL_ACCESS_ROLES as readonly string[]).includes(role);
    const retargetPhoneId = getRetargetPhoneId();
    if ((role === "Advert" || role === "SuperAdmin") && retargetPhoneId) {
      socket.emit("join-whatsapp-retarget", retargetPhoneId);
    }

    // Stable handler function - prevents re-attachment on re-render
    const handleWhatsAppMessage = (data: any) => {
      const currentUserId = token?.id || (token as any)?._id;

      // Strong per-tab deduplication: ensure each eventId is processed at most once.
      // This protects the chat UI from any backend retries or duplicate socket emits.
      if (data.eventId) {
        if (seenEventIdsRef.current.has(data.eventId)) {
          return;
        }
        addToLRUSet(seenEventIdsRef.current, data.eventId);
      }

      if (data.userId && currentUserId && String(data.userId) !== String(currentUserId)) {
        return;
      }

      const currentPhoneId = selectedPhoneIdRef.current;
      const currentConversation = selectedConversationRef.current;
      const isForCurrentConversation = currentConversation?._id === data.conversationId;
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
        addToLRUSet(seenMessageIdsRef.current, message.messageId);

        setMessages((prev) => {
          if (message.type === "reaction" && message.reactedToMessageId) {
            return prev.map((msg) => {
              if (msg.messageId === message.reactedToMessageId) {
                const existingReactions = msg.reactions || [];
                const reactionEmoji =
                  message.reactionEmoji ||
                  message.content?.text?.replace("Reacted: ", "") ||
                  "👍";
                const hasReaction = existingReactions.some(
                  (r) =>
                    r.emoji === reactionEmoji && r.direction === message.direction,
                );
                if (!hasReaction) {
                  return {
                    ...msg,
                    reactions: [
                      ...existingReactions,
                      { emoji: reactionEmoji, direction: message.direction },
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
                      messageId: message.messageId,
                      content: message.content ?? m.content,
                      mediaUrl: message.mediaUrl ?? m.mediaUrl,
                      timestamp: new Date(message.timestamp),
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
              messageId: message.messageId,
              from: message.from,
              to: message.to,
              type: message.type,
              content: message.content,
              mediaUrl: message.mediaUrl,
              timestamp: new Date(message.timestamp),
              status: message.status,
              direction: message.direction,
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
        setConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv._id === conversationId) {
              const newUnreadCount =
                isIncomingMessage && !isCurrentConversation
                  ? (conv.unreadCount || 0) + 1
                  : isCurrentConversation
                    ? 0
                    : conv.unreadCount || 0;

              return {
                ...conv,
                lastMessageContent: displayText,
                lastMessageTime: message.timestamp,
                lastMessageDirection: message.direction,
                lastMessageId: message.messageId,
                lastMessageStatus: outgoingStatus,
                unreadCount: newUnreadCount,
                ...(isIncomingMessage
                  ? {
                      lastCustomerMessageAt: new Date(message.timestamp),
                      ...(data.businessPhoneId
                        ? {
                            lastCustomerMessageAtByPhone: {
                              ...(conv.lastCustomerMessageAtByPhone ?? {}),
                              [String(data.businessPhoneId)]: new Date(
                                message.timestamp,
                              ).toISOString(),
                            },
                          }
                        : {}),
                    }
                  : {}),
              };
            }
            return conv;
          });

          const newTotalUnread = updated.reduce(
            (sum, conv) => sum + (conv.unreadCount || 0),
            0,
          );
          setTotalUnreadCount(newTotalUnread);

          return sortConversations(updated);
        });

        setArchivedConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv._id === conversationId) {
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
                setArchivedUnreadCount((c) => c + 1);
              }
              return {
                ...conv,
                lastMessageContent: displayText,
                lastMessageTime: message.timestamp,
                lastMessageDirection: message.direction,
                lastMessageId: message.messageId,
                lastMessageStatus: outgoingStatus,
                unreadCount: newUnreadCount,
              };
            }
            return conv;
          });

          return sortConversations(updated);
        });

        if (isCurrentConversation) {
          setSelectedConversation((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              lastMessageTime: message.timestamp,
              lastMessageId: message.messageId,
              lastMessageStatus: outgoingStatus,
              ...(isIncomingMessage
                ? {
                    lastCustomerMessageAt: new Date(message.timestamp),
                    ...(data.businessPhoneId
                      ? {
                          lastCustomerMessageAtByPhone: {
                            ...(prev.lastCustomerMessageAtByPhone ?? {}),
                            [String(data.businessPhoneId)]: new Date(
                              message.timestamp,
                            ).toISOString(),
                          },
                        }
                      : {}),
                  }
                : {}),
            };
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

      getWhatsAppNotificationController().process(data);
    };

    socket.on("whatsapp-new-message", handleWhatsAppMessage);

    return () => {
      socket.off("whatsapp-new-message", handleWhatsAppMessage);
      clearInterval(phoneWatcher);
      clearInterval(channelWatcher);
      if (retargetPhoneId) {
        socket.emit("leave-whatsapp-retarget", retargetPhoneId);
      }
    };
  }, [socket, token, playNotificationSound]);

  // Socket.io event listeners - other events (new conversations, status updates, etc.)
  useEffect(() => {
    if (!socket) return;

    const currentUserId = token?.id || (token as { _id?: string })?._id;
    const isFullAccessRole = (FULL_ACCESS_ROLES as readonly string[]).includes(
      token?.role || "",
    );

    // Handle new conversations
    const handleNewConversation = (data: any) => {
      const { conversation } = data;
      setConversations((prev) => {
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
        const updated = [newConversation, ...prev];
        const newTotalUnread = updated.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setTotalUnreadCount(newTotalUnread);
        return updated;
      });
      toast({
        title: "New conversation",
        description: `${conversation.participantName} started a chat`,
      });
      playNotificationSound();
    };

    const handleMessageStatus = (data: any) => {
      const { conversationId, messageId, status } = data;
      const currentConversation = selectedConversationRef.current;
      if (currentConversation?._id === conversationId) {
        setMessages((prev) => {
          const idx = prev.findIndex((msg) => msg.messageId === messageId);
          if (idx === -1 || prev[idx].status === status) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status };
          return updated;
        });
      }
      
      setConversations((prev) => {
        const idx = prev.findIndex(
          (conv) =>
            conv._id === conversationId &&
            (conv.lastMessageId === messageId || !conv.lastMessageId),
        );
        if (idx === -1 || prev[idx].lastMessageStatus === status) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], lastMessageStatus: status, lastMessageId: messageId };
        return updated;
      });
    };

    const handleMessageEcho = (data: any) => {
      const { conversationId, message } = data;
      const currentConversation = selectedConversationRef.current;

      if (seenMessageIdsRef.current.has(message.messageId)) return;
      addToLRUSet(seenMessageIdsRef.current, message.messageId);

      const displayText = typeof message.content === "string" 
        ? message.content 
        : message.content?.text || message.content?.caption || `${message.type} message`;

      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessageContent: displayText,
              lastMessageTime: message.timestamp,
              lastMessageDirection: message.direction,
              lastMessageId: message.messageId || message.id,
              lastMessageStatus:
                message.direction === "outgoing"
                  ? (message.status as Message["status"]) || "sent"
                  : undefined,
            };
          }
          return conv;
        });
        return sortConversations(updated);
      });

      if (currentConversation?._id === conversationId) {
        setMessages((prev) => {
          const exists = prev.find((m) => m.messageId === message.messageId);
          if (exists) return prev;
          return [
            ...prev,
            {
              _id: message._id || message.id,
              messageId: message.messageId,
              from: message.from,
              to: message.to,
              type: message.type,
              content: message.content,
              mediaUrl: message.mediaUrl,
              timestamp: new Date(message.timestamp),
              status: message.status,
              direction: message.direction,
              isEcho: true,
            },
          ];
        });
      }
    };

    // Register all socket listeners
    socket.on("whatsapp-new-conversation", handleNewConversation);
    socket.on("whatsapp-message-status", handleMessageStatus);
    socket.on("whatsapp-message-echo", handleMessageEcho);
    socket.on("whatsapp-incoming-call", (data: any) => {
      if (data.userId && currentUserId && String(data.userId) !== String(currentUserId)) {
        return;
      }
      const name = data.callerInfo?.profile?.name || data.from || "Caller";
      const callIdStr = data.callId != null ? String(data.callId) : "";
      toast({
        title: "ðŸ“ž Incoming Call",
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
    });

    socket.on("whatsapp-call-incoming-offer", (data: Record<string, unknown>) => {
      if (data.userId && currentUserId && String(data.userId) !== String(currentUserId)) {
        return;
      }
      const phoneId = data.businessPhoneId != null ? String(data.businessPhoneId) : "";
      const selectedPid = selectedPhoneIdRef.current;
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
        phoneId.trim() || (selectedPhoneIdRef.current != null ? String(selectedPhoneIdRef.current).trim() : "");
      if (!resolvedPhoneId) {
        toast({
          title: "Incoming WhatsApp call",
          description: "Could not determine which business line this call is for. Select the correct WhatsApp number in the sidebar.",
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
        (data.callerInfo as { profile?: { name?: string } } | undefined)?.profile?.name ||
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
        title: "ðŸ“ž Incoming call",
        description: `${contactLabelRaw} is calling. Tap Answer to connect.`,
        duration: 12_000,
      });
      playNotificationSound();
      showDesktopNotification({
        title: "Incoming WhatsApp call",
        body: `${contactLabelRaw} is calling â€” tap to answer in the app`,
        tag: `wa-incoming-${callId}`,
        requireInteraction: true,
      });
    });

    // Handle missed calls
    socket.on("whatsapp-call-missed", (data: any) => {
      if (data.userId && currentUserId && String(data.userId) !== String(currentUserId)) {
        return;
      }
      toast({
        title: "ðŸ“ž Missed Call",
        description: `Missed call from ${data.from}`,
        variant: "destructive",
      });
    });

    // Handle call status updates (Meta / WhatsApp Calling statuses)
    socket.on("whatsapp-call-status", (data: { callId?: string; callStatus?: string; userId?: string }) => {
      if (data.userId && currentUserId && String(data.userId) !== String(currentUserId)) {
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
    });

    // SDP answer for business-initiated calls
    socket.on("whatsapp-call-sdp-answer", async (data: Record<string, unknown>) => {
      if (data.userId && currentUserId && String(data.userId) !== String(currentUserId)) {
        return;
      }
      try {
        const convId = data?.conversationId != null ? String(data.conversationId) : "";
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
          if (prev.phase === "connecting") return { ...prev, phase: "ringing", signalingState: pc.signalingState };
          return { ...prev, signalingState: pc.signalingState };
        });

        try {
          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
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
            setOutboundCallUi((prev) => (prev ? { ...prev, phase: "connected" } : prev));
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
    });

    // Handle history sync events
    socket.on("whatsapp-history-sync", (data: any) => {
      console.log("History sync:", data);
      if (data.status === "completed") {
        toast({
          title: "ðŸ“œ History Sync Complete",
          description: `${data.messagesCount} messages synced`,
        });
        // Refresh conversations after history sync
        fetchConversations();
      }
    });

    // Handle app state sync events
    socket.on("whatsapp-app-state-sync", (data: any) => {
      console.log("App state sync:", data);
    });

    // Handle conversation read events (when someone reads a conversation)
    socket.on("whatsapp-conversation-read", (data: any) => {
      const { conversationId, userId } = data;
      const currentConversation = selectedConversationRef.current;

      const currentUserId = token?.id || (token as any)?._id;

      // Only refetch readers when someone else read the open chat (not our own mark-read).
      if (
        currentConversation?._id === conversationId &&
        currentUserId &&
        String(userId) !== String(currentUserId)
      ) {
        setReadersRefreshToken((prev) => prev + 1);
      }

      // If this read event is for the current logged-in user, clear unread
      // state for that conversation across all tabs/devices (both main and archived).
      if (currentUserId && String(userId) === String(currentUserId)) {
        setConversations((prev) => {
          const updated = prev.map((conv) =>
            conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
          );
          
          // Update total unread count in real-time (socket-based)
          const newTotalUnread = updated.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
          setTotalUnreadCount(newTotalUnread);
          
          return updated;
        });

        // Also clear unread count for archived conversations
        setArchivedConversations((prev) => {
          const conv = prev.find((c) => c._id === conversationId);
          // Decrement unread chat count by 1 if this conversation had unread messages
          // (it's no longer an unread chat)
          if (conv && (conv.unreadCount || 0) > 0) {
            setArchivedUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.map((c) =>
            c._id === conversationId ? { ...c, unreadCount: 0 } : c
          );
        });
      }
    });

    // Handle conversation update events (archive/unarchive, etc.)
    socket.on("whatsapp-conversation-update", (data: any) => {
      const { conversationId, isArchived, archivedAt, archivedBy } = data;
      
      // Update conversation archive state in real-time (global archive)
      if (conversationId && typeof isArchived === "boolean") {
        setConversations((prev) =>
          prev.map((conv) =>
            conv._id === conversationId
              ? {
                  ...conv,
                  isArchivedByUser: isArchived,
                  archivedAt: archivedAt ? new Date(archivedAt) : undefined,
                  archivedBy: archivedBy,
                }
              : conv
          )
        );

        // If conversation was archived and we're viewing it, close it
        if (isArchived && selectedConversation?._id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }

        fetchConversations().catch(() => {});
      }
    });

    return () => {
      socket.emit("leave-whatsapp-room");
      socket.off("whatsapp-new-conversation", handleNewConversation);
      socket.off("whatsapp-message-status", handleMessageStatus);
      socket.off("whatsapp-message-echo", handleMessageEcho);
      socket.off("whatsapp-incoming-call");
      socket.off("whatsapp-call-incoming-offer");
      socket.off("whatsapp-call-missed");
      socket.off("whatsapp-call-status");
      socket.off("whatsapp-call-sdp-answer");
      socket.off("whatsapp-history-sync");
      socket.off("whatsapp-app-state-sync");
      socket.off("whatsapp-conversation-read");
      socket.off("whatsapp-conversation-update");
    };
  }, [socket, toast, token, playNotificationSound, selectedConversation, cleanupOutboundCallResources]);


  // Fetch conversation counts from database
  const fetchConversationCounts = async () => {
    try {
      const countsParams = new URLSearchParams();
      if (retargetOnlyRef.current) {
        countsParams.append("retargetOnly", "1");
      }
      const privilegeUser = {
        role: token?.role,
        email: token?.email,
        allotedArea: token?.allotedArea,
      };
      if (
        !adminQueue &&
        adminLocationFilter &&
        adminLocationFilter !== "all" &&
        (token?.role === "SuperAdmin" || canUseInboxLocationFilter(privilegeUser))
      ) {
        countsParams.append("locationFilter", adminLocationFilter);
      }
      const response = await axios.get(`/api/whatsapp/conversations/counts?${countsParams.toString()}`);
      if (response.data.success) {
        setConversationCounts({
          totalCount: response.data.totalCount || 0,
          ownerCount: response.data.ownerCount || 0,
          guestCount: response.data.guestCount || 0,
        });
      }
    } catch (error: any) {
      console.error("Error fetching conversation counts:", error);
    }
  };

  const fetchConversations = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setConversationsCursor(null);
        setHasMoreConversations(true);
      } else {
        setLoadingMoreConversations(true);
      }

      const params = new URLSearchParams();
      params.append("limit", "25");
      // Inbox is unified — visibility filter on the server (areas/lines), not ?phoneId=
      // CRITICAL: Pass search query to backend - database is source of truth, no client-side filtering
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
        // When searching, don't use cursor (search results start fresh)
      } else if (conversationsCursor && !reset) {
        // Only use cursor when not searching (pagination)
        params.append("cursor", conversationsCursor);
      }
      // Retarget-only mode: only fetch retarget conversations (for Advert role)
      if (retargetOnlyRef.current) {
        params.append("retargetOnly", "1");
      }
      // Admin Queue mode: conversations without a location key
      if (labelFilter && labelFilter !== "all") {
        params.append("labelFilter", labelFilter);
      }
      if (adminQueue) {
        params.append("adminQueue", "true");
      } else {
        const privilegeUser = {
          role: token?.role,
          email: token?.email,
          allotedArea: token?.allotedArea,
        };
        if (
          adminLocationFilter &&
          adminLocationFilter !== "all" &&
          (token?.role === "SuperAdmin" || canUseInboxLocationFilter(privilegeUser))
        ) {
          params.append("locationFilter", adminLocationFilter);
        }
      }

      const response = await axios.get(`/api/whatsapp/conversations?${params.toString()}`);
      if (response.data.success) {
        const rulesFromApi = response.data.phoneMaskRules as WhatsAppPhoneMaskRules | undefined;
        if (rulesFromApi) {
          setPhoneMaskRules(rulesFromApi);
          phoneMaskRulesRef.current = rulesFromApi;
        }
        const newConversations = maskConversationListForViewer(
          (response.data.conversations || []) as Conversation[],
        );
        
        // Update archived count from response
        if (response.data.archivedCount !== undefined) {
          setArchivedCount(response.data.archivedCount);
        }
        
        if (reset) {
          // Deduplicate even on reset in case of any issues
          let uniqueConversations = Array.from(
            new Map(newConversations.map((c: Conversation) => [c._id, c])).values()
          ) as Conversation[];
          // Keep the open chat visible if the list refresh omitted it (e.g. pagination cap)
          if (selectedConversation?._id) {
            const openId = String(selectedConversation._id);
            if (!uniqueConversations.some((c) => String(c._id) === openId)) {
              uniqueConversations = sortConversations([
                selectedConversation,
                ...uniqueConversations,
              ]);
            }
          }
          setConversations(uniqueConversations);
          
          // Calculate total unread count from fetched conversations (socket-based)
          const totalUnread = uniqueConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
          setTotalUnreadCount(totalUnread);
        } else {
          // Filter out duplicates by _id when appending
          setConversations((prev) => {
            const existingIds = new Set(prev.map((c) => c._id));
            const uniqueNewConversations = newConversations.filter(
              (c: Conversation) => !existingIds.has(c._id)
            );
            const updated = [...prev, ...uniqueNewConversations];
            
            // Calculate total unread count from all conversations (socket-based)
            const totalUnread = updated.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
            setTotalUnreadCount(totalUnread);
            
            return updated;
          });
        }

        // NOTE: Phone configs are now loaded independently via /api/whatsapp/phone-configs
        // We no longer update phone configs from conversation responses
        // This ensures clean separation: phone configs are source of truth, conversations consume them

        // Update cursor and hasMore
        setHasMoreConversations(response.data.pagination?.hasMore || false);
        setConversationsCursor(response.data.pagination?.nextCursor || null);

        // Fetch counts after loading conversations
        await fetchConversationCounts();

        return newConversations;
      }
      return [];
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
      setLoadingMoreConversations(false);
    }
  };

  const fetchMessages = async (conversationId: string, reset = true) => {
    const fetchGen = ++messagesFetchGenRef.current;
    try {
      if (reset) {
        setMessagesLoading(true);
        setMessagesCursor(null);
        setHasMoreMessages(false);
        setMessages([]);
      } else {
        setLoadingOlderMessages(true);
      }

      const params = new URLSearchParams();
      params.append("limit", "20");
      if (messagesCursor && !reset) {
        params.append("beforeMessageId", messagesCursor.messageId);
      }

      const response = await axios.get(
        `/api/whatsapp/conversations/${conversationId}/messages?${params.toString()}`
      );
      if (fetchGen !== messagesFetchGenRef.current) return;

      if (response.data.success) {
        const newMessages: Message[] = response.data.messages || [];

        if (reset) {
          setMessages((prev) => {
            if (prev.length === 0) return newMessages;
            const byId = new Map<string, Message>();
            for (const msg of newMessages) {
              if (msg.messageId) byId.set(msg.messageId, msg);
            }
            for (const msg of prev) {
              if (msg.messageId && !byId.has(msg.messageId)) {
                byId.set(msg.messageId, msg);
              }
            }
            return Array.from(byId.values()).sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            );
          });
        } else {
          setMessages((prev) => [...newMessages, ...prev]);
        }

        setHasMoreMessages(response.data.pagination?.hasMore || false);
        setMessagesCursor(response.data.pagination?.nextCursor || null);
      }
    } catch (error: unknown) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      if (fetchGen === messagesFetchGenRef.current) {
        setMessagesLoading(false);
        setLoadingOlderMessages(false);
      }
    }
  };

  const loadOlderMessages = () => {
    if (selectedConversation && messagesCursor && !loadingOlderMessages) {
      fetchMessages(selectedConversation._id, false);
    }
  };

  // =========================================================
  // Archive Functionality (WhatsApp-style per-user archive)
  // =========================================================
  
  /**
   * Fetch archived conversations for the current user.
   * @param opts.silent - If true, do not set loading state (used for prefetching badge count).
   */
  const fetchArchivedConversations = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/api/whatsapp/conversations/archive");
      if (response.data.success) {
        const rulesFromApi = response.data.phoneMaskRules as WhatsAppPhoneMaskRules | undefined;
        if (rulesFromApi) {
          setPhoneMaskRules(rulesFromApi);
          phoneMaskRulesRef.current = rulesFromApi;
        }
        const conversations = maskConversationListForViewer(
          (response.data.conversations || []) as Conversation[],
        );
        setArchivedConversations(conversations);
        setArchivedCount(response.data.count || 0);
        // Count unread chats (conversations with unread messages) instead of total unread messages
        const unreadChatCount = conversations.filter(
          (c: Conversation) => (c.unreadCount || 0) > 0 && c.lastMessageDirection === "incoming"
        ).length;
        setArchivedUnreadCount(unreadChatCount);
        const ids = conversations.map((c: any) => c._id) || [];
        syncArchivedStorage(ids.filter(Boolean));
      }
    } catch (error: any) {
      console.error("Error fetching archived conversations:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to fetch archived conversations",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /**
   * Archive a conversation for the current user
   * WhatsApp-style: removes from main inbox, suppresses notifications
   */
  const archiveConversation = async (conversationId: string) => {
    try {
      const response = await axios.post("/api/whatsapp/conversations/archive", {
        conversationId,
      });
      
      if (response.data.success) {
        archivedConversationIdsRef.current.add(conversationId);
        setConversations((prev) => prev.filter((c) => c._id !== conversationId));
        setArchivedCount((prev) => prev + 1);
        syncArchivedStorage([
          ...archivedConversations.map((c) => c._id),
          conversationId,
        ]);
        
        // If the archived conversation was selected, deselect it
        if (selectedConversation?._id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }
        
        toast({
          title: "Chat archived",
          description: "This chat has been archived. You can find it in the Archived section.",
        });
        // Refresh archived list so sidebar badge shows updated unread count
        fetchArchivedConversations({ silent: true });
      }
    } catch (error: any) {
      console.error("Error archiving conversation:", error);
      toast({
        title: "Error",
        description: "Failed to archive conversation",
        variant: "destructive",
      });
    }
  };

  /**
   * Unarchive a conversation for the current user
   * WhatsApp-style: returns to main inbox, notifications resume
   */
  const unarchiveConversation = async (conversationId: string) => {
    try {
      const response = await axios.delete(
        `/api/whatsapp/conversations/archive?conversationId=${conversationId}`
      );
      
      if (response.data.success) {
        archivedConversationIdsRef.current.delete(conversationId);
        setArchivedConversations((prev) => prev.filter((c) => c._id !== conversationId));
        setArchivedCount((prev) => Math.max(0, prev - 1));
        syncArchivedStorage(
          archivedConversations
            .filter((c) => c._id !== conversationId)
            .map((c) => c._id)
        );
        
        // Refresh main conversations to include the unarchived one
        await fetchConversations(true);
        
        toast({
          title: "Chat unarchived",
          description: "This chat has been restored to your inbox.",
        });
      }
    } catch (error: any) {
      console.error("Error unarchiving conversation:", error);
      toast({
        title: "Error",
        description: "Failed to unarchive conversation",
        variant: "destructive",
      });
    }
  };

  /**
   * Toggle between main inbox and archived view
   */
  const toggleArchiveView = () => {
    if (showingArchived) {
      // Going back to main inbox
      setShowingArchived(false);
      fetchConversations(true);
    } else {
      // Showing archived
      setShowingArchived(true);
      fetchArchivedConversations();
    }
    // Clear selection when switching views
    setSelectedConversation(null);
    setMessages([]);
  };

  const fetchTemplates = async (conversationId?: string | null) => {
    try {
      setTemplatesLoading(true);
      const params: Record<string, string> = {};
      if (conversationId) {
        params.conversationId = conversationId;
      }
      const response = await axios.get("/api/whatsapp/templates", { params });
      if (response.data.success) {
        setTemplates(response.data.templates);
        setTemplatesChannelScoped(Boolean(response.data.channelScoped));
      }
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch message templates",
        variant: "destructive",
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  const selectConversation = (conversation: Conversation | null) => {
    setReplyToMessage(null); // Clear any pending reply when switching conversations

    if (conversation) {
      const isSameConversation =
        selectedConversationRef.current?._id === conversation._id;
      const alreadyRead =
        (conversation.unreadCount || 0) === 0 &&
        conversation.lastMessageDirection !== "incoming";

      if (isSameConversation && alreadyRead) {
        return;
      }

      setSelectedConversation(maskConversationForViewer(conversation));

      if (!isSameConversation) {
        fetchMessages(conversation._id, true);

        if (isMobile) {
          navigateToChat();
        }
      }

      const shouldMarkRead =
        (conversation.unreadCount || 0) > 0 ||
        conversation.lastMessageDirection === "incoming";
      if (shouldMarkRead) {
        void markConversationAsRead(conversation._id, {
          lastMessageId: conversation.lastMessageId,
        });
      }

      const currentConvParam =
        searchParams?.get("conversation") || searchParams?.get("conversationId");
      if (!isSameConversation || currentConvParam !== conversation._id) {
        const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
        router.push(`/whatsapp?conversation=${conversation._id}${suffix}`, { scroll: false });
      }
    } else {
      setSelectedConversation(null);
      // Navigate back to sidebar on mobile when clearing selection
      if (isMobile) {
        setMobileView("conversations");
      }
      
      const suffixClear = retargetOnlyRef.current ? "?retargetOnly=1" : "";
      router.push(`/whatsapp${suffixClear}`, { scroll: false });
    }
  };

  const handleGuestAdded = async (conversationId: string, conversation?: Conversation) => {
    try {
      // New owners have a location key — they never belong in Admin Queue
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

      const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";

      if (newConversation) {
        const id = String(newConversation._id);
        setConversations((prev) => {
          const without = prev.filter((c) => c._id !== id);
          return sortConversations([newConversation!, ...without]);
        });

        selectConversation(newConversation);
        router.push(`/whatsapp?conversation=${id}${suffix}`, { scroll: false });
      } else {
        router.push(`/whatsapp?conversation=${conversationId}${suffix}`, { scroll: false });
      }
    } catch (error) {
      console.error("Error handling guest added:", error);
      const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
      router.push(`/whatsapp?conversation=${conversationId}${suffix}`, { scroll: false });
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
    const cacheKey = `${phoneParam}_${locationParam}_${openType ?? ""}`;
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
              { params: { location: locationParam } },
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

        const convs = await fetchConversations();
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
              // non-blocking — still open the thread
            }
          }
          setConversations((prev) => {
            const exists = prev.find((c) => c._id === conversationToOpen._id);
            if (exists) {
              return sortConversations(
                prev.map((c) =>
                  c._id === conversationToOpen._id ? conversationToOpen : c,
                ),
              );
            }
            return sortConversations([conversationToOpen, ...prev]);
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
            ...(profilePicParam ? { participantProfilePic: profilePicParam } : {}),
          });
          if (createRes.data.success) {
            const conversation = createRes.data.conversation as Conversation;
            setConversations((prev) => {
              const exists = prev.find((c) => c._id === conversation._id);
              if (exists) {
                return sortConversations(
                  prev.map((c) => (c._id === conversation._id ? conversation : c)),
                );
              }
              return sortConversations([conversation, ...prev]);
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
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");
    setReplyToMessage(null); // Clear reply after sending

    // Immediately update conversation list optimistically
    setConversations((prev) => {
      const exists = prev.find((c) => c._id === selectedConversation._id);
      if (exists) {
        const updated = prev.map((conv) =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessageContent: messageContent,
                lastMessageTime: sendTimestamp,
                lastMessageDirection: "outgoing",
                lastMessageId: tempId,
                lastMessageStatus: "sending" as const,
              }
            : conv
        );
        return sortConversations(updated);
      } else {
        const newConv = {
          ...selectedConversation,
          lastMessageContent: messageContent,
          lastMessageTime: sendTimestamp,
          lastMessageDirection: "outgoing",
        };
        return sortConversations([newConv, ...prev]);
      }
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

        setMessages((prev) => {
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

        setConversations((prev) =>
          prev.map((conv) =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  lastMessageId: realMessageId,
                  lastMessageStatus: "sent" as const,
                }
              : conv,
          ),
        );

        // Mark this messageId as seen to avoid duplicate processing
        try {
          addToLRUSet(seenMessageIdsRef.current, response.data.messageId);
        } catch (e) {}
      }
    } catch (error: any) {
      setMessages((prev) =>
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
    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation list optimistically
    const templatePreview = templateDisplayText.substring(0, 50) + (templateDisplayText.length > 50 ? "..." : "");
    setConversations((prev) => {
      const exists = prev.find((c) => c._id === selectedConversation._id);
      if (exists) {
        const updated = prev.map((conv) =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessageContent: templatePreview,
                lastMessageTime: sendTimestamp,
                lastMessageDirection: "outgoing",
              }
            : conv
        );
        return sortConversations(updated);
      } else {
        const newConv = {
          ...selectedConversation,
          lastMessageContent: templatePreview,
          lastMessageTime: sendTimestamp,
          lastMessageDirection: "outgoing",
        };
        return sortConversations([newConv, ...prev]);
      }
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

        setMessages((prev) => {
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
      setMessages((prev) =>
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
        "Use the + person icon → Owner or Guest and pick a city, or open the contact from a lead.",
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
  const handleReactMessage = async (message: Message, emoji: string = "ðŸ‘") => {
    if (!selectedConversation || !message.messageId) return;

    // Optimistically add reaction to the message
    setMessages((prev) =>
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
      setMessages((prev) =>
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
        await fetchConversations(true);
        
        // Find and select the transferred/merged conversation
        const finalConversationId = response.data.conversationId;
        const finalConv = conversations.find(
          (c) => c._id === finalConversationId
        );
        
        if (finalConv) {
          selectConversation(finalConv);
          // Also refresh messages for the new conversation
          await fetchMessages(finalConv._id);
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
      const mediaDisplayText = `ðŸ“Ž ${file.name}`;

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
      setMessages((prev) => [...prev, tempMsg]);

      // Update conversation list optimistically
      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessageContent: mediaDisplayText,
                lastMessageTime: sendTimestamp,
                lastMessageDirection: "outgoing",
              }
            : conv
        );
        return sortConversations(updated);
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
        // Send via send-media API using Bunny URL
        const sendResponse = await axios.post("/api/whatsapp/send-media", {
          to: selectedConversation.participantPhone,
          conversationId: selectedConversation._id,
          mediaType: mediaType,
          mediaUrl: bunnyUrl, // Use Bunny CDN URL directly
          filename: filename || file.name,
        });

        if (sendResponse.data.success) {
          setMessages((prev) =>
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
        setMessages((prev) =>
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
    const mediaDisplayText = captionText ? `ðŸ“Ž ${captionText}` : `ðŸ“Ž ${file.name}`;
    
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
    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation list optimistically
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === selectedConversation._id
          ? {
              ...conv,
              lastMessageContent: mediaDisplayText,
              lastMessageTime: sendTimestamp,
              lastMessageDirection: "outgoing",
            }
          : conv
      );
      return sortConversations(updated);
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
              setMessages((prev) =>
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

      // Update temp message with Bunny URL
      setMessages((prev) =>
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
        setMessages((prev) =>
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
      console.error("âŒ File upload error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        fileType: mediaType,
        fileName: file.name,
        fileSize: file.size,
      });
      setMessages((prev) =>
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
    const mediaDisplayText = caption || `ðŸ“· ${file.name}`;
    
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
    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation list optimistically
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === selectedConversation._id
          ? {
              ...conv,
              lastMessageContent: mediaDisplayText,
              lastMessageTime: sendTimestamp,
              lastMessageDirection: "outgoing",
            }
          : conv
      );
      return sortConversations(updated);
    });

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
              setMessages((prev) =>
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

      // Update temp message with Bunny URL
      setMessages((prev) =>
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
        setMessages((prev) =>
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
      console.error("âŒ Image send error:", error);
      setMessages((prev) =>
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
      setMessages((prev) => [...prev, tempMsg]);
    });

    // Update conversation list optimistically
    const mediaDisplayText = `ðŸ“· ${files.length} image${files.length > 1 ? 's' : ''}`;
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === selectedConversation._id
          ? {
              ...conv,
              lastMessageContent: mediaDisplayText,
              lastMessageTime: sendTimestamp,
              lastMessageDirection: "outgoing",
            }
          : conv
      );
      return sortConversations(updated);
    });

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
                  setMessages((prev) =>
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

          // Update temp message with Bunny URL
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === tempId ? { ...msg, mediaUrl: bunnyUrl } : msg
            )
          );

          // Send the image via WhatsApp API
          const sendResponse = await axios.post("/api/whatsapp/send-media", {
            to: selectedConversation.participantPhone,
            conversationId: selectedConversation._id,
            mediaType: "image",
            mediaUrl: bunnyUrl,
            filename: bunnyFilename || file.name,
          });

          if (sendResponse.data.success) {
            setMessages((prev) =>
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
          console.error(`âŒ Image ${index + 1} upload error:`, error);
          setMessages((prev) =>
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
    if (!selectedConversation || !callPermissions.canMakeCalls) return;

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

      // Wait for ICE gathering (resolves on complete OR timeout â€” never rejects).
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
          `[outbound] RTCPeerConnection closed during ICE gathering â€” ` +
            `signalingState=${pc.signalingState} connectionState=${pc.connectionState} ` +
            `iceConnectionState=${pc.iceConnectionState}. ` +
            `Possible causes: premature cleanup, TURN auth rejected, or browser closed PC.`,
        );
      }

      logWebRtcMediaDiagnostics(pc, "post-ICE-gather");

      // Build a fresh minimal RFC 8866 SDP from Chrome's local description.  This drops
      // all Chrome-only attributes (extmap, rtcp-fb, â€¦) and filters ICE candidates so we
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
        title: "ðŸ“ž Callingâ€¦",
        description: "Call initiated. Waiting for SDP answerâ€¦",
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
    setMessages([]);
    navigateToConversations();
  }, [navigateToConversations]);

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[#f0f2f5] dark:bg-[#0b141a] overflow-x-hidden">
        {/* WhatsApp-style header - responsive */}
        <div className={cn(
          "bg-[#008069] dark:bg-[#202c33] flex items-center shadow-sm flex-shrink-0",
          "h-[50px] px-4",
          "md:h-[50px] md:px-4",
          // Safe area for iOS
          "pt-[env(safe-area-inset-top,0px)]"
        )}>
          <h1 className="text-white font-semibold text-base md:text-lg">Chat</h1>
          <Link
            href="/whatsapp/calls"
            className="ml-3 text-xs font-medium text-white/85 underline-offset-2 hover:text-white hover:underline md:text-sm"
          >
            Call history
          </Link>
          <div className="flex-1" />
          {/* User info - hidden on mobile, shown on tablet+ */}
          <div className="text-white/80 text-sm hidden md:block">
            {token?.name} &bull; {token?.role}
          </div>
        </div>

        {isDesktopNotificationSupported() &&
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
            {/* Conversation Sidebar - Full screen on mobile, fixed width on desktop */}
            <div className={cn(
              // Base: Always flex, full height; min-w-0 so content fits without overflow
              "flex flex-col h-full min-w-0 flex-shrink-0",
              // Mobile: Full screen width, hidden when chat is open
              "w-full max-w-full",
              isMobile && mobileView === "chat" && "hidden",
              // Tablet and up: Fixed sidebar width
              "md:w-[340px] md:min-w-[280px] md:max-w-[340px]",
              "lg:w-[600px] lg:min-w-[340px] lg:max-w-[600px]",
              // Transition for smooth view changes
              "transition-all duration-200 ease-out"
            )}>
              <ConversationSidebar
              conversations={showingArchived ? archivedConversations : conversations}
              selectedConversation={selectedConversation}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              loading={loading}
              newCountryCode={newCountryCode}
              onCountryCodeChange={setNewCountryCode}
              newPhoneNumber={newPhoneNumber}
              onPhoneNumberChange={setNewPhoneNumber}
              onStartConversation={startNewConversation}
              onSelectConversation={selectConversation}
              isConnected={isConnected}
              conversationCounts={conversationCounts}
              hasMoreConversations={showingArchived ? false : hasMoreConversations}
              loadingMoreConversations={loadingMoreConversations}
              onLoadMoreConversations={showingArchived ? undefined : () => fetchConversations(false)}
              onAddOwner={() => {
                setAddContactType("owner");
                setShowAddContactModal(true);
              }}
              onAddGuest={() => {
                if (guestInitiationAtLimit) {
                  toast({
                    title: "Daily limit reached",
                    description:
                      "You have reached your daily limit of 15 new guest conversations.",
                    variant: "destructive",
                  });
                  return;
                }
                setAddContactType("guest");
                setShowAddContactModal(true);
              }}
              // Archive functionality
              archivedCount={archivedCount}
              archivedUnreadCount={archivedConversations.reduce(
                (sum, c) =>
                  sum +
                  ((c.unreadCount || 0) > 0 && c.lastMessageDirection === "incoming" ? c.unreadCount || 0 : 0),
                0
              )}
              showingArchived={showingArchived}
              onToggleArchiveView={toggleArchiveView}
              onArchiveConversation={archiveConversation}
              onUnarchiveConversation={unarchiveConversation}
              // User info for access control
              userRole={token?.role}
              userEmail={token?.email}
              userAreas={token?.allotedArea}
              // User profile for nav strip
              userName={token?.name}
              userProfilePic={(token as any)?.profilePic || (token as any)?.avatar}
              // Mobile props
              isMobile={isMobile}
              onUpdateConversation={handleUpdateConversation}
              onConversationTypeChange={handleConversationTypeChange}
              onRefreshConversations={() => void fetchConversations(true)}
              phoneMaskRules={phoneMaskRules}
              canManagePhoneMask={canManagePhoneMask}
              // Admin Queue (full-access roles only)
              adminQueue={adminQueue}
              onAdminQueueChange={handleAdminQueueChange}
              adminLocationFilter={adminLocationFilter}
              adminLocationOptions={adminLocationOptions}
              onAdminLocationFilterChange={handleAdminLocationFilterChange}
              sidebarTabHint={sidebarTabHint}
              onSidebarTabHintConsumed={() => setSidebarTabHint(null)}
              labelFilter={labelFilter}
              onLabelFilterChange={setLabelFilter}
              initiationLimitRefreshKey={initiationLimitRefreshKey}
              guestInitiationAtLimit={guestInitiationAtLimit}
              onOpenDisposition={() => setShowDispositionDialog(true)}
              onOpenSetVisit={() => setShowVisitDialog(true)}
              onOpenReminder={() => setShowReminderDialog(true)}
              onCrmActionForConversation={(conversation) => {
                if (selectedConversation?._id !== conversation._id) {
                  selectConversation(conversation);
                }
              }}
              // Jump to message from search results
              onJumpToMessage={(conversationId, messageId) => {
                // Find and select the conversation
                const conv = (showingArchived ? archivedConversations : conversations).find(
                  (c) => c._id === conversationId
                );
                if (conv) {
                  selectConversation(conv);
                  // Set pending message ID to scroll to after messages load
                  setPendingScrollToMessageId(messageId);
                  // Set message search query for highlighting
                  setMessageSearchQuery(searchQuery);
                }
              }}
            />
            </div>

            {/* Chat Panel - Full screen on mobile when chat is selected */}
            <div
              className={cn(
                // Base: Flex column layout
                "flex flex-col bg-[#efeae2] dark:bg-[#0b141a]",
                // Background: light and dark mode images
                "bg-[url(/whatsapp-background.png)] dark:bg-[url(/whatsapp-background-dark.png)] bg-contain bg-center bg-repeat",
                // Mobile: Full screen overlay when chat is open
                isMobile ? (
                  mobileView === "chat" ? "absolute inset-0 z-10 w-full h-full max-w-full" : "hidden"
                ) : "flex-1 relative min-w-0",
                // Desktop: Always visible, flex-1 for remaining space
                "md:flex-1 md:relative md:z-auto md:min-w-0",
                // Transition for smooth view changes
                "transition-all duration-200 ease-out"
              )}
            >
              {initiationLimitStatus?.limited && (
                <div className="px-4 py-2.5 bg-[#e7f8f3] dark:bg-[#0b3328] border-b border-[#cfe8f6] dark:border-[#2a3942] flex-shrink-0">
                  <InitiationLimitBadge
                    refreshKey={initiationLimitRefreshKey}
                    variant="banner"
                  />
                </div>
              )}

              {selectedConversation ? (
                <>
                  <ChatHeader
                    conversation={selectedConversation}
                    callPermissions={callPermissions}
                    callingAudio={callingAudio}
                    onAudioCall={handleAudioCall}
                    onRefreshTemplates={() =>
                      fetchTemplates(selectedConversation?._id ?? null)
                    }
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
                    readersRefreshToken={readersRefreshToken}
                    currentUserId={token?.id || (token as any)?._id}
                    onBack={handleMobileBack}
                    isMobile={isMobile}
                    availablePhoneConfigs={allowedPhoneConfigs}
                    currentPhoneId={getConversationBusinessPhoneId(selectedConversation) ?? null}
                    onTransferLead={() => setShowTransferDialog(true)}
                    onConversationTypeChange={handleConversationTypeChange}
                    phoneMaskRules={phoneMaskRules}
                    userRole={token?.role}
                    userEmail={token?.email}
                    userAreas={token?.allotedArea}
                    onLocationSet={(conversationId, location) => {
                      handleUpdateConversation(conversationId, {
                        participantLocation: location,
                      } as Partial<Conversation>);
                      void fetchConversations(true);
                    }}
                    onOpenDisposition={
                      showCrmActions ? () => setShowDispositionDialog(true) : undefined
                    }
                    onOpenSetVisit={
                      showCrmActions ? () => setShowVisitDialog(true) : undefined
                    }
                    onOpenReminder={
                      showCrmActions ? () => setShowReminderDialog(true) : undefined
                    }
                    onToggleCrmPanel={
                      showCrmActions && !isMobile
                        ? () => setShowCrmPanel((p) => !p)
                        : undefined
                    }
                    crmPanelOpen={showCrmPanel}
                  />

                  {showCrmActions && (
                    <CrmQuickActionsBar
                      onOpenDisposition={() => setShowDispositionDialog(true)}
                      onOpenSetVisit={() => setShowVisitDialog(true)}
                      onOpenReminder={() => setShowReminderDialog(true)}
                    />
                  )}

                  <MessageList
                    key={selectedConversation._id}
                    messages={messages}
                    messagesLoading={messagesLoading}
                    messageSearchQuery={messageSearchQuery}
                    messagesEndRef={messagesEndRef}
                    selectedConversationActive={!!selectedConversation}
                    onLoadOlderMessages={loadOlderMessages}
                    hasMoreMessages={hasMoreMessages}
                    loadingOlderMessages={loadingOlderMessages}
                    onForwardMessages={handleForwardMessages}
                    conversations={conversations}
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
                      agentName: token?.name || "",
                    }}
                    replyToMessage={replyToMessage}
                    onCancelReply={handleCancelReply}
                    isYouConversation={isYouConversation}
                    conversationType={selectedConversation?.conversationType}
                    conversationRentalType={selectedConversation?.rentalType}
                    selectedConversation={selectedConversation}
                    onSendMediaWithCaptions={handleSendMediaWithCaptions}
                  />
                  <DispositionDialog
                    open={showDispositionDialog}
                    onOpenChange={setShowDispositionDialog}
                    conversation={selectedConversation}
                    onApplied={handleCrmLabelsUpdated}
                  />
                  <SetVisitDialog
                    open={showVisitDialog}
                    onOpenChange={setShowVisitDialog}
                    conversation={selectedConversation}
                    onScheduled={handleCrmLabelsUpdated}
                  />
                  <ReminderDialog
                    open={showReminderDialog}
                    onOpenChange={setShowReminderDialog}
                    conversation={selectedConversation}
                    onCreated={handleCrmLabelsUpdated}
                  />
                </>
              ) : (
                /* Empty state - WhatsApp Web style (hidden on mobile) */
                <div className={cn(
                  "flex-1 flex flex-col items-center justify-center bg-[#f7f5f3] dark:bg-[#222e35]",
                  // Hide on mobile since we show the conversation list instead
                  "hidden md:flex"
                )}>
                  <div className="max-w-md text-center px-4">
                    {/* WhatsApp illustration - responsive */}
                    <div className="w-[240px] h-[141px] md:w-[320px] md:h-[188px] mx-auto mb-6 md:mb-8">
                      <svg viewBox="0 0 320 188" className="w-full h-full">
                        <rect fill="#d9fdd3" x="116" y="22" width="88" height="136" rx="10" className="dark:fill-[#005c4b]"/>
                        <rect fill="#25d366" x="128" y="33" width="64" height="10" rx="5"/>
                        <rect fill="#fff" x="128" y="54" width="54" height="8" rx="4" className="dark:fill-[#e9edef]"/>
                        <rect fill="#fff" x="128" y="68" width="40" height="8" rx="4" className="dark:fill-[#e9edef]"/>
                        <rect fill="#fff" x="128" y="86" width="60" height="8" rx="4" className="dark:fill-[#e9edef]"/> 
                        <rect fill="#fff" x="128" y="100" width="45" height="8" rx="4" className="dark:fill-[#e9edef]"/>
                        <rect fill="#fff" x="128" y="118" width="55" height="8" rx="4" className="dark:fill-[#e9edef]"/>
                        <rect fill="#fff" x="128" y="132" width="35" height="8" rx="4" className="dark:fill-[#e9edef]"/>
                        <circle fill="#25d366" cx="160" cy="170" r="14"/>
                        <path fill="#fff" d="M155 170l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    
                    <h1 className="text-2xl md:text-[32px] font-light text-[#41525d] dark:text-[#e9edef] mb-3 md:mb-4">
                      WhatsApp Business
                    </h1>
                    <p className="text-[13px] md:text-[14px] text-[#667781] dark:text-[#8696a0] leading-relaxed mb-6 md:mb-8">
                      Send and receive messages without keeping your phone online.<br className="hidden md:inline" />
                      <span className="md:hidden"> </span>
                      Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                    </p>
                    
                    <div className="flex items-center justify-center gap-2 text-[13px] md:text-[14px] text-[#667781] dark:text-[#8696a0]">
                      <svg viewBox="0 0 10 12" width="10" height="12" className="text-[#8696a0]">
                        <path fill="currentColor" d="M5.0 0.65C2.648 0.65 0.75 2.548 0.75 4.9V6.125L0.0 6.875V8.375H10.0V6.875L9.25 6.125V4.9C9.25 2.548 7.352 0.65 5.0 0.65ZM5.0 11.35C5.967 11.35 6.75 10.567 6.75 9.6H3.25C3.25 10.567 4.033 11.35 5.0 11.35Z"/>
                      </svg>
                      <span>End-to-end encrypted</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CRM Panel — right side, desktop only */}
            {showCrmPanel && selectedConversation && showCrmActions && (
              <CrmPanel
                isOpen={showCrmPanel}
                conversation={selectedConversation}
                onClose={() => setShowCrmPanel(false)}
                onOpenDisposition={() => setShowDispositionDialog(true)}
                onOpenSetVisit={() => setShowVisitDialog(true)}
                onOpenReminder={() => setShowReminderDialog(true)}
                onLabelsUpdated={handleCrmLabelsUpdated}
                className="hidden md:flex w-[400px] min-w-[300px] max-w-[400px] flex-shrink-0"
              />
            )}
          </div>
        </div>
      
      {/* Add Guest Modal */}
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
      
      {/* Forward Dialog */}
      <ForwardDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        onForward={handleForwardConfirm}
        selectedMessageCount={messagesToForward.length}
        conversations={conversations}
        loading={forwardingMessages}
      />

      <LeadTransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        conversation={selectedConversation}
        currentPhoneId={getConversationBusinessPhoneId(selectedConversation) ?? null}
        availablePhoneConfigs={allowedPhoneConfigs}
        onTransfer={handleTransferLead}
        loading={transferringLead}
      />

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
                {answeringIncoming ? "Connectingâ€¦" : "Answer"}
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
