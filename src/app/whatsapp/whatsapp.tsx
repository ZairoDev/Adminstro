"use client";
import { useState, useEffect, useRef } from "react";
import type { WhatsAppPhoneConfig } from "@/lib/whatsapp/config";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/AuthStore";
import { useSocket } from "@/hooks/useSocket";
import axios from "axios";
// Card components no longer needed for WhatsApp Web-style layout
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import type { Message, Conversation, Template } from "./types";
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
import { RetargetPanel } from "./components/RetargetPanel";
import { AddGuestModal } from "./components/AddGuestModal";
import { ForwardDialog } from "./components/ForwardDialog";

export default function WhatsAppChat() {
  const { token } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allowedPhoneConfigs, setAllowedPhoneConfigs] = useState<WhatsAppPhoneConfig[]>([]);
  const [selectedPhoneConfig, setSelectedPhoneConfig] = useState<WhatsAppPhoneConfig | null>(null);
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
  const [showingArchived, setShowingArchived] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  
  // Add Guest Modal state
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  
  // Forward Dialog state
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<string[]>([]);
  const [forwardingMessages, setForwardingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [newCountryCode, setNewCountryCode] = useState("91"); // Default to India
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [retargetTemplateParams, setRetargetTemplateParams] = useState<Record<string, string>>({});

  // 24-hour window warning state
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

  // Retargeting state
  const [retargetAudience, setRetargetAudience] = useState<"leads" | "owners">("leads");
  const [retargetPriceFrom, setRetargetPriceFrom] = useState("");
  const [retargetPriceTo, setRetargetPriceTo] = useState("");
  const [retargetFromDate, setRetargetFromDate] = useState("");
  const [retargetToDate, setRetargetToDate] = useState("");
  const [retargetLocation, setRetargetLocation] = useState("");
  
  // Enhanced recipient type with retarget tracking
  type RetargetRecipient = {
    id: string;
    name: string;
    phone: string;
    source: "lead" | "owner";
    status?: "pending" | "sending" | "sent" | "failed";
    error?: string;
    // Retarget tracking fields
    state: "pending" | "retargeted" | "blocked";
    retargetCount: number;
    lastRetargetAt: string | null;
    blocked: boolean;
    blockReason: string | null;
    lastErrorCode: number | null;
    canRetarget: boolean;
    hasEngagement: boolean;
  };
  
  const [retargetRecipients, setRetargetRecipients] = useState<RetargetRecipient[]>([]);
  const [retargetSelectedIds, setRetargetSelectedIds] = useState<string[]>([]);
  const [retargetFetching, setRetargetFetching] = useState(false);
  const [retargetSending, setRetargetSending] = useState(false);
  const [retargetDailyCount, setRetargetDailyCount] = useState(0);
  const [retargetMeta, setRetargetMeta] = useState<{
    maxRetargetAllowed?: number;
    cooldownHours?: number;
    blocked?: number;
    pending?: number;
    retargeted?: number;
    atMaxRetarget?: number;
  }>({});
  const [retargetSentCount, setRetargetSentCount] = useState(0);

  // Readers refresh token (bumps when we receive a real-time read event)
  const [readersRefreshToken, setReadersRefreshToken] = useState(0);

  // Ref to track selected conversation for socket events (avoids stale closure)
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Track daily retarget count (local, reset per day)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("retarget_daily");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const today = new Date().toISOString().slice(0, 10);
        if (parsed?.date === today && typeof parsed?.count === "number") {
          setRetargetDailyCount(parsed.count);
        } else {
          localStorage.setItem("retarget_daily", JSON.stringify({ date: today, count: 0 }));
          setRetargetDailyCount(0);
        }
      } catch (e) {
        setRetargetDailyCount(0);
      }
    } else {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("retarget_daily", JSON.stringify({ date: today, count: 0 }));
      setRetargetDailyCount(0);
    }
  }, []);

useEffect(() => {
  const GetLocations = async () => {
    const response = await axios.get("/api/monthlyTargets/getLocations");

    if (response) {
      const cities = response.data.locations.map(
        (location: any) => location.city
      );
      console.log("cities: ", response.data)

      setLocations(cities);
      // console.log("locations (new):", cities);
    }
  };

  GetLocations();
}, []);


  const persistRetargetDailyCount = (count: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setRetargetDailyCount(count);
    if (typeof window !== "undefined") {
      localStorage.setItem("retarget_daily", JSON.stringify({ date: today, count }));
    }
  };

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

  // Fetch conversations and templates on mount
  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, []);

  // Socket.io event listeners
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 Setting up socket listeners, socket connected:", socket.connected);

    // Join WhatsApp room
    socket.emit("join-whatsapp-room");
    console.log("📱 Emitted join-whatsapp-room");

    // Handle new incoming messages
    socket.on("whatsapp-new-message", (data: any) => {
      console.log("📩 Received whatsapp-new-message event:", data);
      const { conversationId, message } = data;
      const currentConversation = selectedConversationRef.current;

      // Extract display text from content object
      const displayText = typeof message.content === "string" 
        ? message.content 
        : message.content?.text || message.content?.caption || `${message.type} message`;

      // Update conversations list
      // CRITICAL: Frontend must trust backend APIs for unread counts
      // Do NOT increment unreadCount based on socket events
      // Frontend should refetch or rely on backend state updates
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessageContent: displayText,
              lastMessageTime: message.timestamp,
              lastMessageDirection: message.direction,
              // Unread count is backend-authoritative - do not modify here
              // Frontend should refetch conversations to get accurate counts
            };
          }
          return conv;
        });
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageTime || 0).getTime() -
            new Date(a.lastMessageTime || 0).getTime()
        );
      });

      // If this is the open conversation, update timestamp instantly
      if (currentConversation?._id === conversationId) {
        // Update selected conversation timestamp instantly
        setSelectedConversation((prev) => {
          if (prev && prev._id === conversationId) {
            return {
              ...prev,
              lastMessageTime: message.timestamp,
            };
          }
          return prev;
        });
      }

      // Add message to current conversation if selected
      if (currentConversation?._id === conversationId) {
        setMessages((prev) => {
          // If this is a reaction message, update the original message with the reaction
          if (message.type === "reaction" && message.reactedToMessageId) {
            return prev.map((msg) => {
              if (msg.messageId === message.reactedToMessageId) {
                const existingReactions = msg.reactions || [];
                const reactionEmoji = message.reactionEmoji || message.content?.text?.replace("Reacted: ", "") || "👍";
                // Check if this reaction already exists
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

          // Check if message already exists to avoid duplicates
          // Check messageId, _id, and also check if there's a temp message that was updated to this ID
          const exists = prev.find(
            (m) => m.messageId === message.messageId || 
                   m._id === message.id || 
                   m._id === message._id ||
                   // Also check if this is an outgoing message we already added optimistically
                   (message.direction === "outgoing" && m._id?.startsWith?.("temp-") && 
                    m.to === message.to && m.type === message.type &&
                    Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000)
          );
          if (exists) {
            console.log("⚠️ Duplicate message detected, skipping:", message.messageId);
            return prev;
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
            },
          ];
        });

        if (message.direction === "incoming") {
          playNotificationSound();
        }
      } else if (message.direction === "incoming") {
        toast({
          title: `New message from ${message.senderName || message.from}`,
          description: displayText.substring(0, 50),
        });
        playNotificationSound();
      }
    });

    // Handle new conversations
    socket.on("whatsapp-new-conversation", (data: any) => {
      const { conversation } = data;
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === conversation.id);
        if (exists) return prev;
        return [
          {
            _id: conversation.id,
            participantPhone: conversation.participantPhone,
            participantName: conversation.participantName,
            unreadCount: conversation.unreadCount,
            lastMessageTime: conversation.lastMessageTime,
            status: "active",
          },
          ...prev,
        ];
      });
      toast({
        title: "New conversation",
        description: `${conversation.participantName} started a chat`,
      });
      playNotificationSound();
    });

    // Handle message status updates
    socket.on("whatsapp-message-status", (data: any) => {
      const { conversationId, messageId, status } = data;
      const currentConversation = selectedConversationRef.current;
      if (currentConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId ? { ...msg, status } : msg
          )
        );
      }
      
      // Update conversation lastMessageStatus if this is the last message
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id === conversationId && conv.lastMessageId === messageId) {
            return { ...conv, lastMessageStatus: status };
          }
          return conv;
        })
      );
    });

    // Handle message echoes (messages sent from other devices/sessions)
    socket.on("whatsapp-message-echo", (data: any) => {
      const { conversationId, message } = data;
      const currentConversation = selectedConversationRef.current;

      // Extract display text from content object
      const displayText = typeof message.content === "string" 
        ? message.content 
        : message.content?.text || message.content?.caption || `${message.type} message`;

      // Update conversations list
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessageContent: displayText,
              lastMessageTime: message.timestamp,
              lastMessageDirection: message.direction,
            };
          }
          return conv;
        });
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageTime || 0).getTime() -
            new Date(a.lastMessageTime || 0).getTime()
        );
      });

      // Add message to current conversation if selected
      if (currentConversation?._id === conversationId) {
        setMessages((prev) => {
          // Check if message already exists to avoid duplicates (check both _id and messageId)
          const exists = prev.find(
            (m) => m.messageId === message.messageId || 
                   m._id === message.id || 
                   m._id === message._id
          );
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
    });

    // Handle incoming calls
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
      // state for that conversation across all tabs/devices.
      const currentUserId = token?.id || (token as any)?._id;
      if (currentUserId && String(userId) === String(currentUserId)) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
        );
      }
    });

    return () => {
      socket.emit("leave-whatsapp-room");
      socket.off("whatsapp-new-message");
      socket.off("whatsapp-new-conversation");
      socket.off("whatsapp-message-status");
      socket.off("whatsapp-message-echo");
      socket.off("whatsapp-incoming-call");
      socket.off("whatsapp-call-missed");
      socket.off("whatsapp-call-status");
      socket.off("whatsapp-history-sync");
      socket.off("whatsapp-app-state-sync");
      socket.off("whatsapp-conversation-read");
    };
  }, [socket, toast, token]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Fetch conversation counts from database
  const fetchConversationCounts = async () => {
    try {
      const response = await axios.get("/api/whatsapp/conversations/counts");
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
      if (conversationsCursor && !reset) {
        params.append("cursor", conversationsCursor);
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
        } else {
          // Filter out duplicates by _id when appending
          setConversations((prev) => {
            const existingIds = new Set(prev.map((c) => c._id));
            const uniqueNewConversations = newConversations.filter(
              (c: Conversation) => !existingIds.has(c._id)
            );
            return [...prev, ...uniqueNewConversations];
          });
        }

        // CRITICAL: Always use fresh phone configs from API (synced with Meta)
        // No local caching - Meta is source of truth
        const syncedPhoneConfigs = response.data.allowedPhoneConfigs || [];
        setAllowedPhoneConfigs(syncedPhoneConfigs);
        
        // If user has access to multiple numbers, default to first; else set only option
        // Update selected config to use synced values (Meta metadata)
        if (syncedPhoneConfigs.length > 0) {
          setSelectedPhoneConfig((prev: WhatsAppPhoneConfig | null) => {
            // Find the synced version of the previously selected config
            if (prev) {
              const syncedVersion = syncedPhoneConfigs.find((c: any) => c.phoneNumberId === prev.phoneNumberId);
              if (syncedVersion) {
                // Return synced version (Meta metadata overwrites local)
                return syncedVersion;
              }
            }
            // Default to first synced config
            return syncedPhoneConfigs[0];
          });
        }

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
      if (response.data.success) {
        const newMessages = response.data.messages || [];
        
        if (reset) {
          setMessages(newMessages);
          // Scroll to bottom after initial load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
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
   * Fetch archived conversations for the current user
   */
  const fetchArchivedConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/whatsapp/conversations/archive");
      if (response.data.success) {
        setArchivedConversations(response.data.conversations || []);
        setArchivedCount(response.data.count || 0);
      }
    } catch (error: any) {
      console.error("Error fetching archived conversations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch archived conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        // Remove from main conversations list
        setConversations((prev) => prev.filter((c) => c._id !== conversationId));
        setArchivedCount((prev) => prev + 1);
        
        // If the archived conversation was selected, deselect it
        if (selectedConversation?._id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }
        
        toast({
          title: "Chat archived",
          description: "This chat has been archived. You can find it in the Archived section.",
        });
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
        // Remove from archived list
        setArchivedConversations((prev) => prev.filter((c) => c._id !== conversationId));
        setArchivedCount((prev) => Math.max(0, prev - 1));
        
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

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setReplyToMessage(null); // Clear any pending reply when switching conversations
    fetchMessages(conversation._id, true);
    
    // CRITICAL: Mark conversation as read in ConversationReadState
    // This updates the per-user read state so notifications stop for this user
    if (conversation._id) {
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
    }
    
    // Reset unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversation._id ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const handleGuestAdded = (conversationId: string) => {
    // Refresh conversations to get the new one
    fetchConversations(true).then(() => {
      // Find and select the new conversation
      const newConv = conversations.find((c) => c._id === conversationId);
      if (newConv) {
        selectConversation(newConv);
      } else {
        // If not found in current list, fetch again
        setTimeout(() => {
          fetchConversations(true).then(() => {
            const found = conversations.find((c) => c._id === conversationId);
            if (found) selectConversation(found);
          });
        }, 500);
      }
    });
  };

  // Auto-open a conversation when the page is loaded with a `phone` query param
  const searchParams = useSearchParams();
  const openedByPhoneRef = useRef<string | null>(null);

  useEffect(() => {
    const phoneParam = searchParams?.get("phone");
    if (!phoneParam) return;
    if (openedByPhoneRef.current === phoneParam) return;
    openedByPhoneRef.current = phoneParam;

    const normalized = phoneParam.replace(/\D/g, "");

    (async () => {
      try {
        // Fetch latest conversations and attempt to match by phone
        const convs = await fetchConversations();
        const found = convs.find((c: any) =>
          (c.participantPhone || "").replace(/\D/g, "").endsWith(normalized)
        );

        if (found) {
          selectConversation(found);
        } else {
          // If not found, create a new conversation and select it
          const createRes = await axios.post("/api/whatsapp/conversations", {
            participantPhone: normalized,
            participantName: phoneParam,
          });

          if (createRes.data.success) {
            const conversation = createRes.data.conversation;
            setConversations((prev) => [conversation, ...prev]);
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
  }, [searchParams]);

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
      return updated.sort(
        (a, b) =>
          new Date(b.lastMessageTime || 0).getTime() -
          new Date(a.lastMessageTime || 0).getTime()
      );
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
        // Update the temporary message with real IDs and status
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempId
              ? {
                  ...msg,
                  _id: response.data.savedMessageId,
                  messageId: response.data.messageId,
                  status: "sent",
                  timestamp: new Date(response.data.timestamp || sendTimestamp),
                }
              : msg
          )
        );
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
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === selectedConversation._id
          ? {
              ...conv,
              lastMessageContent: templateDisplayText.substring(0, 50) + (templateDisplayText.length > 50 ? "..." : ""),
              lastMessageTime: sendTimestamp,
              lastMessageDirection: "outgoing",
            }
          : conv
      );
      return updated.sort(
        (a, b) =>
          new Date(b.lastMessageTime || 0).getTime() -
          new Date(a.lastMessageTime || 0).getTime()
      );
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

  // Retargeting: fetch recipients with state filter
  const fetchRetargetRecipients = async (stateFilter: string = "pending", additionalFilters?: Record<string, any>) => {
    try {
      setRetargetFetching(true);
      setRetargetSentCount(0);
      
      const requestBody: Record<string, any> = {
        audience: retargetAudience,
        priceFrom: retargetPriceFrom ? Number(retargetPriceFrom) : undefined,
        priceTo: retargetPriceTo ? Number(retargetPriceTo) : undefined,
        fromDate: retargetFromDate || undefined,
        toDate: retargetToDate || undefined,
        location: selectedLocation || undefined,
        stateFilter, // Pass the tab filter to API
        limit: 10000, // Removed practical limit
      };
      
      // Merge additional filters if provided
      if (additionalFilters && typeof additionalFilters === "object") {
        Object.assign(requestBody, additionalFilters);
      }
      
      const response = await axios.post("/api/whatsapp/retarget", requestBody);
      const recs = response.data?.recipients || [];
      const meta = response.data?.meta || {};
      
      // Store meta with counts
      setRetargetMeta(meta);
      
      // Map recipients with enhanced retarget fields
      setRetargetRecipients(
        recs.map((r: any) => ({
          ...r,
          status: "pending", // Send status for current batch
        }))
      );
      
      // Only select recipients that can be retargeted (max 10)
      const allSelectableIds = recs
        .filter((r: any) => r.canRetarget !== false)
        .map((r: any) => r.id);
      const selectableIds = allSelectableIds.slice(0, 10); // Limit to 10
      setRetargetSelectedIds(selectableIds);
      
      // Store meta for UI
      setRetargetMeta(meta);
      
      const limitNote = allSelectableIds.length > 10 
        ? ` (first 10 auto-selected)` 
        : "";
      toast({
        title: "Recipients loaded",
        description: `${recs.length} loaded, ${allSelectableIds.length} eligible${limitNote}`,
      });
    } catch (error: any) {
      console.error("Retarget fetch error", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load recipients",
        variant: "destructive",
      });
    } finally {
      setRetargetFetching(false);
    }
  };

    // Retargeting: Meta-Safe Pattern Implementation
  // =================================================
  // - Batch size: 1 user at a time (queue system)
  // - Gap: 60-150 seconds (randomized, never repeating exact gaps)
  // - Hourly cap: 12-15 messages/hour (randomized)
  // - Daily cap: 50-70 messages/day (randomized)
  // - No cron-like timing, no uniform delays, no repeating intervals
  const sendRetargetBatch = async () => {
    if (!selectedTemplate) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }
    if (retargetRecipients.length === 0) {
      toast({ title: "No recipients", description: "Fetch recipients first.", variant: "destructive" });
      return;
    }

    // Meta-safe limits (randomized to avoid patterns)
    const DAILY_CAP_MIN = 50;
    const DAILY_CAP_MAX = 70;
    const HOURLY_CAP_MIN = 12;
    const HOURLY_CAP_MAX = 15;
    const DELAY_MIN_MS = 60 * 1000; // 60 seconds
    const DELAY_MAX_MS = 150 * 1000; // 150 seconds
    const BATCH_SIZE = 1; // Process 1 at a time (safest)

    // Get hourly count from localStorage (resets each hour)
    const getHourlyCount = () => {
      const now = new Date();
      const hourKey = `retarget_hourly_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}`;
      const stored = localStorage.getItem(hourKey);
      return stored ? parseInt(stored, 10) : 0;
    };

    const setHourlyCount = (count: number) => {
      const now = new Date();
      const hourKey = `retarget_hourly_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}_${now.getHours()}`;
      localStorage.setItem(hourKey, count.toString());
    };

    // Calculate randomized daily cap (50-70)
    const dailyCap = Math.floor(Math.random() * (DAILY_CAP_MAX - DAILY_CAP_MIN + 1)) + DAILY_CAP_MIN;
    const dailyRemaining = Math.max(0, dailyCap - retargetDailyCount);
    
    // Check hourly cap (12-15)
    const hourlyCount = getHourlyCount();
    const hourlyCap = Math.floor(Math.random() * (HOURLY_CAP_MAX - HOURLY_CAP_MIN + 1)) + HOURLY_CAP_MIN;
    const hourlyRemaining = Math.max(0, hourlyCap - hourlyCount);

    const selected = retargetRecipients.filter((r) => retargetSelectedIds.includes(r.id));
    const sendable = Math.min(dailyRemaining, hourlyRemaining, selected.length);
    
    if (sendable <= 0) {
      if (dailyRemaining <= 0) {
        toast({
          title: "Daily limit reached",
          description: `You have reached the daily cap (${dailyCap} messages/day) for retargeting.`,
          variant: "destructive",
        });
      } else if (hourlyRemaining <= 0) {
        toast({
          title: "Hourly limit reached",
          description: `You have reached the hourly cap (${hourlyCap} messages/hour). Please wait.`,
          variant: "destructive",
        });
      }
      return;
    }

    setRetargetSending(true);
    setRetargetSentCount(0);

    const templateText = getTemplatePreviewText(selectedTemplate, retargetTemplateParams);
    const components = buildTemplateComponents(selectedTemplate, retargetTemplateParams);

    let sentCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let aborted = false;
    const usedDelays = new Set<number>(); // Track used delays to avoid exact repetition

    // Generate random delay that hasn't been used recently (avoids cron-like patterns)
    const getRandomDelay = (): number => {
      let delay: number;
      let attempts = 0;
      do {
        // Random delay between 60-150 seconds
        delay = Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;
        attempts++;
        // Round to nearest 5 seconds to avoid exact repetition while still being random
        delay = Math.round(delay / 5000) * 5000;
      } while (usedDelays.has(delay) && attempts < 20);
      
      usedDelays.add(delay);
      // Keep only last 10 delays to allow reuse after a while (prevents infinite growth)
      if (usedDelays.size > 10) {
        const first = Array.from(usedDelays)[0];
        usedDelays.delete(first);
      }
      
      return delay;
    };

    // Process queue: 1 message at a time with randomized delays
    for (let i = 0; i < sendable; i++) {
      // Safety abort checks
      if (failedCount >= 5) {
        console.log(`🚨 [AUDIT] Retargeting aborted: ${failedCount} failures reached`);
        toast({
          title: "Retargeting Stopped",
          description: `Stopped after ${failedCount} failures. Check your template or try later.`,
          variant: "destructive",
        });
        aborted = true;
        break;
      }

      if (blockedCount >= 2) {
        console.log(`🚨 [AUDIT] Retargeting aborted: ${blockedCount} blocked users detected`);
        toast({
          title: "Retargeting Stopped",
          description: "Multiple users have blocked this number. Review your contact list.",
          variant: "destructive",
        });
        aborted = true;
        break;
      }

      // Check hourly limit before each send
      const currentHourlyCount = getHourlyCount();
      if (currentHourlyCount >= hourlyCap) {
        console.log(`⏰ [AUDIT] Hourly cap reached: ${currentHourlyCount}/${hourlyCap}`);
        toast({
          title: "Hourly limit reached",
          description: `Reached hourly cap of ${hourlyCap} messages. Resuming after next hour.`,
          variant: "default",
        });
        break;
      }

      const recipient = selected[i];
      setRetargetRecipients((prev) =>
        prev.map((r) =>
          r.id === recipient.id ? { ...r, status: "sending", error: undefined } : r
        )
      );

      try {
        // Send message (1 at a time - queue system)
        await axios.post("/api/whatsapp/send-template", {
          to: recipient.phone,
          templateName: selectedTemplate.name,
          languageCode: selectedTemplate.language,
          components: components.length > 0 ? components : undefined,
          templateText,
          isRetarget: true,
        });
        
        sentCount += 1;
        setRetargetSentCount(sentCount);
        persistRetargetDailyCount(retargetDailyCount + sentCount);
        setHourlyCount(currentHourlyCount + 1);
        
        setRetargetRecipients((prev) =>
          prev.map((r) =>
            r.id === recipient.id ? { ...r, status: "sent" } : r
          )
        );
        
        console.log(`✅ [AUDIT] Sent to ${recipient.phone} (${sentCount}/${sendable}, hourly: ${currentHourlyCount + 1}/${hourlyCap})`);
      } catch (error: any) {
        failedCount += 1;
        const errorMsg = error.response?.data?.error || "Send failed";
        
        // Detect 131049 (blocked) errors
        if (errorMsg.includes("131049") || errorMsg.includes("blocked")) {
          blockedCount += 1;
          console.log(`🚫 [AUDIT] User blocked detected for ${recipient.phone}`);
        }
        
        setRetargetRecipients((prev) =>
          prev.map((r) =>
            r.id === recipient.id ? { ...r, status: "failed", error: errorMsg } : r
          )
        );
      }

      // Randomized delay between messages (60-150 seconds, never repeating exact gap)
      if (i < sendable - 1 && !aborted) {
        const delay = getRandomDelay();
        const delaySeconds = Math.round(delay / 1000);
        console.log(`⏳ [AUDIT] Waiting ${delaySeconds}s before next message (randomized, non-repeating delay)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setRetargetSending(false);

    if (!aborted && sentCount > 0) {
      toast({
        title: "Retargeting completed",
        description: `Successfully sent ${sentCount} messages. Daily: ${retargetDailyCount + sentCount}/${dailyCap}, Hourly: ${getHourlyCount()}/${hourlyCap}`,
      });
    }
    console.log(`📊 [AUDIT] Retarget batch complete: sent=${sentCount}, failed=${failedCount}, blocked=${blockedCount}, aborted=${aborted}, daily=${retargetDailyCount + sentCount}/${dailyCap}, hourly=${getHourlyCount()}/${hourlyCap}`);
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
        content: { caption: file.name },
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
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageTime || 0).getTime() -
            new Date(a.lastMessageTime || 0).getTime()
        );
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
          caption: file.name,
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
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    // Validate file size before upload
    const maxSize = mediaType === "document" ? 100 * 1024 * 1024 : 16 * 1024 * 1024; // 100MB for documents, 16MB for media
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `File size exceeds maximum allowed size (${maxSize / 1024 / 1024}MB)`,
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

    const tempId = `temp-${Date.now()}`;
    const sendTimestamp = new Date();
    const mediaDisplayText = `📎 ${file.name}`;
    
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
      content: { caption: file.name },
      mediaUrl: localPreviewUrl || (mediaType === "audio" ? URL.createObjectURL(file) : undefined), // Show local preview immediately (for audio, create URL for player)
      filename: file.name, // Include filename for audio display
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
      return updated.sort(
        (a, b) =>
          new Date(b.lastMessageTime || 0).getTime() -
          new Date(a.lastMessageTime || 0).getTime()
      );
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

      // Now send the message using Bunny URL via send-media API
      const sendResponse = await axios.post("/api/whatsapp/send-media", {
        to: selectedConversation.participantPhone,
        conversationId: selectedConversation._id,
        mediaType: mediaType,
        mediaUrl: bunnyUrl, // Use Bunny CDN URL directly
        caption: file.name,
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
    } finally {
      setUploadingMedia(false);
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
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

  return (
    <div className="flex flex-col h-full w-full bg-[#f0f2f5] dark:bg-[#0b141a]">
      <Tabs defaultValue="chat" className="w-full h-full flex flex-col">
        {/* WhatsApp-style header tabs */}
        <div className="h-[50px] bg-[#008069] dark:bg-[#202c33] flex items-center px-4 shadow-sm flex-shrink-0">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-1">
            <TabsTrigger 
              value="chat" 
              className="text-white/80 hover:text-white data-[state=active]:text-white data-[state=active]:bg-white/10 px-4 py-2 rounded-lg transition-all"
            >
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="retarget"
              className="text-white/80 hover:text-white data-[state=active]:text-white data-[state=active]:bg-white/10 px-4 py-2 rounded-lg transition-all"
            >
              Retarget
            </TabsTrigger>
          </TabsList>
          <div className="flex-1" />
          <div className="text-white/80 text-sm">
            {token?.name} • {token?.role}
          </div>
        </div>

        <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
          <div className="flex h-full">
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
              showingArchived={showingArchived}
              onToggleArchiveView={toggleArchiveView}
              onArchiveConversation={archiveConversation}
              onUnarchiveConversation={unarchiveConversation}
            />

            {/* Chat Panel */}
            <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden">
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
                  />
                </>
              ) : (
                /* Empty state - WhatsApp Web style */
                <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35]">
                  <div className="max-w-md text-center">
                    {/* WhatsApp illustration */}
                    <div className="w-[320px] h-[188px] mx-auto mb-8">
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
                    
                    <h1 className="text-[32px] font-light text-[#41525d] dark:text-[#e9edef] mb-4">
                      WhatsApp Business
                    </h1>
                    <p className="text-[14px] text-[#667781] dark:text-[#8696a0] leading-relaxed mb-8">
                      Send and receive messages without keeping your phone online.<br />
                      Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                    </p>
                    
                    <div className="flex items-center justify-center gap-2 text-[14px] text-[#667781] dark:text-[#8696a0]">
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
        </TabsContent>

        <TabsContent value="retarget" className="flex-1 px-4 pb-0 overflow-hidden">
          <RetargetPanel
            audience={retargetAudience}
            onAudienceChange={setRetargetAudience}
            priceFrom={retargetPriceFrom}
            priceTo={retargetPriceTo}
            fromDate={retargetFromDate}
            toDate={retargetToDate}
            location={locations}
            onLocationChange={setLocations}
            selectedLocation={selectedLocation}
            onSelectedLocationChange={setSelectedLocation}
            onPriceFromChange={setRetargetPriceFrom}
            onPriceToChange={setRetargetPriceTo}
            onFromDateChange={setRetargetFromDate}
            onToDateChange={setRetargetToDate}
            onFetchRecipients={fetchRetargetRecipients}
            fetching={retargetFetching}
            recipients={retargetRecipients}
            sending={retargetSending}
            onSend={sendRetargetBatch}
            dailyRemaining={Math.max(0, 70 - retargetDailyCount)} // Meta-safe: 50-70/day (using max for display)
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            templates={templates}
            templateParams={retargetTemplateParams}
            onTemplateParamsChange={setRetargetTemplateParams}
            totalToSend={Math.min(retargetSelectedIds.length, Math.max(0, 70 - retargetDailyCount))} // Meta-safe: 50-70/day (using max for display)
            sentCount={retargetSentCount}
            sendingActive={retargetSending}
            selectedRecipientIds={retargetSelectedIds}
            onToggleRecipient={(id) => {
              // Only allow toggling if recipient can be retargeted and not blocked
              const recipient = retargetRecipients.find((r) => r.id === id);
              if (recipient?.canRetarget && !recipient?.blocked) {
                setRetargetSelectedIds((prev) => {
                  // If removing, always allow
                  if (prev.includes(id)) {
                    return prev.filter((x) => x !== id);
                  }
                  // If adding, check 10 limit
                  if (prev.length >= 10) {
                    toast({
                      title: "Selection limit reached",
                      description: "Maximum 10 recipients can be selected at once",
                      variant: "destructive",
                    });
                    return prev;
                  }
                  return [...prev, id];
                });
              }
            }}
            onToggleAll={(checked) => {
              // Only select recipients that can be retargeted and not blocked (max 100)
              if (checked) {
                const eligibleIds = retargetRecipients
                  .filter((r) => r.canRetarget && !r.blocked)
                  .map((r) => r.id)
                  .slice(0, 10); // Limit to 10
                setRetargetSelectedIds(eligibleIds);
                if (retargetRecipients.filter((r) => r.canRetarget && !r.blocked).length > 10) {
                  toast({
                    title: "Selection limited to 100",
                    description: "Only the first 10 eligible recipients were selected",
                  });
                }
              } else {
                setRetargetSelectedIds([]);
              }
            }}
            meta={retargetMeta}
          />
        </TabsContent>
      </Tabs>
      
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
    </div>
  );
}
