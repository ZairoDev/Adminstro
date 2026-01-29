import { RawWhatsAppMessage } from "./types";

type BroadcastMessage =
  | { type: "heartbeat"; tabId: string; ts: number }
  | { type: "claim"; tabId: string; ts: number }
  | { type: "release"; tabId: string; ts: number };

interface ControllerOptions {
  hasWhatsAppAccess: boolean;
  userId?: string | null;
  userRole: string;
  userLocations: string[];
  getMuted: () => Set<string>;
  getArchived: () => Set<string>;
  getLastReadAt: (conversationId: string) => number | undefined;
  getActiveConversationId: () => string | null;
  isTabVisible: () => boolean;
  isOnWhatsAppRoute: () => boolean;
  onInApp: (raw: RawWhatsAppMessage) => void;
  onBrowser: (raw: RawWhatsAppMessage) => void;
}

const CHANNEL_NAME = "whatsapp-notification-bus";
const LEADER_KEY = "whatsapp_notification_leader";
const HEARTBEAT_INTERVAL = 3000;
const STALE_LEADER_MS = 8000;

class WhatsAppNotificationController {
  private tabId = `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  private leaderId: string | null = null;
  private lastHeartbeat = 0;
  private channel: BroadcastChannel | null = null;
  private initialized = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private options: ControllerOptions | null = null;

  init(options: ControllerOptions) {
    if (this.initialized) {
      this.options = options; // allow context refresh
      return;
    }
    this.options = options;
    this.initialized = true;
    this.setupChannel();
    this.tryAssumeLeadership();
    this.startHeartbeat();
    window.addEventListener("storage", this.handleStorageLeader);
    window.addEventListener("beforeunload", this.releaseLeadership);
  }

  private setupChannel() {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        this.handleBroadcast(event.data as BroadcastMessage);
      };
    }
  }

  private broadcast(msg: BroadcastMessage) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    try {
      localStorage.setItem(
        `${CHANNEL_NAME}_last`,
        JSON.stringify({ ...msg, origin: this.tabId })
      );
    } catch {
      // ignore
    }
  }

  private handleStorageLeader = (event: StorageEvent) => {
    if (event.key === LEADER_KEY && event.newValue) {
      try {
        const { tabId, ts } = JSON.parse(event.newValue);
        this.leaderId = tabId;
        this.lastHeartbeat = ts;
      } catch {
        /* noop */
      }
    }
    if (event.key === `${CHANNEL_NAME}_last` && event.newValue) {
      try {
        const msg = JSON.parse(event.newValue) as BroadcastMessage & {
          origin?: string;
        };
        if (msg.origin === this.tabId) return;
        this.handleBroadcast(msg);
      } catch {
        /* noop */
      }
    }
  };

  private handleBroadcast(msg: BroadcastMessage) {
    if (msg.type === "heartbeat") {
      if (this.leaderId === msg.tabId || !this.leaderId) {
        this.leaderId = msg.tabId;
        this.lastHeartbeat = msg.ts;
      }
    }
    if (msg.type === "claim") {
      if (!this.leaderId || Date.now() - this.lastHeartbeat > STALE_LEADER_MS) {
        this.leaderId = msg.tabId;
        this.lastHeartbeat = msg.ts;
        this.persistLeader();
      }
    }
    if (msg.type === "release") {
      if (this.leaderId === msg.tabId) {
        this.leaderId = null;
      }
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.ensureLeadership();
      if (this.isLeader()) {
        const ts = Date.now();
        this.lastHeartbeat = ts;
        this.broadcast({ type: "heartbeat", tabId: this.tabId, ts });
        this.persistLeader();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private ensureLeadership() {
    const now = Date.now();
    if (!this.leaderId || now - this.lastHeartbeat > STALE_LEADER_MS) {
      this.tryAssumeLeadership();
    }
  }

  private tryAssumeLeadership() {
    const ts = Date.now();
    this.leaderId = this.tabId;
    this.lastHeartbeat = ts;
    this.broadcast({ type: "claim", tabId: this.tabId, ts });
    this.persistLeader();
  }

  private releaseLeadership = () => {
    const ts = Date.now();
    this.broadcast({ type: "release", tabId: this.tabId, ts });
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    try {
      localStorage.removeItem(LEADER_KEY);
    } catch {
      /* noop */
    }
  };

  private persistLeader() {
    try {
      localStorage.setItem(
        LEADER_KEY,
        JSON.stringify({ tabId: this.leaderId, ts: this.lastHeartbeat })
      );
    } catch {
      /* ignore */
    }
  }

  isLeader() {
    return this.leaderId === this.tabId;
  }

  process(raw: RawWhatsAppMessage) {
    if (!this.options) return;
    const {
      hasWhatsAppAccess,
      getArchived,
      getMuted,
      getLastReadAt,
      getActiveConversationId,
      isTabVisible,
      isOnWhatsAppRoute,
      onInApp,
      onBrowser,
    } = this.options;

    if (!hasWhatsAppAccess) return;
    const { conversationId, message, eventId } = raw;
    if (!conversationId || !message || message.direction !== "incoming") return;

    // Archive / mute
    if (getArchived().has(conversationId)) return;
    if (getMuted().has(conversationId)) return;

    // Internal / "You"
    const participantName =
      (raw as any).participantName || message.senderName || "";
    const messageSource = (message as any).source;
    const isInternalMessage =
      messageSource === "internal" ||
      (message as any).isInternal ||
      participantName.toLowerCase() === "you";
    if (isInternalMessage) return;

    // Read state
    const ts = new Date(
      (message as any).timestamp || (raw as any).createdAt || Date.now()
    ).getTime();
    const lastRead = getLastReadAt(conversationId);
    if (lastRead && ts <= lastRead) return;

    const activeConversationId = getActiveConversationId();
    const tabVisible = isTabVisible();
    const onWhatsApp = isOnWhatsAppRoute();

    const viewingSameConversation =
      tabVisible &&
      activeConversationId &&
      activeConversationId === conversationId;

    const isLeader = this.isLeader();
    const permission = typeof Notification !== "undefined" ? Notification.permission : "default";
    
    // Show browser notification when:
    // 1. This tab is the leader (prevents duplicates across tabs)
    // 2. Browser notification permission is granted
    // 3. Not viewing the same conversation
    // 4. Either: tab not visible, OR on WhatsApp but viewing different conversation
    const shouldShowBrowser =
      isLeader &&
      permission === "granted" &&
      !viewingSameConversation;


    // Filter by current user - skip notifications meant for other users
    const targetUserId = (raw as any).userId;
    const currentUserId = this.options.userId;

    if (targetUserId && currentUserId && targetUserId !== currentUserId.toString()) {
      return;
    }

    if (shouldShowBrowser) {
      onBrowser(raw);
      // Also trigger in-app handling for sidebar updates etc (but skip sound since browser notif handles it)
      if (tabVisible && onWhatsApp) {
        onInApp(raw);
      }
      return;
    }

    // Fallback: in-app only when browser notification not available
    const shouldShowInApp = tabVisible && !viewingSameConversation;
    if (shouldShowInApp) {
      onInApp(raw);
    }
  }
}

let singleton: WhatsAppNotificationController | null = null;
export function getWhatsAppNotificationController() {
  if (!singleton) {
    singleton = new WhatsAppNotificationController();
  }
  return singleton;
}
