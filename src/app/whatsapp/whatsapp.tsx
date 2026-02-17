"use client";
import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { flushSync } from "react-dom";
import type { WhatsAppPhoneConfig } from "@/lib/whatsapp/config";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/AuthStore";
import { useSocket } from "@/hooks/useSocket";
import axios from "axios";
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

} from "./utils";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { WindowWarningDialog } from "./components/WindowWarningDialog";
import { MessageComposer } from "./components/MessageComposer";
import { AddGuestModal } from "./components/AddGuestModal";
import { ForwardDialog } from "./components/ForwardDialog";
import { LeadTransferDialog } from "./components/LeadTransferDialog";
import { getWhatsAppNotificationController } from "@/lib/notifications/whatsappNotificationController";

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
  const [selectedPhoneConfig, setSelectedPhoneConfig] = useState<WhatsAppPhoneConfig | null>(null);

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
  
  // Total unread messages count (socket-based, real-time)
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  // Add Guest Modal state
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  
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
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  // 24-hour window warning state (removed - allow free-form sends regardless)
  // kept for backward compatibility variable references
  const [showWindowWarning, setShowWindowWarning] = useState(false);

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Call state
  const [callingAudio, setCallingAudio] = useState(false);
  const [callingVideo, setCallingVideo] = useState(false);
  const [callPermissions, setCallPermissions] = useState({
    canMakeCalls: false,
    canMakeVideoCalls: false,
  });

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
  selectedPhoneIdRef.current = selectedPhoneConfig?.phoneNumberId ?? null;

  const handleUpdateConversation = useCallback((conversationId: string, patch: Partial<Conversation>) => {
    setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, ...patch } : c)));
    setSelectedConversation((prev) => (prev && prev._id === conversationId ? { ...prev, ...patch } : prev));
  }, []);

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


  // Initialize cross-tab WhatsApp notification controller
  useEffect(() => {
    const notificationController = getWhatsAppNotificationController();

    console.log("🔧 Initializing notification controller");

    const hasWhatsAppAccess =
      token?.role === "SuperAdmin" ||
      token?.role === "Sales-TeamLead" ||
      token?.role === "Sales";

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
      onInApp: (raw) => {
        try {
          console.log("🔔 [NOTIF] onInApp called with:", raw);
          // Trigger in-app toast handler (SystemNotificationToast handles rendering)
          // Provide the raw payload so the toast can display contextual info
          // Use handleWhatsAppMessage to update UI state as well
          if (handleWhatsAppMessageRef.current) {
            try {
              handleWhatsAppMessageRef.current(raw);
            } catch (e) {
              console.error("Error calling handleWhatsAppMessageRef:", e);
            }
          } else {
            console.warn("handleWhatsAppMessageRef not set yet");
          }
        } catch (err) {
          console.error("❌ [NOTIF] onInApp error:", err);
        }
      },
      onBrowser: (raw) => {
        try {
          console.log("🔔 [NOTIF] onBrowser called with:", raw);
          // DEBUG: force a browser notification for testing
          const DEBUG_FORCE_NOTIF = true;
          if (DEBUG_FORCE_NOTIF) {
            try {
              const displayText =
                typeof raw.message?.content === "string"
                  ? raw.message.content
                  : raw.message?.content?.text ||
                    raw.message?.content?.caption ||
                    "New message (debug)";

              const notif = new Notification(
                raw.participantName || raw.message?.from || "WhatsApp (debug)",
                {
                  body: displayText.substring(0, 100),
                  icon: "/favicon.ico",
                  badge: "/favicon.ico",
                  tag: raw.conversationId,
                }
              );
              console.log("🔔 [NOTIF] Debug notification created:", notif);
            } catch (e) {
              console.error("🔔 [NOTIF] Debug notification failed:", e);
            }
            return;
          }

          const displayText =
            typeof raw.message?.content === "string"
              ? raw.message.content
              : raw.message?.content?.text ||
                raw.message?.content?.caption ||
                "New message";

          let notif: Notification | null = null;
          try {
            notif = new Notification(
              raw.participantName || raw.message?.from || "WhatsApp",
              {
                body: displayText.substring(0, 100),
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: raw.conversationId,
              }
            );
          } catch (createErr) {
            console.error("❌ [NOTIF] Failed to create browser notification:", createErr);
            return;
          }

          notif.onclick = () => {
            window.focus();
            notif?.close();
            if (raw.conversationId) {
              const activePhoneId = selectedPhoneConfig?.phoneNumberId;
              const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
              if (activePhoneId) {
                router.push(`/whatsapp?phoneId=${activePhoneId}&conversationId=${raw.conversationId}${suffix}`);
              } else {
                router.push(`/whatsapp?conversationId=${raw.conversationId}${suffix}`);
              }
            }
          };

          setTimeout(() => notif?.close(), 5000);
        } catch (err) {
          console.error("❌ [NOTIF] onBrowser error:", err);
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
            canMakeVideoCalls: response.data.canMakeVideoCalls,
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
        
        const realPhoneConfigs = phoneConfigs.filter((c: any) => !c.isInternal);
        if (realPhoneConfigs.length > 0) {
          const phoneIdParam = searchParams?.get("phoneId");
          let selected: any = null;
          if (phoneIdParam) {
            selected = realPhoneConfigs.find((c: any) => c.phoneNumberId === phoneIdParam);
          }
          setSelectedPhoneConfig(selected || realPhoneConfigs[0]);
        }
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
    fetchTemplates();
    fetchPhoneConfigs();
  }, [searchParams]);

  // Ensure phoneId is present in URL while inside WhatsApp module.
  // If missing, redirect to default allowed phone for the user.
  useEffect(() => {
    const phoneIdParam = searchParams?.get("phoneId");
    if (phoneIdParam) return;
    // If phone configs are loaded, pick a default and redirect
    if (allowedPhoneConfigs.length > 0) {
      const defaultPhone = allowedPhoneConfigs.find((c: any) => !c.isInternal) || allowedPhoneConfigs[0];
      if (defaultPhone && defaultPhone.phoneNumberId) {
        // preserve retargetOnly flag if present
        const retargetOnlyFlag = searchParams?.get("retargetOnly");
        const suffix = retargetOnlyFlag ? `&retargetOnly=${retargetOnlyFlag}` : "";
        router.replace(`/whatsapp?phoneId=${defaultPhone.phoneNumberId}${suffix}`);
      }
    }
    // else wait for phone configs to load
  }, [searchParams, allowedPhoneConfigs]);

  // CRITICAL: Refetch conversations when phone filter or search changes
  // Database is source of truth - always query backend, never filter client-side
  useEffect(() => {
    if (token && selectedPhoneConfig?.phoneNumberId) {
      // Only fetch if we have a phone config selected (skip initial null state)
      // Debounce search to avoid excessive API calls
      const timeoutId = setTimeout(() => {
        fetchConversations(true); // Reset pagination when filter/search changes
      }, searchQuery.trim() ? 300 : 0); // 300ms debounce for search, immediate for phone filter

      return () => clearTimeout(timeoutId);
    }
  }, [selectedPhoneConfig?.phoneNumberId, searchQuery, token]);

  // Prefetch archived conversations so the "Archived" row can show unread count without opening archive
  useEffect(() => {
    if (token) {
      fetchArchivedConversations({ silent: true });
    }
  }, [token]);

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

    // Also join phone-specific room for the currently selected phoneId so events scoped to that phone arrive.
    const initialPhoneId = selectedPhoneIdRef.current;
    if (initialPhoneId) {
      socket.emit("join-whatsapp-phone", initialPhoneId);
    }
    // Track previous phoneId and update room membership when it changes
    let previousPhoneId = initialPhoneId || null;
    const phoneWatcher = setInterval(() => {
      const current = selectedPhoneIdRef.current || null;
      if (current === previousPhoneId) return;
      if (previousPhoneId) {
        socket.emit("leave-whatsapp-phone", previousPhoneId);
      }
      if (current) {
        socket.emit("join-whatsapp-phone", current);
      }
      previousPhoneId = current;
    }, 500);

    // Retarget room membership for Advert / SuperAdmin
    const role = token?.role || "";
    let previousRetargetPhone: string | null = null;
    const retargetWatcher = setInterval(() => {
      const currentPhone = selectedPhoneIdRef.current || null;
      // Only join retarget room if user is Advert or SuperAdmin
      const shouldJoin = role === "Advert" || role === "SuperAdmin";
      if (!shouldJoin) return;
      if (currentPhone === previousRetargetPhone) return;
      if (previousRetargetPhone) {
        socket.emit("leave-whatsapp-retarget", previousRetargetPhone);
      }
      if (currentPhone) {
        socket.emit("join-whatsapp-retarget", currentPhone);
      }
      previousRetargetPhone = currentPhone;
    }, 500);

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
      if (data.businessPhoneId && currentPhoneId && data.businessPhoneId !== currentPhoneId) {
        return;
      }

      // In retargetOnly mode, ignore messages from non-retarget conversations
      if (retargetOnlyRef.current && !data.isRetarget) {
        return;
      }
      
      const notificationController = getWhatsAppNotificationController();
      notificationController.process(data);

      const { conversationId, message } = data;
      
      if (!conversationId || !message) {
        return;
      }
      // Expose handler to external callers (notification controller) via ref
      try {
        handleWhatsAppMessageRef.current = handleWhatsAppMessage;
      } catch (e) {
        // ignore
      }
      const currentConversation = selectedConversationRef.current;

      const displayText = (data.lastMessagePreview != null && data.lastMessagePreview !== "")
        ? data.lastMessagePreview
        : (typeof message.content === "string" 
            ? message.content 
            : message.content?.text || message.content?.caption || `${message.type} message`);

      const isCurrentConversation = currentConversation?._id === conversationId;
      const isIncomingMessage = message.direction === "incoming";

      requestAnimationFrame(() => {
        setConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv._id === conversationId) {
              const newUnreadCount = isIncomingMessage && !isCurrentConversation
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0;
              
              return {
                ...conv,
                lastMessageContent: displayText,
                lastMessageTime: message.timestamp,
                lastMessageDirection: message.direction,
                unreadCount: newUnreadCount,
              };
            }
            return conv;
          });
          
          const newTotalUnread = updated.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
          setTotalUnreadCount(newTotalUnread);
          
          return sortConversations(updated);
        });

        setArchivedConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv._id === conversationId) {
              const prevUnreadCount = conv.unreadCount || 0;
              const newUnreadCount = isIncomingMessage && !isCurrentConversation
                ? prevUnreadCount + 1
                : prevUnreadCount;
              // Only increment unread chat count if this conversation previously had 0 unread messages
              // (i.e., it's becoming an unread chat for the first time)
              if (isIncomingMessage && !isCurrentConversation && prevUnreadCount === 0) {
                setArchivedUnreadCount((c) => c + 1);
              }
              return {
                ...conv,
                lastMessageContent: displayText,
                lastMessageTime: message.timestamp,
                lastMessageDirection: message.direction,
                unreadCount: newUnreadCount,
              };
            }
            return conv;
          });
          
          return sortConversations(updated);
        });

        if (isCurrentConversation) {
          setSelectedConversation((prev) => prev ? { ...prev, lastMessageTime: message.timestamp } : prev);
        }
        
        if (isIncomingMessage && !isCurrentConversation) {
          setTotalUnreadCount((prev) => prev + 1);
        }
      });

      if (isCurrentConversation) {
        // If an incoming message arrives for the open conversation, close the 24h template warning
        if (isIncomingMessage) {
          try {
            setShowWindowWarning(false);
          } catch (e) {
            /* no-op */
          }
        }
        if (seenMessageIdsRef.current.has(message.messageId)) {
          return;
        }
        addToLRUSet(seenMessageIdsRef.current, message.messageId);

        setMessages((prev) => {
          if (message.type === "reaction" && message.reactedToMessageId) {
            return prev.map((msg) => {
              if (msg.messageId === message.reactedToMessageId) {
                const existingReactions = msg.reactions || [];
                const reactionEmoji = message.reactionEmoji || message.content?.text?.replace("Reacted: ", "") || "👍";
                const hasReaction = existingReactions.some(
                  (r) => r.emoji === reactionEmoji && r.direction === message.direction
                );
                if (!hasReaction) {
                  return {
                    ...msg,
                    reactions: [...existingReactions, { emoji: reactionEmoji, direction: message.direction }],
                  };
                }
              }
              return msg;
            });
          }

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
              reactions: message.reactions || [],
              replyToMessageId: message.replyToMessageId,
              replyContext: message.replyContext,
            },
          ];
        });

        if (message.direction === "incoming") {
          axios.post("/api/whatsapp/conversations/read", {
            conversationId: conversationId,
          }).catch(() => {});
        }
      } else if (message.direction === "incoming") {
        playNotificationSound();
      }
      // Note: In-app toast notifications are handled by the notification controller
      // via SystemNotificationToast component - no need for duplicate toast here
    };

    socket.on("whatsapp-new-message", handleWhatsAppMessage);

    return () => {
      socket.off("whatsapp-new-message", handleWhatsAppMessage);
      clearInterval(phoneWatcher);
      try { clearInterval(retargetWatcher); } catch {}
    };
  }, [socket, token, playNotificationSound]);

  // Socket.io event listeners - other events (new conversations, status updates, etc.)
  useEffect(() => {
    if (!socket) return;

    // Handle new conversations
    const handleNewConversation = (data: any) => {
      const { conversation } = data;
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === conversation.id);
        if (exists) return prev;
        const newConversation = {
          _id: conversation.id,
          participantPhone: conversation.participantPhone,
          participantName: conversation.participantName,
          unreadCount: conversation.unreadCount || 0,
          lastMessageTime: conversation.lastMessageTime,
          status: "active",
        };
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
        const idx = prev.findIndex((conv) => conv._id === conversationId && conv.lastMessageId === messageId);
        if (idx === -1 || prev[idx].lastMessageStatus === status) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], lastMessageStatus: status };
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
      toast({
        title: "📞 Incoming Call",
        description: `${
          data.callerInfo?.profile?.name || data.from
        } is calling...`,
        duration: 10000,
      });
      playNotificationSound();
    });

    // Handle missed calls
    socket.on("whatsapp-call-missed", (data: any) => {
      toast({
        title: "📞 Missed Call",
        description: `Missed call from ${data.from}`,
        variant: "destructive",
      });
    });

    // Handle call status updates
    socket.on("whatsapp-call-status", (data: any) => {
      console.log("Call status update:", data);
    });

    // Handle history sync events
    socket.on("whatsapp-history-sync", (data: any) => {
      console.log("History sync:", data);
      if (data.status === "completed") {
        toast({
          title: "📜 History Sync Complete",
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

      // If this is the currently open conversation, bump the refresh token
      // so ChatHeader can refetch readers immediately (socket-first, polling-fallback)
      if (currentConversation?._id === conversationId) {
        setReadersRefreshToken((prev) => prev + 1);
      }

      // If this read event is for the current logged-in user, clear unread
      // state for that conversation across all tabs/devices (both main and archived).
      const currentUserId = token?.id || (token as any)?._id;
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
      socket.off("whatsapp-call-missed");
      socket.off("whatsapp-call-status");
      socket.off("whatsapp-history-sync");
      socket.off("whatsapp-app-state-sync");
      socket.off("whatsapp-conversation-read");
      socket.off("whatsapp-conversation-update");
    };
  }, [socket, toast, token, playNotificationSound]);


  // Fetch conversation counts from database
  const fetchConversationCounts = async () => {
    try {
      const countsParams = new URLSearchParams();
      if (retargetOnlyRef.current) {
        countsParams.append("retargetOnly", "1");
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
      // CRITICAL: Pass phoneId filter to backend - filtering happens at database level, not client-side
      if (selectedPhoneConfig?.phoneNumberId && !selectedPhoneConfig.isInternal) {
        params.append("phoneId", selectedPhoneConfig.phoneNumberId);
      }
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

      const response = await axios.get(`/api/whatsapp/conversations?${params.toString()}`);
      if (response.data.success) {
        const newConversations = response.data.conversations || [];
        
        // Update archived count from response
        if (response.data.archivedCount !== undefined) {
          setArchivedCount(response.data.archivedCount);
        }
        
        if (reset) {
          // Deduplicate even on reset in case of any issues
          const uniqueConversations = Array.from(
            new Map(newConversations.map((c: Conversation) => [c._id, c])).values()
          ) as Conversation[];
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
    try {
      if (reset) {
        setMessagesLoading(true);
        setMessagesCursor(null);
        setHasMoreMessages(false);
        // Clear messages immediately to prevent flash of old messages
        setMessages([]);
      } else {
        setLoadingOlderMessages(true);
      }

      const params = new URLSearchParams();
      params.append("limit", "20");
      if (messagesCursor && !reset) {
        params.append("beforeMessageId", messagesCursor.messageId);
      }

      // Always include phoneId namespace when loading messages
      if (selectedPhoneConfig?.phoneNumberId) {
        params.append("phoneId", selectedPhoneConfig.phoneNumberId);
      }
      const response = await axios.get(
        `/api/whatsapp/conversations/${conversationId}/messages?${params.toString()}`
      );
      if (response.data.success) {
        const newMessages = response.data.messages || [];
        
        if (reset) {
          setMessages(newMessages);
          // Let MessageList handle scrolling via its useEffect
          // Remove the manual scroll here to prevent double-scroll
        } else {
          // Prepend older messages (don't scroll, preserve position)
          setMessages((prev) => [...newMessages, ...prev]);
        }

        // Update cursor and hasMore
        setHasMoreMessages(response.data.pagination?.hasMore || false);
        setMessagesCursor(response.data.pagination?.nextCursor || null);
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setMessagesLoading(false);
      setLoadingOlderMessages(false);
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
        const conversations = response.data.conversations || [];
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

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await axios.get("/api/whatsapp/templates");
      if (response.data.success) {
        setTemplates(response.data.templates);
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
    setSelectedConversation(conversation);
    setReplyToMessage(null); // Clear any pending reply when switching conversations
    
    if (conversation) {
      fetchMessages(conversation._id, true);
      
      // Navigate to chat view on mobile
      if (isMobile) {
        navigateToChat();
      }
      // CRITICAL: Mark conversation as read in ConversationReadState
      // This updates the per-user read state so notifications stop for this user
      axios.post("/api/whatsapp/conversations/read", {
        conversationId: conversation._id,
      })
      .then((response) => {
        console.log(`✅ [FRONTEND] Successfully marked conversation ${conversation._id} as read:`, response.data);
      })
      .catch((err) => {
        console.error("❌ [FRONTEND] Error marking conversation as read:", err);
        if (err.response) {
          console.error("❌ [FRONTEND] Response error:", err.response.data);
        }
      });
      updateLocalLastReadAt(conversation._id);
      
      // Reset unread count locally
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c._id === conversation._id ? { ...c, unreadCount: 0 } : c
        );
        
        // Update total unread count in real-time (socket-based)
        const newTotalUnread = updated.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setTotalUnreadCount(newTotalUnread);
        
        return updated;
      });
      
      // Update URL with conversation ID for deep linking (preserve phoneId namespace and retargetOnly)
      const activePhoneId = selectedPhoneConfig?.phoneNumberId;
      const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
      const convUrl = activePhoneId
        ? `/whatsapp?phoneId=${activePhoneId}&conversation=${conversation._id}${suffix}`
        : `/whatsapp?conversation=${conversation._id}${suffix}`;
      router.push(convUrl, { scroll: false });
    } else {
      // Navigate back to sidebar on mobile when clearing selection
      if (isMobile) {
        setMobileView("conversations");
      }
      
      // Clear selection but preserve phoneId in URL (and retargetOnly if present)
      const activePhoneId = selectedPhoneConfig?.phoneNumberId;
      const suffixClear = retargetOnlyRef.current ? `?retargetOnly=1` : "";
      if (activePhoneId) {
        const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
        router.push(`/whatsapp?phoneId=${activePhoneId}${suffix}`, { scroll: false });
      } else {
        router.push(`/whatsapp${suffixClear}`, { scroll: false });
      }
    }
  };

  const handleGuestAdded = async (conversationId: string, conversation?: Conversation) => {
    try {
      let newConversation: Conversation | null = null;
      
      // If conversation object is provided, format it to ensure all required fields are present
      if (conversation) {
        // Map participantRole to conversationType if conversationType is not set
        // The backend uses participantRole, but frontend uses conversationType
        const conversationType = conversation.conversationType || 
          (conversation.participantRole as "owner" | "guest" | undefined) || 
          "owner";
        
        // Ensure the conversation has all required fields for the sidebar
        newConversation = {
          ...conversation,
          _id: conversation._id || conversationId,
          participantPhone: conversation.participantPhone || "",
          participantName: conversation.participantName || conversation.participantPhone || "Unknown",
          unreadCount: conversation.unreadCount ?? 0,
          status: conversation.status || "active",
          conversationType: conversationType,
          participantRole: conversation.participantRole || conversationType, // Keep both for compatibility
          lastMessageTime: conversation.lastMessageTime || new Date(),
          // Ensure these optional fields are set
          isArchivedByUser: conversation.isArchivedByUser || false,
          isInternal: conversation.isInternal || conversation.source === "internal" || false,
        } as Conversation;
      } else {
        // Otherwise, fetch the conversation by ID from the API
        try {
          const response = await axios.get(`/api/whatsapp/conversations`);
          if (response.data.success && response.data.conversations?.length > 0) {
            newConversation = response.data.conversations.find(
              (c: Conversation) => c._id === conversationId
            ) || null;
          }
        } catch (fetchError) {
          console.error("Error fetching conversation:", fetchError);
        }
      }
      
      if (newConversation) {
        // Add to conversations list if not already there (optimistic update)
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === conversationId);
          if (exists) {
            // Update existing conversation with new data
            return prev.map((c) => 
              c._id === conversationId ? { ...c, ...newConversation } : c
            );
          }
          // Add at the beginning of the list (most recent first)
          return [newConversation!, ...prev];
        });
        
        // Select and navigate to the conversation immediately (preserve phoneId)
        selectConversation(newConversation);
        {
          const activePhoneId = selectedPhoneConfig?.phoneNumberId;
          const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
          router.push(activePhoneId ? `/whatsapp?phoneId=${activePhoneId}&conversationId=${conversationId}${suffix}` : `/whatsapp?conversationId=${conversationId}${suffix}`);
        }
      } else {
        // If conversation not found, navigate directly - preserve phoneId if present
        {
          const activePhoneId = selectedPhoneConfig?.phoneNumberId;
          const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
          router.push(activePhoneId ? `/whatsapp?phoneId=${activePhoneId}&conversationId=${conversationId}${suffix}` : `/whatsapp?conversationId=${conversationId}${suffix}`);
        }
      }
      
      // Also refresh the full conversations list in the background to ensure consistency
      // This ensures the conversation has all computed fields (unreadCount, lastMessageStatus, etc.)
      setTimeout(() => {
        fetchConversations(true).catch(console.error);
      }, 500);
    } catch (error) {
      console.error("Error handling guest added:", error);
      // Fallback: navigate directly to the conversation (preserve phoneId)
      {
        const activePhoneId = selectedPhoneConfig?.phoneNumberId;
        const suffix = retargetOnlyRef.current ? `&retargetOnly=1` : "";
        router.push(activePhoneId ? `/whatsapp?phoneId=${activePhoneId}&conversationId=${conversationId}${suffix}` : `/whatsapp?conversationId=${conversationId}${suffix}`);
      }
    }
  };

  const openedByPhoneRef = useRef<string | null>(null);

  useEffect(() => {
    const phoneParam = searchParams?.get("phone");
    if (!phoneParam) return;
    if (!selectedPhoneConfig?.phoneNumberId) return;
    
    const cacheKey = `${phoneParam}_${selectedPhoneConfig.phoneNumberId}`;
    if (openedByPhoneRef.current === cacheKey) return;
    openedByPhoneRef.current = cacheKey;

    const normalized = phoneParam.replace(/\D/g, "");
    const nameParam = searchParams?.get("name") || undefined;
    const profilePicParam = searchParams?.get("profilePic") || undefined;

    (async () => {
      try {
        const convs = await fetchConversations();
        const found = convs.find((c: any) =>
          (c.participantPhone || "").replace(/\D/g, "").endsWith(normalized)
        );

        if (found) {
          setConversations((prev) => {
            const exists = prev.find((c: any) => c._id === found._id);
            if (exists) return prev;
            return sortConversations([found, ...prev]);
          });
          selectConversation(found);
        } else {
          const createRes = await axios.post("/api/whatsapp/conversations", {
            participantPhone: normalized,
            participantName: nameParam || phoneParam,
            phoneNumberId: selectedPhoneConfig.phoneNumberId,
            ...(profilePicParam ? { participantProfilePic: profilePicParam } : {}),
          });
          if (createRes.data.success) {
            const conversation = createRes.data.conversation;
            setConversations((prev) => {
              const exists = prev.find((c: any) => c._id === conversation._id);
              if (exists) return sortConversations(prev.map((c: any) => (c._id === conversation._id ? conversation : c)));
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
  }, [searchParams, selectedPhoneConfig?.phoneNumberId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Skip 24-hour window check for "You" conversations (always active)
    const isYouConv = selectedConversation.isInternal || selectedConversation.source === "internal";
    if (!isYouConv && !isMessageWindowActive(selectedConversation)) {
      setShowWindowWarning(true);
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
        phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
          // If a message with the real messageId was already appended via socket,
          // merge by removing the temp message and updating the existing one.
          const existingIdx = prev.findIndex((m) => m.messageId === realMessageId);
          if (existingIdx !== -1) {
            return prev
              .filter((m) => m._id !== tempId) // remove temp
              .map((m, i) =>
                m.messageId === realMessageId
                  ? { ...m, _id: savedMessageId, status: "sent", timestamp: realTimestamp }
                  : m
              );
          }

          // Otherwise, replace the temp message with the real one
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
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send message",
        variant: "destructive",
      });
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempId
              ? { 
                  ...msg, 
                  _id: response.data.savedMessageId,
                  messageId: response.data.messageId, 
                  status: "sent" 
                }
              : msg
          )
        );
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

    try {
      setLoading(true);
      const response = await axios.post("/api/whatsapp/conversations", {
        participantPhone: fullPhoneNumber,
        participantName: `+${country} ${phone}`,
      });

      if (response.data.success) {
        const conversation = response.data.conversation;
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === conversation._id);
          if (exists) {
            selectConversation(exists);
            return prev;
          }
          return [conversation, ...prev];
        });
        setSelectedConversation(conversation);
        setMessages([]);
        setNewPhoneNumber("");
        // Keep country code for convenience
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
  const handleReactMessage = async (message: Message, emoji: string = "👍") => {
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
        phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
        phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
      if (!isYouConv && !isMessageWindowActive(selectedConversation)) {
        setShowWindowWarning(true);
        return;
      }

      setUploadingMedia(true);

      const tempId = `temp-${Date.now()}`;
      const sendTimestamp = new Date();
      const mediaDisplayText = `📎 ${file.name}`;

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
          phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
  }, [selectedConversation, selectedPhoneConfig]);

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
    if (!isYouConv && !isMessageWindowActive(selectedConversation)) {
      setShowWindowWarning(true);
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
    const mediaDisplayText = captionText ? `📎 ${captionText}` : `📎 ${file.name}`;
    
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
        phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
      console.error("❌ File upload error:", {
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
    const mediaDisplayText = caption || `📷 ${file.name}`;
    
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
        phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
      console.error("❌ Image send error:", error);
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
    const mediaDisplayText = `📷 ${files.length} image${files.length > 1 ? 's' : ''}`;
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
            phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
          console.error(`❌ Image ${index + 1} upload error:`, error);
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

    setCallingAudio(true);
    try {
      const response = await axios.post("/api/whatsapp/call", {
        conversationId: selectedConversation._id,
        callType: "audio",
        action: "request",
      });

      if (response.data.success) {
        toast({
          title: "Call Request Sent",
          description: response.data.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Call Failed",
        description: error.response?.data?.error || "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setCallingAudio(false);
    }
  };

  // Handle video call
  const handleVideoCall = async () => {
    if (!selectedConversation || !callPermissions.canMakeVideoCalls) return;

    setCallingVideo(true);
    try {
      const response = await axios.post("/api/whatsapp/call", {
        conversationId: selectedConversation._id,
        callType: "video",
        action: "request",
      });

      if (response.data.success) {
        toast({
          title: "Video Call Request Sent",
          description: response.data.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Video Call Failed",
        description:
          error.response?.data?.error || "Failed to initiate video call",
        variant: "destructive",
      });
    } finally {
      setCallingVideo(false);
    }
  };

  // Handle archive conversation
  const handleArchiveConversation = async () => {
    if (!selectedConversation) return;
    toast({
      title: "Archive",
      description: "Archive feature coming soon",
    });
  };

  // Handle mute notifications
  const handleMuteNotifications = () => {
    toast({
      title: "Mute",
      description: "Mute feature coming soon",
    });
  };

  // "You" conversations are always active - no template requirement, no 24-hour window
  const isYouConversation = selectedConversation?.isInternal || selectedConversation?.source === "internal";
  const canSendFreeForm = isYouConversation || (selectedConversation ? isMessageWindowActive(selectedConversation) : false);

  const copyPhoneNumber = () => {
    if (!selectedConversation) return;
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
          <div className="flex-1" />
          {/* User info - hidden on mobile, shown on tablet+ */}
          <div className="text-white/80 text-sm hidden md:block">
            {token?.name} &bull; {token?.role}
          </div>
        </div>

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
              // Tablet and up: Fixed sidebar width (nav strip 70px + main content ~330px)
              "md:w-[400px] md:min-w-[320px] md:max-w-[400px]",
              "lg:w-[700px] lg:min-w-[400px] lg:max-w-[700px]",
              // Transition for smooth view changes
              "transition-all duration-200 ease-out"
            )}>
              <ConversationSidebar
              conversations={showingArchived ? archivedConversations : conversations}
              selectedConversation={selectedConversation}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              loading={loading}
              allowedPhoneConfigs={allowedPhoneConfigs}
              selectedPhoneConfig={selectedPhoneConfig}
              onPhoneConfigChange={setSelectedPhoneConfig}
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
              onAddGuest={() => setShowAddGuestModal(true)}
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
              userAreas={token?.allotedArea}
              // User profile for nav strip
              userName={token?.name}
              userProfilePic={(token as any)?.profilePic || (token as any)?.avatar}
              // Mobile props
              isMobile={isMobile}
              onUpdateConversation={handleUpdateConversation}
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
              {selectedConversation ? (
                <>
                  <ChatHeader
                    conversation={selectedConversation}
                    callPermissions={callPermissions}
                    callingAudio={callingAudio}
                    callingVideo={callingVideo}
                    onAudioCall={handleAudioCall}
                    onVideoCall={handleVideoCall}
                    onRefreshTemplates={fetchTemplates}
                    templatesLoading={templatesLoading}
                    showMessageSearch={showMessageSearch}
                    onToggleMessageSearch={() => setShowMessageSearch((prev) => !prev)}
                    onCloseSearch={() => {
                      setShowMessageSearch(false);
                      setMessageSearchQuery("");
                    }}
                    messageSearchQuery={messageSearchQuery}
                    onMessageSearchChange={setMessageSearchQuery}
                    onMute={handleMuteNotifications}
                    onArchive={handleArchiveConversation}
                    toastCopy={copyPhoneNumber}
                    onDelete={() =>
                      toast({
                        title: "Delete",
                        description: "Delete feature coming soon",
                      })
                    }
                    readersRefreshToken={readersRefreshToken}
                    currentUserId={token?.id || (token as any)?._id}
                    onBack={handleMobileBack}
                    isMobile={isMobile}
                    availablePhoneConfigs={allowedPhoneConfigs}
                    currentPhoneId={selectedPhoneConfig?.phoneNumberId && !selectedPhoneConfig.isInternal ? selectedPhoneConfig.phoneNumberId : null}
                    onTransferLead={() => setShowTransferDialog(true)}
                  />

                  <MessageList
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

                  <WindowWarningDialog
                    open={showWindowWarning}
                    onClose={() => setShowWindowWarning(false)}
                    onSendTemplate={() => {
                      setShowWindowWarning(false);
                      setShowTemplateDialog(true);
                    }}
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
                    templateContext={getConversationTemplateContext(
                      selectedConversation
                    )}
                    replyToMessage={replyToMessage}
                    onCancelReply={handleCancelReply}
                    isYouConversation={isYouConversation}
                    selectedConversation={selectedConversation}
                    selectedPhoneConfig={selectedPhoneConfig}
                    onSendMediaWithCaptions={handleSendMediaWithCaptions}
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
          </div>
        </div>
      
      {/* Add Guest Modal */}
      <AddGuestModal
        open={showAddGuestModal}
        onOpenChange={setShowAddGuestModal}
        onGuestAdded={handleGuestAdded}
        defaultPhoneNumberId={selectedPhoneConfig?.phoneNumberId}
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
        currentPhoneId={selectedPhoneConfig?.phoneNumberId && !selectedPhoneConfig.isInternal ? selectedPhoneConfig.phoneNumberId : null}
        availablePhoneConfigs={allowedPhoneConfigs}
        onTransfer={handleTransferLead}
        loading={transferringLead}
      />
    </div>
  );
}
