"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { X, AlertCircle, Info, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/AuthStore";
import { useRouter } from "next/navigation";
import { getAllowedPhoneIds } from "@/lib/whatsapp/config";
import axios from "axios";
import { cn } from "@/lib/utils";
import {
  UnifiedNotification,
  RawSystemNotification,
  RawWhatsAppMessage,
  NotificationSeverity,
} from "@/lib/notifications/types";
import {
  normalizeSystemNotification,
  normalizeWhatsAppNotification,
} from "@/lib/notifications/normalize";
import { NotificationDeduplicator } from "@/lib/notifications/deduplication";
import { NotificationMicroBatcher } from "@/lib/notifications/microBatch";
import {
  NotificationQueueEngine,
  QueueConfig,
} from "@/lib/notifications/queueEngine";
import {
  loadReplayState,
  saveReplayState,
  updateReplayState,
  fetchMissedSystemNotifications,
} from "@/lib/notifications/replay";
import {
  NotificationRateLimiter,
  NotificationLogger,
} from "@/lib/notifications/rateLimiter";
import { getWhatsAppNotificationController } from "@/lib/notifications/whatsappNotificationController";

interface SystemNotificationToastProps {
  onNotificationReceived?: (notification: UnifiedNotification) => void;
}

export function SystemNotificationToast({
  onNotificationReceived,
}: SystemNotificationToastProps) {
  const { socket, isConnected } = useSocket();
  const { token } = useAuthStore();
  const router = useRouter();

  // Core state
  const [dismissed, setDismissed] = useState<Map<string, number>>(new Map()); // Map<notificationId, timestamp>
  const [expanded, setExpanded] = useState<Map<string, boolean>>(new Map());
  const [muted, setMuted] = useState<Set<string>>(new Set()); // Separate from dismissed
  const [visibleNotifications, setVisibleNotifications] = useState<
    UnifiedNotification[]
  >([]);
  const [updatedNotifications, setUpdatedNotifications] = useState<Set<string>>(new Set()); // Track updated toasts for pulse animation
  const [lastDismissedAt, setLastDismissedAt] = useState<Map<string, number>>(new Map()); // Track when each notification was dismissed (for cooldown)
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission
  >(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );
  const seenEventIdsRef = useRef<Set<string>>(new Set()); // Track seen event IDs for deduplication (per-user notifications) - use ref for synchronous checks
  const acknowledgedDeliveryIdsRef = useRef<Set<string>>(new Set()); // Track acknowledged delivery IDs (FIX 3)
  const lastUiUpdateRef = useRef<number>(0); // Track last UI update time for rate limiting (FIX 7)
  const uiUpdateBufferRef = useRef<Array<() => void>>([]); // Buffer for batched UI updates (FIX 7)
  const archivedConversationIdsRef = useRef<Set<string>>(new Set()); // Track archived conversations for current user
  const lastReadAtRef = useRef<Map<string, number>>(new Map()); // Track per-conversation lastReadAt for current user
  const activeConversationIdRef = useRef<string | null>(null); // Track currently open conversation (cross-tab)
  const permissionRequestedRef = useRef<boolean>(false);
  
  // Constants
  const DISMISSED_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const REVIVE_COOLDOWN_MS = 500; // 500ms cooldown to prevent visual jitter
  const UI_UPDATE_THROTTLE_MS = 200; // 50ms throttle for UI updates (FIX 7)

  // Infrastructure instances (persist across renders)
  const deduplicatorRef = useRef(new NotificationDeduplicator());
  const rateLimiterRef = useRef(new NotificationRateLimiter());
  const loggerRef = useRef(new NotificationLogger());
  const replayStateRef = useRef(loadReplayState());
  const queueEngineRef = useRef(
    new NotificationQueueEngine({
      maxVisible: 4, // Max 4 notifications on screen
      minVisibleDurationMs: 0, // No minimum duration - dismiss based on inactivity
      groupWindowMs: 10000, // 10 seconds for WhatsApp grouping
    })
  );
  const notificationController = useMemo(
    () => getWhatsAppNotificationController(),
    []
  );
  
  // Track last interaction time for each notification (for inactivity-based auto-dismiss)
  const lastInteractionRef = useRef<Map<string, number>>(new Map()); // Map<notificationId, lastInteractionTimestamp>
  const INACTIVITY_DISMISS_MS = 20000; // 20 seconds of inactivity before auto-dismiss
  
  // ---------- Cross-tab state hydration ----------
  const hydrateArchivedFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("whatsapp_archived_conversations");
      if (!raw) {
        archivedConversationIdsRef.current = new Set();
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        archivedConversationIdsRef.current = new Set(parsed as string[]);
      } else if (parsed && typeof parsed === "object") {
        archivedConversationIdsRef.current = new Set(Object.keys(parsed));
      }
    } catch (err) {
      console.error("Failed to hydrate archived conversations from storage", err);
    }
  }, []);

  const hydrateLastReadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("whatsapp_last_read_at");
      if (!raw) {
        lastReadAtRef.current = new Map();
        return;
      }
      const parsed = JSON.parse(raw);
      const next = new Map<string, number>();
      if (parsed && typeof parsed === "object") {
        Object.entries(parsed).forEach(([conversationId, timestamp]) => {
          const ms = new Date(timestamp as string).getTime();
          if (!Number.isNaN(ms)) {
            next.set(conversationId, ms);
          }
        });
      }
      lastReadAtRef.current = next;
    } catch (err) {
      console.error("Failed to hydrate lastReadAt from storage", err);
    }
  }, []);

  const hydrateActiveConversationFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("whatsapp_active_conversation");
      if (!raw) {
        activeConversationIdRef.current = null;
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.conversationId) {
        activeConversationIdRef.current = parsed.conversationId;
      }
    } catch (err) {
      console.error("Failed to hydrate active conversation from storage", err);
    }
  }, []);

  const getArchivedConversationIds = useCallback(() => {
    return archivedConversationIdsRef.current;
  }, []);

  const getLastReadForConversation = useCallback((conversationId: string) => {
    return lastReadAtRef.current.get(conversationId);
  }, []);

  const getActiveConversationId = useCallback(() => {
    let activeConversationId = activeConversationIdRef.current;
    if (!activeConversationId && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("whatsapp_active_conversation");
        const parsed = raw ? JSON.parse(raw) : null;
        activeConversationId = parsed?.conversationId || null;
      } catch {
        activeConversationId = null;
      }
    }
    return activeConversationId;
  }, []);

  const isTabVisible = useCallback(() => {
    return typeof document === "undefined"
      ? true
      : document.visibilityState === "visible";
  }, []);

  const isOnWhatsAppRoute = useCallback(() => {
    if (typeof window === "undefined") return true;
    return window.location.pathname.startsWith("/whatsapp");
  }, []);

  // Handler refs (prevent re-attachment by keeping stable references)
  const handleSystemNotificationRef = useRef<((data: any) => void) | null>(null);
  const handleWhatsAppMessageRef = useRef<((data: RawWhatsAppMessage) => void) | null>(null);

  // User context
  const userId = token?.id;
  const userRole = token?.role || "";
  const userLocations = useMemo(() => {
    return Array.isArray(token?.allotedArea)
      ? token.allotedArea
      : token?.allotedArea
        ? [token.allotedArea]
        : [];
  }, [token?.allotedArea]);

  const hasWhatsAppAccess =
    token?.role === "SuperAdmin" ||
    token?.role === "Sales-TeamLead" ||
    token?.role === "Sales";

  // WhatsApp mute state
  const getMutedWhatsAppConversations = useCallback((): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const muted = localStorage.getItem("whatsapp_muted_conversations");
      if (!muted) return new Set();
      const parsed = JSON.parse(muted);
      const now = Date.now();
      const valid = Object.entries(parsed)
        .filter(
          ([_, timestamp]: [string, any]) => now - timestamp < 30 * 60 * 1000
        )
        .map(([id]) => id);
      return new Set(valid);
    } catch {
      return new Set();
    }
  }, []);

  const [mutedWhatsAppConversations, setMutedWhatsAppConversations] =
    useState<Set<string>>(getMutedWhatsAppConversations);

  // Micro-batcher callback
  const handleBatchedRelease = useCallback(
    (notifications: UnifiedNotification[]) => {
      console.log("📦 MICRO-BATCHER RELEASING:", {
        count: notifications.length,
        notifications: notifications.map((n) => ({
          id: n.id,
          source: n.source,
          title: n.title,
          message: n.message?.substring
            ? n.message.substring(0, 50)
            : n.message,
        })),
      });

      notifications.forEach((notification) => {
        // Deduplication check
        if (
          deduplicatorRef.current.shouldDrop(
            notification.id,
            notification.timestamp
          )
        ) {
          loggerRef.current.log(
            notification.id,
            notification.source,
            "dismissed"
          );
          return;
        }

        // Rate limiting check
        if (
          rateLimiterRef.current.shouldThrottle(
            notification.source,
            notification.id
          )
        ) {
          loggerRef.current.log(
            notification.id,
            notification.source,
            "dismissed"
          );
          return;
        }

        console.log("➕ ADDING TO QUEUE:", {
          id: notification.id,
          queueBefore: (queueEngineRef.current as any).queue?.length || 0,
        });

        // Add to queue
        queueEngineRef.current.add(notification);

        console.log("✅ ADDED TO QUEUE:", {
          id: notification.id,
          queueAfter: (queueEngineRef.current as any).queue?.length || 0,
          visibleCount: queueEngineRef.current.getVisible().length || 0,
        });

        // Update replay state
        replayStateRef.current = updateReplayState(
          replayStateRef.current,
          notification
        );

        // Log
        loggerRef.current.log(
          notification.id,
          notification.source,
          "received"
        );

        // Notify parent
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

      // Update visible notifications
      updateVisibleNotifications();
    },
    [onNotificationReceived]
  );

  // Micro-batcher instance
  const microBatcherRef = useRef(
    new NotificationMicroBatcher(handleBatchedRelease)
  );

  // FIX 7: Soft rate-limit UI updates (prevents too many updates too fast)
  const flushUiUpdateBuffer = useCallback(() => {
    if (uiUpdateBufferRef.current.length === 0) return;
    
    const updates = [...uiUpdateBufferRef.current];
    uiUpdateBufferRef.current = [];
    
    // FIX 4: Batch notification state updates (prevents layout thrashing)
    unstable_batchedUpdates(() => {
      updates.forEach((update) => update());
    });
  }, []);

  // Update visible notifications from queue engine
  const updateVisibleNotifications = useCallback(() => {
    const now = Date.now();
    
    // FIX 7: Soft rate-limit UI updates
    if (now - lastUiUpdateRef.current < UI_UPDATE_THROTTLE_MS) {
      // Buffer the update instead of executing immediately
      uiUpdateBufferRef.current.push(() => {
        updateVisibleNotificationsInternal();
      });
      return;
    }
    
    lastUiUpdateRef.current = now;
    updateVisibleNotificationsInternal();
    flushUiUpdateBuffer(); // Flush any buffered updates
  }, [dismissed, muted, visibleNotifications, flushUiUpdateBuffer]);

  const updateVisibleNotificationsInternal = useCallback(() => {
    const now = Date.now();

    // Auto-dismiss notifications that have been inactive (only side effect before comparing)
    const currentVisible = queueEngineRef.current.getVisible();
    currentVisible.forEach((notification) => {
      const notificationId = notification.id;
      const lastInteraction = lastInteractionRef.current.get(notificationId) || notification.timestamp.getTime();
      const inactiveTime = now - lastInteraction;
      if (inactiveTime >= INACTIVITY_DISMISS_MS && !notification.isCritical) {
        handleDismiss(notificationId);
      }
    });

    const visible = queueEngineRef.current.updateVisible(dismissed, muted);

    // Skip re-processing and state update when nothing changed
    const same =
      visible.length === visibleNotifications.length &&
      visible.every((n, i) => n.id === visibleNotifications[i]?.id);
    if (same) return;

    // Initialize interaction time for new notifications
    visible.forEach((n) => {
      if (!lastInteractionRef.current.has(n.id)) {
        lastInteractionRef.current.set(n.id, n.timestamp.getTime());
      }
    });

    const updated = new Set<string>();
    visible.forEach((n) => {
      const existing = visibleNotifications.find(
        (existing) => existing.id === n.id || existing.groupKey === n.groupKey
      );
      if (existing) {
        const existingCount = existing.metadata?.messageCount ||
                             existing.metadata?.groupedMessages?.length ||
                             1;
        const newCount = n.metadata?.groupedMessages?.length || n.metadata?.messageCount ||
                        n.metadata?.groupedMessages?.length ||
                        1;
        if (newCount > existingCount) {
          updated.add(n.id);
          setTimeout(() => {
            setUpdatedNotifications((prev) => {
              const next = new Set(prev);
              next.delete(n.id);
              return next;
            });
          }, 2000);
        }
      }
    });

    unstable_batchedUpdates(() => {
      setUpdatedNotifications((prev) => {
        const combined = new Set(prev);
        updated.forEach(id => combined.add(id));
        return combined;
      });
      setVisibleNotifications(visible);
    });

    visible.forEach((n) => {
      loggerRef.current.log(n.id, n.source, "rendered");
    });
  }, [dismissed, muted, visibleNotifications]);

  const clearConversationNotifications = useCallback(
    (conversationId: string) => {
      const groupKey = `whatsapp:${conversationId}`;
      const queueEngine = queueEngineRef.current as any;
      queueEngine.queue = queueEngine.queue.filter(
        (n: UnifiedNotification) => n.id !== conversationId && n.groupKey !== groupKey
      );
      queueEngine.visible = queueEngine.visible.filter(
        (n: UnifiedNotification) => n.id !== conversationId && n.groupKey !== groupKey
      );
      setDismissed((prev) => {
        const next = new Map(prev);
        next.delete(conversationId);
        next.delete(groupKey);
        return next;
      });
      updateVisibleNotifications();
    },
    [updateVisibleNotifications]
  );

  // Persist per-conversation lastReadAt locally and clear notifications
  const persistLastReadAt = useCallback(
    (conversationId: string, timestampMs?: number) => {
      if (typeof window === "undefined") return;
      const ts = timestampMs || Date.now();
      const next = new Map(lastReadAtRef.current);
      next.set(conversationId, ts);
      lastReadAtRef.current = next;
      try {
        const asObject: Record<string, string> = {};
        next.forEach((value, key) => {
          asObject[key] = new Date(value).toISOString();
        });
        localStorage.setItem("whatsapp_last_read_at", JSON.stringify(asObject));
      } catch (err) {
        console.error("Failed to persist lastReadAt to storage", err);
      }
      clearConversationNotifications(conversationId);
    },
    [clearConversationNotifications]
  );

  // Hydrate cross-tab state on mount
  useEffect(() => {
    hydrateArchivedFromStorage();
    hydrateLastReadFromStorage();
    hydrateActiveConversationFromStorage();

    if (typeof window !== "undefined") {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === "whatsapp_archived_conversations") {
          hydrateArchivedFromStorage();
          if (event.newValue) {
            try {
              const parsed = JSON.parse(event.newValue);
              if (Array.isArray(parsed)) {
                parsed.forEach((id: string) =>
                  clearConversationNotifications(id)
                );
              } else if (parsed && typeof parsed === "object") {
                Object.keys(parsed).forEach((id) =>
                  clearConversationNotifications(id)
                );
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
        if (event.key === "whatsapp_last_read_at") {
          hydrateLastReadFromStorage();
          if (event.newValue) {
            try {
              const nextMap = JSON.parse(event.newValue) || {};
              const prevMap = event.oldValue ? JSON.parse(event.oldValue) : {};
              Object.keys(nextMap).forEach((conversationId) => {
                if (nextMap[conversationId] !== prevMap[conversationId]) {
                  clearConversationNotifications(conversationId);
                }
              });
            } catch {
              // Ignore parse errors
            }
          }
        }
        if (event.key === "whatsapp_active_conversation") {
          hydrateActiveConversationFromStorage();
        }
        if (event.key === "whatsapp_muted_conversations") {
          setMutedWhatsAppConversations(getMutedWhatsAppConversations());
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
  }, [
    hydrateArchivedFromStorage,
    hydrateLastReadFromStorage,
    hydrateActiveConversationFromStorage,
    clearConversationNotifications,
    getMutedWhatsAppConversations,
  ]);

  // Fetch archived conversations to keep archive filter accurate
  // Only fetch once on mount or when access/token changes, not on every render
  useEffect(() => {
    if (!hasWhatsAppAccess || !token) return;
    const fetchArchived = async () => {
      try {
        const res = await axios.get("/api/whatsapp/conversations/archive");
        const ids =
          res.data?.conversations?.map(
            (conv: any) => conv._id || conv.conversationId
          ) || [];
        archivedConversationIdsRef.current = new Set(
          ids.filter(Boolean) as string[]
        );
        // Clear notifications for archived conversations
        archivedConversationIdsRef.current.forEach((id) =>
          clearConversationNotifications(id)
        );
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "whatsapp_archived_conversations",
            JSON.stringify(Array.from(archivedConversationIdsRef.current))
          );
        }
      } catch (err) {
        console.error("Failed to fetch archived conversations for notifications", err);
      }
    };
    fetchArchived();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWhatsAppAccess, token]); // Removed clearConversationNotifications - it's stable enough via ref

  // Request browser notification permission only after a user gesture
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log(`🔔 [PERMISSION] Notifications not supported`);
      return;
    }
    
    const currentPermission = Notification.permission;
    console.log(`🔔 [PERMISSION] Current permission: ${currentPermission}`);
    
    if (currentPermission === "granted") {
      setNotificationPermission("granted");
      console.log(`🔔 [PERMISSION] Permission already granted`);
      return;
    }

    const requestOnce = () => {
      if (permissionRequestedRef.current) return;
      permissionRequestedRef.current = true;
      console.log(`🔔 [PERMISSION] Requesting notification permission...`);
      Notification.requestPermission()
        .then((permission) => {
          console.log(`🔔 [PERMISSION] Permission result: ${permission}`);
          setNotificationPermission(permission);
        })
        .catch((err) => {
          console.error(`🔔 [PERMISSION] Error requesting permission:`, err);
          setNotificationPermission(Notification.permission);
        });
      detach();
    };

    const events = ["click", "keydown", "touchstart"];
    const detach = () =>
      events.forEach((evt) =>
        window.removeEventListener(evt, requestOnce, true)
      );
    events.forEach((evt) => window.addEventListener(evt, requestOnce, true));

    return detach;
  }, []);

  // Debug visibility changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    
    const handleVisibilityChange = () => {
      console.log(`👁️ [VISIBILITY CHANGE] New state: ${document.visibilityState}`);
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Eligibility check for system notifications
  const isSystemNotificationEligible = useCallback(
    (notification: RawSystemNotification): boolean => {
      // SuperAdmin receives all
      if (userRole === "SuperAdmin") return true;

      const { target } = notification;

      if (target.allUsers) return true;

      if (target.roles && target.roles.length > 0) {
        if (!target.roles.includes(userRole)) return false;
      }

      if (target.locations && target.locations.length > 0) {
        const normalizedUserLocations = userLocations.map((loc: string) =>
          loc.toLowerCase().trim()
        );
        const normalizedTargetLocations = target.locations.map((loc: string) =>
          loc.toLowerCase().trim()
        );

        const hasLocationMatch =
          normalizedUserLocations.some((loc: string) =>
            normalizedTargetLocations.includes(loc)
          ) || normalizedUserLocations.includes("all");

        if (!hasLocationMatch) return false;
      }

      return true;
    },
    [userRole, userLocations]
  );

  // Handle system notification
  // CRITICAL: Store handler in ref to prevent socket re-attachment
  const handleSystemNotification = useCallback(
    (data: any) => {
      const rawNotification: RawSystemNotification = data.notification;

      // Eligibility check
      if (!isSystemNotificationEligible(rawNotification)) {
        return;
      }

      // Expiry check
      if (rawNotification.expiresAt) {
        const expiresAt = new Date(rawNotification.expiresAt);
        if (expiresAt <= new Date()) return;
      }

      // Skip if dismissed or muted
      if (dismissed.has(rawNotification._id)) return;
      if (
        rawNotification.type !== "critical" &&
        muted.has(rawNotification._id)
      ) {
        return;
      }

      // Normalize and add to micro-batcher
      const normalized = normalizeSystemNotification(rawNotification);
      microBatcherRef.current.add(normalized);
    },
    [isSystemNotificationEligible, dismissed, muted, router]
  );
  
  // Update ref whenever handler changes (but socket listener stays attached)
  handleSystemNotificationRef.current = handleSystemNotification;
  
  // Update ref whenever handler changes (but socket listener stays attached)
  handleSystemNotificationRef.current = handleSystemNotification;

  // Helper: Check if message is actually new (not typing indicator, delivery status, or duplicate)
  const checkIfMessageIsNew = useCallback((
    normalized: UnifiedNotification,
    existingNotification: UnifiedNotification,
    rawMessage: any
  ): boolean => {
    // Skip typing indicators and delivery status updates
    if (rawMessage.type === "typing" || rawMessage.type === "delivery" || rawMessage.type === "read") {
      return false;
    }
    
    // Check if message timestamp is newer than existing notification
    const existingTimestamp = existingNotification.timestamp.getTime();
    const newTimestamp = normalized.timestamp.getTime();
    
    if (newTimestamp <= existingTimestamp) {
      // Message is not newer, likely a duplicate
      return false;
    }
    
    // Check if message ID is different (for deduplication)
    const existingMessageId = existingNotification.metadata?.lastMessageId;
    const newMessageId = rawMessage.messageId || rawMessage.id;
    
    if (existingMessageId && newMessageId === existingMessageId) {
      // Same message ID, likely duplicate webhook
      return false;
    }
    
    // Check if message content is actually different
    const existingContent = existingNotification.message;
    const newContent = normalized.message;
    
    if (existingContent === newContent && newTimestamp - existingTimestamp < 2000) {
      // Same content within 2 seconds, likely duplicate
      return false;
    }
    
    return true;
  }, []);

  // Centralized eligibility gate for WhatsApp notifications
  const shouldSkipWhatsAppNotification = useCallback(
    (payload: RawWhatsAppMessage): boolean => {
      const { conversationId, message } = payload;
      if (!conversationId || !message) return true;

      // Archived or muted conversations never notify
      if (archivedConversationIdsRef.current.has(conversationId)) return true;
      if (mutedWhatsAppConversations.has(conversationId)) return true;

      // Internal / "You" messages never notify
      const participantName =
        (payload as any).participantName || message.senderName || "";
      const messageSource = (message as any).source;
      const isInternalMessage =
        messageSource === "internal" ||
        (message as any).isInternal ||
        participantName.toLowerCase() === "you";
      if (isInternalMessage) {
        return true;
      }

      // Skip if already read (per-user lastReadAt cache)
      const messageTimestamp = new Date(
        (message as any).timestamp || (payload as any).createdAt || Date.now()
      ).getTime();
      const lastReadAt = lastReadAtRef.current.get(conversationId);
      if (lastReadAt && messageTimestamp <= lastReadAt) return true;

      // Skip if user is actively viewing this conversation and tab is visible
      let activeConversationId = activeConversationIdRef.current;
      if (!activeConversationId && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("whatsapp_active_conversation");
          const parsed = raw ? JSON.parse(raw) : null;
          activeConversationId = parsed?.conversationId || null;
        } catch {
          activeConversationId = null;
        }
      }

      if (
        activeConversationId &&
        activeConversationId === conversationId &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        return true;
      }

      return false;
    },
    [mutedWhatsAppConversations]
  );

  // Browser notification (only when tab hidden)
  const showBrowserNotification = useCallback(
    (normalized: UnifiedNotification, raw: RawWhatsAppMessage) => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        typeof document === "undefined"
      ) {
        console.log(`🔔 [BROWSER NOTIF] Skipping - window/document not available`);
        return;
      }
      
      // Double-check visibility (should already be checked, but be safe)
      if (document.visibilityState !== "hidden") {
        console.log(`🔔 [BROWSER NOTIF] Skipping - tab is visible (state: ${document.visibilityState})`);
        return;
      }

      const permission =
        notificationPermission || Notification.permission || "default";
      if (permission !== "granted") {
        console.log(`🔔 [BROWSER NOTIF] Skipping - permission not granted (${permission})`);
        return;
      }

      console.log(`🔔 [BROWSER NOTIF] Showing notification for ${normalized.title}: ${normalized.message}`);
      const notif = new Notification(normalized.title, {
        body: normalized.message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: normalized.id,
        data: {
          conversationId: raw.conversationId,
          participantPhone: raw.message?.from,
        },
      });

      notif.onclick = () => {
        try {
          notif.close();
        } catch {
          /* no-op */
        }
        window.focus();
        if (raw.conversationId) {
          persistLastReadAt(raw.conversationId);
          fetch("/api/whatsapp/conversations/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: raw.conversationId }),
          }).catch(() => {});
        }
        if (raw.message?.from) {
          router.push(
            `/whatsapp?phone=${encodeURIComponent(raw.message.from)}`
          );
        } else if (raw.conversationId) {
          router.push(`/whatsapp?conversationId=${raw.conversationId}`);
        } else {
          router.push("/whatsapp");
        }
      };
    },
    [notificationPermission, persistLastReadAt, router]
  );

  // Handle WhatsApp message (per-user notifications)
  const handleWhatsAppMessage = useCallback(
    (data: RawWhatsAppMessage, opts?: { skipDedup?: boolean }) => {
      console.log("📨📨📨 HANDLE_WHATSAPP_MESSAGE CALLED:", {
        timestamp: new Date().toISOString(),
        eventId: data.eventId,
        conversationId: data.conversationId,
        skipDedup: opts?.skipDedup,
        hasAccess: hasWhatsAppAccess,
        hasToken: !!token,
        seenSetSize: seenEventIdsRef.current.size,
        alreadySeen: data.eventId
          ? seenEventIdsRef.current.has(data.eventId)
          : false,
      });

      if (!hasWhatsAppAccess || !token) {
        console.log("⏭️ [SKIP] No WhatsApp access or token");
        return;
      }

      const { conversationId, message, businessPhoneId, assignedAgent, eventId, userId: targetUserId, deliveryId, createdAt } = data;
      if (!conversationId || !message) {
        console.log(`⏭️ [SKIP] Missing conversationId or message`);
        return;
      }

      // CRITICAL: Only process notifications meant for this user
      if (targetUserId && userId && targetUserId !== userId.toString()) {
        console.log(`⏭️ [SKIP] Notification eventId=${eventId} is for user ${targetUserId}, not current user ${userId}`);
        return;
      }

      // FIX 3: Server-side event acknowledgement check
      if (deliveryId) {
        if (acknowledgedDeliveryIdsRef.current.has(deliveryId)) {
          console.log(`⏭️ [ACKED] Delivery ${deliveryId} already acknowledged, skipping`);
          return;
        }
        // Acknowledge immediately (prevent replay on reconnect)
        acknowledgedDeliveryIdsRef.current.add(deliveryId);
        // Keep only last 1000 delivery IDs
        if (acknowledgedDeliveryIdsRef.current.size > 1000) {
          const array = Array.from(acknowledgedDeliveryIdsRef.current);
          acknowledgedDeliveryIdsRef.current = new Set(array.slice(-1000));
        }
        // Send ACK to server (optional, for server-side tracking)
        if (socket) {
          socket.emit("notification-ack", { deliveryId });
        }
      }

      if (!opts?.skipDedup) {
        // CRITICAL: Deduplicate by eventId FIRST (per-user, per-message)
        // Use ref for synchronous check to prevent race conditions
        // This must happen BEFORE any other processing to prevent duplicates
        if (eventId) {
          if (seenEventIdsRef.current.has(eventId)) {
            console.log(`⏭️ [DUPLICATE] Event ${eventId} already seen, skipping (seen set size: ${seenEventIdsRef.current.size})`);
            return; // EARLY RETURN - prevent all duplicate processing
          }
          // Mark as seen IMMEDIATELY (synchronous) - BEFORE any async operations
          seenEventIdsRef.current.add(eventId);
          // Keep only last 1000 event IDs to prevent memory leak
          if (seenEventIdsRef.current.size > 1000) {
            const array = Array.from(seenEventIdsRef.current);
            seenEventIdsRef.current = new Set(array.slice(-1000));
          }
          console.log(`✅ [NEW EVENT] Added eventId ${eventId} to seen set (total: ${seenEventIdsRef.current.size})`);
        } else {
          console.warn(`⚠️ [WARNING] Notification missing eventId, cannot deduplicate properly - REJECTING`);
          return; // REJECT notifications without eventId to prevent duplicates
        }
      }

      // Only incoming messages
      if (message.direction !== "incoming") return;

      // Sales user filtering (backend already filtered, but double-check)
      if (userRole === "Sales" && userId) {
        if (
          assignedAgent &&
          assignedAgent.toString() !== userId.toString()
        ) {
          return;
        }
      }

      // Location filtering (skip for SuperAdmin)
      if (userRole !== "SuperAdmin") {
        try {
          const allowedPhoneIds = getAllowedPhoneIds(userRole, userLocations);
          if (!allowedPhoneIds.includes(businessPhoneId)) {
            return;
          }
        } catch (err) {
          console.error("Error checking phone access:", err);
          return;
        }
      }

      // Centralized eligibility (archive/mute/internal/read/active tab)
      if (shouldSkipWhatsAppNotification(data)) {
        return;
      }

      // Normalize the notification (in-app toast only; browser handled by controller)
      const normalized = normalizeWhatsAppNotification(data);
      const groupKey = normalized.groupKey || normalized.id;

      // Check if there's an existing notification for this conversation
      const existingNotification = queueEngineRef.current.getNotification(groupKey);
      
      // Always process messages from same conversation - update existing or create new
      if (existingNotification && !mutedWhatsAppConversations.has(conversationId)) {
        // CRITICAL: Check if this exact message ID is already in the existing notification
        const existingMessageId = normalized.metadata?.lastMessageId;
        const existingGroupedMessages = existingNotification.metadata?.groupedMessages || [];
        const isDuplicateMessage = existingGroupedMessages.some(
          (msg: UnifiedNotification) => msg.metadata?.lastMessageId === existingMessageId
        ) || existingNotification.metadata?.lastMessageId === existingMessageId;
        
        if (isDuplicateMessage) {
          console.log(`⏭️ [DUPLICATE MESSAGE] Message ${existingMessageId} already in notification, skipping`);
          return;
        }
        
        // Check if this is actually a new message (not typing indicator, delivery status, or duplicate)
        const isActuallyNew = checkIfMessageIsNew(
          normalized,
          existingNotification,
          message
        );
        
        if (!isActuallyNew) {
          // Not a real new message, skip revival
          return;
        }
        // Update existing notification instead of creating new one
        // Access private groupedWhatsApp map via queue engine
        const queueEngine = queueEngineRef.current as any;
        if (!queueEngine.groupedWhatsApp) {
          queueEngine.groupedWhatsApp = new Map();
        }
        
        // Get or create group - extract existing messages if already grouped
        if (!queueEngine.groupedWhatsApp.has(groupKey)) {
          // If existing notification has grouped messages, use those
          const existingMessages = existingNotification.metadata?.groupedMessages || [existingNotification];
          queueEngine.groupedWhatsApp.set(groupKey, existingMessages);
        }
        const group = queueEngine.groupedWhatsApp.get(groupKey)!;
        
        // Check if this exact message is already in the group (dedupe by message ID/timestamp)
        const isDuplicate = group.some((n: UnifiedNotification) => {
          const sameId = n.id === normalized.id;
          const sameConversation = n.metadata?.conversationId === normalized.metadata?.conversationId;
          const sameTime = Math.abs(n.timestamp.getTime() - normalized.timestamp.getTime()) < 1000; // Within 1 second
          return sameId || (sameConversation && sameTime);
        });
        
        // Add new message if not duplicate
        if (!isDuplicate) {
          group.push(normalized);
          queueEngine.groupedWhatsApp.set(groupKey, group);
        }
        
        // Create updated grouped notification with incremented count
        const updated = queueEngine.createGroupedNotification(group);
        if (updated) {
          // Update active groups
          if (!queueEngine.activeGroups) {
            queueEngine.activeGroups = new Map();
          }
          queueEngine.activeGroups.set(groupKey, updated);
          
          // Check if dismissed and apply cooldown to prevent visual jitter
          const wasDismissed = dismissed.has(existingNotification.id) || dismissed.has(groupKey);
          const dismissTimestamp = dismissed.get(existingNotification.id) || dismissed.get(groupKey) || 0;
          const lastDismissTime = lastDismissedAt.get(groupKey) || 0;
          const now = Date.now();
          
          // Revive cooldown: if dismissed recently, update silently without re-animation
          const isInCooldown = wasDismissed && (now - lastDismissTime < REVIVE_COOLDOWN_MS);
          
          if (wasDismissed && !isInCooldown) {
            // Remove from dismissed (revive it)
            setDismissed((prev) => {
              const next = new Map(prev);
              next.delete(existingNotification.id);
              next.delete(groupKey);
              return next;
            });
          }
          
          // Update in queue if it exists there
          const queueIndex = queueEngine.queue.findIndex(
            (n: UnifiedNotification) => n.id === groupKey || n.groupKey === groupKey
          );
          if (queueIndex !== -1) {
            queueEngine.queue[queueIndex] = updated;
          } else if (wasDismissed) {
            // If it was dismissed, add to queue so it can appear again
            if (updated.isCritical) {
              queueEngine.queue.unshift(updated);
            } else {
              queueEngine.queue.push(updated);
            }
          }
          
          // Update visible if it's visible, or make it visible if it was dismissed
          const visibleIndex = queueEngine.visible.findIndex(
            (n: UnifiedNotification) => n.id === groupKey || n.groupKey === groupKey
          );
          if (visibleIndex !== -1) {
            // Update in place
            queueEngine.visible[visibleIndex] = updated;
            setVisibleNotifications([...queueEngine.visible]);
            // Mark as updated for pulse animation (only if not in cooldown)
            if (!isInCooldown) {
              setUpdatedNotifications((prev) => new Set([...prev, updated.id]));
            }
          } else if (wasDismissed && !isInCooldown) {
            // Was dismissed, now revive it - update queue and refresh visible
            // Only if not in cooldown to prevent visual jitter
            updateVisibleNotifications();
          } else if (!wasDismissed) {
            // Not visible and not dismissed, just update queue
            updateVisibleNotifications();
          }
          // If in cooldown and dismissed, update silently without showing
        }
      } else {
        // New conversation (no existing notification), add to micro-batcher normally
        microBatcherRef.current.add(normalized);
      }
    },
    [
      hasWhatsAppAccess,
      token,
      userRole,
      userId,
      userLocations,
      mutedWhatsAppConversations,
      dismissed,
      checkIfMessageIsNew,
      router,
      shouldSkipWhatsAppNotification,
      showBrowserNotification,
    ]
  );

  // Initialize cross-tab notification controller (singleton per tab)
  useEffect(() => {
    notificationController.init({
      hasWhatsAppAccess,
      userId,
      userRole,
      userLocations,
      getMuted: () => mutedWhatsAppConversations,
      getArchived: getArchivedConversationIds,
      getLastReadAt: getLastReadForConversation,
      getActiveConversationId,
      isTabVisible,
      isOnWhatsAppRoute,
      onInApp: (raw) => handleWhatsAppMessage(raw, { skipDedup: true }),
      onBrowser: (raw) =>
        showBrowserNotification(normalizeWhatsAppNotification(raw), raw),
    });
  }, [
    notificationController,
    hasWhatsAppAccess,
    userId,
    userRole,
    userLocations,
    mutedWhatsAppConversations,
    getArchivedConversationIds,
    getLastReadForConversation,
    getActiveConversationId,
    isTabVisible,
    isOnWhatsAppRoute,
    handleWhatsAppMessage,
    showBrowserNotification,
  ]);

  // Socket replay on reconnect (SYSTEM NOTIFICATIONS ONLY - not WhatsApp)
  // CRITICAL: Replay only fetches missed system notifications, does NOT trigger WhatsApp toasts
  // WhatsApp notifications come ONLY from real-time socket events, never from replay
  useEffect(() => {
    if (!socket || !isConnected || !token) return;

    const handleReconnect = async () => {
      console.log("🔄 [REPLAY] Socket reconnected, fetching missed SYSTEM notifications only...");

      // Fetch missed system notifications ONLY (not WhatsApp)
      const missed = await fetchMissedSystemNotifications(
        replayStateRef.current.lastNotificationTimestamp
      );

      // Process missed SYSTEM notifications only
      missed.forEach((raw: RawSystemNotification) => {
        if (isSystemNotificationEligible(raw)) {
          const normalized = normalizeSystemNotification(raw);
          microBatcherRef.current.add(normalized);
        }
      });

      console.log(`✅ [REPLAY] Replayed ${missed.length} missed SYSTEM notifications (WhatsApp NOT replayed)`);
    };

    // Listen for reconnect
    socket.io.on("reconnect", handleReconnect);

    // Also check on initial connect
    if (isConnected) {
      handleReconnect();
    }

    return () => {
      socket.io.off("reconnect", handleReconnect);
    };
  }, []); // Empty array - handlers are stable, socket refs are stable

  useEffect(() => {
    if (!socket || !token) return;

    const handler = (data: any) => {
      // Call latest handler via ref
      if (handleSystemNotificationRef.current) {
        handleSystemNotificationRef.current(data);
      }
    };

    socket.on("system-notification", handler);

    return () => {
      socket.off("system-notification", handler);
    };
  }, [socket, token]);

  // Update WhatsApp handler ref whenever handler changes
  handleWhatsAppMessageRef.current = handleWhatsAppMessage;

  // Listen for WhatsApp notification cleared events only
  // NOTE: The whatsapp-new-message listener is registered ONCE in whatsapp.tsx
  // to avoid duplicate processing. This component only handles notification clearing.
  useEffect(() => {
    if (!hasWhatsAppAccess || !socket || !token) return;

    const handleCleared = (data: any) => {
      // When notifications are cleared, remove from visible and queue
      if (data.clearedAll) {
        // Clear all WhatsApp notifications
        const queueEngine = queueEngineRef.current as any;
        queueEngine.queue = queueEngine.queue.filter(
          (n: UnifiedNotification) => n.source !== "whatsapp"
        );
        queueEngine.visible = queueEngine.visible.filter(
          (n: UnifiedNotification) => n.source !== "whatsapp"
        );
        updateVisibleNotifications();
      } else if (data.conversationId) {
        // Clear one conversation
        const groupKey = `whatsapp:${data.conversationId}`;
        const queueEngine = queueEngineRef.current as any;
        queueEngine.queue = queueEngine.queue.filter(
          (n: UnifiedNotification) => n.id !== data.conversationId && n.groupKey !== groupKey
        );
        queueEngine.visible = queueEngine.visible.filter(
          (n: UnifiedNotification) => n.id !== data.conversationId && n.groupKey !== groupKey
        );
        updateVisibleNotifications();
      }
    };

    socket.on("whatsapp-notifications-cleared", handleCleared);

    return () => {
      socket.off("whatsapp-notifications-cleared", handleCleared);
    };
  }, [socket, hasWhatsAppAccess, token]); // Dependencies for safety

  // Periodic queue update (for inactivity-based auto-dismiss)
  useEffect(() => {
    const interval = setInterval(() => {
      updateVisibleNotifications();
    }, 500); // Check every 500ms for smoother inactivity tracking

    return () => clearInterval(interval);
  }, [updateVisibleNotifications]);

  // Periodic flush of UI update buffer (FIX 7)
  useEffect(() => {
    const interval = setInterval(() => {
      flushUiUpdateBuffer();
    }, UI_UPDATE_THROTTLE_MS);

    return () => clearInterval(interval);
  }, [flushUiUpdateBuffer]);

  // Cleanup rate limiter periodically
  useEffect(() => {
    const interval = setInterval(() => {
      rateLimiterRef.current.cleanup();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  // Cleanup old dismissed notifications (prevent memory leak)
  useEffect(() => {
    const interval = setInterval(() => {
      setDismissed((prev) => {
        const now = Date.now();
        const cleaned = new Map<string, number>();
        for (const [id, timestamp] of prev.entries()) {
          if (now - timestamp < DISMISSED_TTL_MS) {
            cleaned.set(id, timestamp);
          }
        }
        return cleaned;
      });
    }, 5 * 60 * 1000); // Cleanup every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleDismiss = useCallback(
    async (notificationId: string) => {
      const now = Date.now();
      
      // Dismiss does NOT mute - just removes from visible
      setDismissed((prev) => {
        const next = new Map(prev);
        next.set(notificationId, now);
        return next;
      });
      
      // Track dismissal time for cooldown
      setLastDismissedAt((prev) => {
        const next = new Map(prev);
        next.set(notificationId, now);
        return next;
      });
      
      // Clean up interaction tracking
      lastInteractionRef.current.delete(notificationId);
      
      // Also dismiss by groupKey if it's a WhatsApp notification
      const notification = visibleNotifications.find(
        (n) => n.id === notificationId
      );
      if (notification?.groupKey) {
        setDismissed((prev) => {
          const next = new Map(prev);
          next.set(notification.groupKey!, now);
          return next;
        });
        setLastDismissedAt((prev) => {
          const next = new Map(prev);
          next.set(notification.groupKey!, now);
          return next;
        });
      }
      
      loggerRef.current.log(
        notificationId,
        notification?.source || "system",
        "dismissed"
      );

      // Mark as read on server (only for system notifications)
      if (notification && notification.source === "system") {
        try {
          await axios.post("/api/notifications/read", {
            notificationId,
          });
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      }

      // Update visible notifications (next one will appear)
      setTimeout(() => {
        updateVisibleNotifications();
      }, 100);
    },
    [visibleNotifications, updateVisibleNotifications]
  );

  const handleMute = useCallback(
    (notificationId: string) => {
      // Mute is explicit and separate from dismiss
      setMuted((prev) => new Set([...prev, notificationId]));
      
      // Also mute by groupKey if it's a WhatsApp notification
      const notification = visibleNotifications.find(
        (n) => n.id === notificationId
      );
      if (notification?.groupKey) {
        setMuted((prev) => new Set([...prev, notification.groupKey!]));
      }
      
      // Dismiss the current toast
      handleDismiss(notificationId);
    },
    [handleDismiss, visibleNotifications]
  );

  const handleMuteWhatsApp = useCallback(
    (conversationId: string) => {
      // Mute is explicit - store in localStorage with TTL
      const muted = getMutedWhatsAppConversations();
      muted.add(conversationId);
      if (typeof window !== "undefined") {
        const mutedObj: Record<string, number> = {};
        muted.forEach((id) => {
          mutedObj[id] = Date.now();
        });
        localStorage.setItem(
          "whatsapp_muted_conversations",
          JSON.stringify(mutedObj)
        );
      }
      setMutedWhatsAppConversations(new Set(muted));
      
      // Also add to muted set for queue engine
      const groupKey = `whatsapp:${conversationId}`;
      setMuted((prev) => new Set([...prev, conversationId, groupKey]));
      
      // Dismiss the current toast
      handleDismiss(conversationId);
    },
    [getMutedWhatsAppConversations, handleDismiss]
  );

  const handleClearWhatsApp = useCallback(
    async (conversationId: string) => {
      try {
        // Call backend to clear notifications (reset unreadCount)
        await axios.post("/api/whatsapp/notifications/clear", {
          conversationId,
        });
        
        console.log(`🧹 [CLEAR] Cleared notifications for conversation: ${conversationId}`);
        
        // Dismiss the notification toast
        handleDismiss(conversationId);
        
        loggerRef.current.log(conversationId, "whatsapp", "cleared");
      } catch (error) {
        console.error("❌ [ERROR] Error clearing WhatsApp notifications:", error);
      }
    },
    [handleDismiss]
  );

  const toggleExpand = useCallback((notificationId: string) => {
    setExpanded((prev) => {
      const newMap = new Map(prev);
      newMap.set(notificationId, !newMap.get(notificationId));
      return newMap;
    });
  }, []);

  // Visual config
  const getSeverityConfig = useCallback(
    (severity: NotificationSeverity) => {
      switch (severity) {
        case "critical":
          return {
            icon: AlertTriangle,
            color: "bg-red-500",
            borderColor: "border-red-500",
            textColor: "text-red-600",
            bgColor: "bg-red-50 dark:bg-red-950/20",
            animation: "animate-pulse",
          };
        case "warning":
          return {
            icon: AlertCircle,
            color: "bg-yellow-500",
            borderColor: "border-yellow-500",
            textColor: "text-yellow-600",
            bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
            animation: "",
          };
        case "whatsapp":
          return {
            icon: FaWhatsapp,
            color: "bg-green-500",
            borderColor: "border-green-500",
            textColor: "text-green-600",
            bgColor: "bg-green-50 dark:bg-green-950/20",
            animation: "",
          };
        default:
          return {
            icon: Info,
            color: "bg-blue-500",
            borderColor: "border-blue-500",
            textColor: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950/20",
            animation: "",
          };
      }
    },
    []
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* FIX 6: CSS for disabling re-entry animations on updates */}
      <style dangerouslySetInnerHTML={{__html: `
        [data-updating="true"] {
          animation: none !important;
          transition: none !important;
        }
      `}} />
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {visibleNotifications.map((notification) => {
        if (dismissed.has(notification.id) || (notification.groupKey && dismissed.has(notification.groupKey))) {
          return null;
        }

        const config = getSeverityConfig(notification.severity);
        const Icon = config.icon;
        const isExpanded = expanded.get(notification.id) || false;

         const wasUpdated = updatedNotifications.has(notification.id);
         const messageCount = notification.metadata?.groupedMessages?.length || notification.metadata?.messageCount || 
                              notification.metadata?.groupedMessages?.length || 
                              1;

         // Track user interactions to reset inactivity timer
         const handleInteraction = () => {
           lastInteractionRef.current.set(notification.id, Date.now());
         };

         // FIX 5: Stable notification keys (NON-NEGOTIABLE)
         // Use conversationId for WhatsApp, notification.id for system
         const stableKey = notification.source === "whatsapp" 
           ? notification.metadata?.conversationId || notification.id
           : notification.id;
         
         // FIX 6: Disable re-entry animations for updates
         const existingNotification = visibleNotifications.find(
           (n) => n.id === notification.id || n.groupKey === notification.groupKey
         );
         const isUpdating = wasUpdated && existingNotification !== undefined;
         
         return (
           <Card
             key={stableKey} // STABLE KEY: Never changes for same conversation
             data-updating={isUpdating ? "true" : undefined} // For CSS animation control
             className={cn(
               "p-4 shadow-lg border-2",
               !isUpdating && "animate-in slide-in-from-top", // Only animate on creation
               config.borderColor,
               config.bgColor,
               config.animation,
               notification.isCritical && "ring-2 ring-red-500",
               wasUpdated && !isUpdating && "animate-pulse" // Pulse only for new updates, not stacked
             )}
             onMouseEnter={handleInteraction}
             onMouseMove={handleInteraction}
             onClick={handleInteraction}
           >
            <div className="flex items-start gap-3">
              <div className={cn("flex-shrink-0 p-2 rounded-full", config.color)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       <h4 className="font-semibold text-sm">{notification.title}</h4>
                       <Badge
                         variant="outline"
                         className={cn("text-xs", config.textColor, config.borderColor)}
                       >
                         {notification.severity === "whatsapp"
                           ? "WhatsApp"
                           : notification.severity}
                       </Badge>
                       {notification.metadata?.groupedMessages && 
                        notification.metadata.groupedMessages.length > 1 && 
                        notification.source === "whatsapp" && (
                         <Badge className="bg-green-600 text-white text-xs">
                           {notification.metadata.groupedMessages.length} new
                         </Badge>
                       )}
                       {notification.isCritical && (
                         <Badge className="bg-red-500 text-white text-xs">
                           Critical
                         </Badge>
                       )}
                     </div>
                    {isExpanded ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {notification.message}
                        </p>
                        {/* Show grouped messages if available */}
                        {notification.metadata?.groupedMessages &&
                          notification.metadata.groupedMessages.length > 1 && (
                            <div className="pl-4 border-l-2 border-muted space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">
                                {notification.metadata.groupedMessages.length} messages:
                              </p>
                              {notification.metadata.groupedMessages.map(
                                (msg, idx) => (
                                  <p
                                    key={idx}
                                    className="text-xs text-muted-foreground"
                                  >
                                    • {msg.message}
                                  </p>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                  </div>
                  {/* Critical notifications cannot be dismissed silently */}
                  {!notification.isCritical && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => handleDismiss(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => toggleExpand(notification.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          More
                        </>
                      )}
                    </Button>
                    {notification.source === "whatsapp" ? (
                      <>
                        {notification.actions?.map((action, idx) => (
                          <Button
                            key={idx}
                            variant={action.variant || "outline"}
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              if (action.label === "Mute") {
                                handleMuteWhatsApp(
                                  notification.metadata?.conversationId ||
                                    notification.id
                                );
                              } else if (action.label === "Open") {
                                // Mark conversation as read when opening
                                if (notification.metadata?.conversationId) {
                                  // Call mark-as-read API
                                  fetch("/api/whatsapp/conversations/read", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      conversationId: notification.metadata.conversationId,
                                    }),
                                  }).catch((err) => {
                                    console.error("Error marking conversation as read:", err);
                                  });
                                persistLastReadAt(notification.metadata.conversationId);
                                }
                                if (notification.metadata?.participantPhone) {
                                  router.push(
                                    `/whatsapp?phone=${encodeURIComponent(notification.metadata.participantPhone)}`
                                  );
                                }
                                handleDismiss(notification.id);
                              } else if (action.label === "Clear") {
                                // Clear WhatsApp notifications (reset unreadCount)
                                if (notification.metadata?.conversationId) {
                                  handleClearWhatsApp(notification.metadata.conversationId);
                                }
                              } else {
                                action.action();
                              }
                            }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </>
                    ) : (
                      !notification.isCritical && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleMute(notification.id)}
                        >
                          Mute
                        </Button>
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
    </>
  );
}
