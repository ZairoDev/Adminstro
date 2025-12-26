"use client";
import { useState, useEffect, useRef } from "react";
import type { WhatsAppPhoneConfig } from "@/lib/whatsapp/config";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/AuthStore";
import { useSocket } from "@/hooks/useSocket";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import type { Message, Conversation, Template } from "./types";
import { buildTemplateComponents, isMessageWindowActive, getTemplatePreviewText } from "./utils";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { WindowWarningDialog } from "./components/WindowWarningDialog";
import { MessageComposer } from "./components/MessageComposer";
import { RetargetPanel } from "./components/RetargetPanel";

export default function WhatsAppChat() {
  const { token } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allowedPhoneConfigs, setAllowedPhoneConfigs] = useState<WhatsAppPhoneConfig[]>([]);
  const [selectedPhoneConfig, setSelectedPhoneConfig] = useState<WhatsAppPhoneConfig | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
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
    atMaxRetarget?: number;
  }>({});
  const [retargetSentCount, setRetargetSentCount] = useState(0);

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

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessageContent: displayText,
              lastMessageTime: message.timestamp,
              lastMessageDirection: message.direction,
              unreadCount:
                currentConversation?._id === conversationId
                  ? 0
                  : conv.unreadCount + 1,
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
    };
  }, [socket, toast]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/whatsapp/conversations");
      if (response.data.success) {
        setConversations(response.data.conversations);
        setAllowedPhoneConfigs(response.data.allowedPhoneConfigs || []);
        // If user has access to multiple numbers, default to first; else set only option
        if (response.data.allowedPhoneConfigs?.length > 0) {
          setSelectedPhoneConfig((prev: WhatsAppPhoneConfig | null) => {
            // If already selected and still allowed, keep it
            if (prev && response.data.allowedPhoneConfigs.some((c:any) => c.phoneNumberId === prev.phoneNumberId)) {
              return prev;
            }
            return response.data.allowedPhoneConfigs[0];
          });
        }
        return response.data.conversations;
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
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const response = await axios.get(
        `/api/whatsapp/conversations/${conversationId}/messages`
      );
      if (response.data.success) {
        setMessages(response.data.messages);
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
    }
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
    fetchMessages(conversation._id);
    // Reset unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversation._id ? { ...c, unreadCount: 0 } : c
      )
    );
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

    // Check if 24-hour messaging window is active
    if (!isMessageWindowActive(selectedConversation)) {
      setShowWindowWarning(true);
      return;
    }

    setSendingMessage(true);  
    const tempId = `temp-${Date.now()}`;
    const messageContent = newMessage;
    const sendTimestamp = new Date();

    // Add message to UI optimistically with content object
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
    };
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

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

    try {
      const response = await axios.post("/api/whatsapp/send-message", {
        to: selectedConversation.participantPhone,
        message: messageContent,
        conversationId: selectedConversation._id,
        phoneNumberId: selectedPhoneConfig?.phoneNumberId,
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
  const fetchRetargetRecipients = async (stateFilter: string = "pending") => {
    try {
      setRetargetFetching(true);
      setRetargetSentCount(0);
      const response = await axios.post("/api/whatsapp/retarget", {
        audience: retargetAudience,
        priceFrom: retargetPriceFrom ? Number(retargetPriceFrom) : undefined,
        priceTo: retargetPriceTo ? Number(retargetPriceTo) : undefined,
        fromDate: retargetFromDate || undefined,
        toDate: retargetToDate || undefined,
        location: selectedLocation || undefined,
        stateFilter, // Pass the tab filter to API
        limit: 200,
      });
      const recs = response.data?.recipients || [];
      const meta = response.data?.meta || {};
      
      // Map recipients with enhanced retarget fields
      setRetargetRecipients(
        recs.map((r: any) => ({
          ...r,
          status: "pending", // Send status for current batch
        }))
      );
      
      // Only select recipients that can be retargeted (max 100)
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

  // Retargeting: send batch with 6s gap and 100/day cap
  // STEP 8: Safe Retargeting with Rate Limit Safety
  // =================================================
  // - Max 100 messages/day (preserved)
  // - 6 seconds delay per message (preserved)
  // - NEW: Hard stop if more than 5 failures in a batch
  // - NEW: Automatic batch abort if 131049 count > 1 (user blocked us)
  const sendRetargetBatch = async () => {
    if (!selectedTemplate) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }
    if (retargetRecipients.length === 0) {
      toast({ title: "No recipients", description: "Fetch recipients first.", variant: "destructive" });
      return;
    }

    const dailyRemaining = Math.max(0, 100 - retargetDailyCount);
    const selected = retargetRecipients.filter((r) => retargetSelectedIds.includes(r.id));
    const sendable = Math.min(dailyRemaining, selected.length);
    if (sendable <= 0) {
      toast({
        title: "Daily limit reached",
        description: "You have reached the 100/day cap for retargeting.",
        variant: "destructive",
      });
      return;
    }

    setRetargetSending(true);
    setRetargetSentCount(0);

    const templateText = getTemplatePreviewText(selectedTemplate, retargetTemplateParams);
    const components = buildTemplateComponents(selectedTemplate, retargetTemplateParams);

    let sentCount = 0;
    let failedCount = 0;
    let blockedCount = 0; // STEP 8: Track 131049 errors specifically
    let aborted = false;

    for (let i = 0; i < sendable; i++) {
      // STEP 8: Safety abort checks
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

      const recipient = selected[i];
      setRetargetRecipients((prev) =>
        prev.map((r) =>
          r.id === recipient.id ? { ...r, status: "sending", error: undefined } : r
        )
      );

      try {
        // STEP 2: Pass isRetarget flag to increment retarget count
        await axios.post("/api/whatsapp/send-template", {
          to: recipient.phone,
          templateName: selectedTemplate.name,
          languageCode: selectedTemplate.language,
          components: components.length > 0 ? components : undefined,
          templateText,
          isRetarget: true, // Flag for retarget count tracking
        });
        sentCount += 1;
        setRetargetSentCount(sentCount);
        persistRetargetDailyCount(retargetDailyCount + sentCount);
        setRetargetRecipients((prev) =>
          prev.map((r) =>
            r.id === recipient.id ? { ...r, status: "sent" } : r
          )
        );
      } catch (error: any) {
        failedCount += 1;
        const errorMsg = error.response?.data?.error || "Send failed";
        
        // STEP 8: Detect 131049 (blocked) errors specifically
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

      if (i < sendable - 1 && !aborted) {
        await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 seconds between messages
      }
    }

    setRetargetSending(false);
    
    if (!aborted) {
      toast({
        title: "Retargeting completed",
        description: `Sent: ${sentCount}, Failed: ${failedCount}`,
        variant: failedCount ? "destructive" : "default",
      });
    }
    
    console.log(`📊 [AUDIT] Retarget batch complete: sent=${sentCount}, failed=${failedCount}, blocked=${blockedCount}, aborted=${aborted}`);
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

  // Handle file/media upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    mediaType: "image" | "document" | "audio" | "video"
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    // Check if 24-hour messaging window is active
    if (!isMessageWindowActive(selectedConversation)) {
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
      mediaUrl: localPreviewUrl, // Show local preview immediately
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

    try {
      // First upload the media
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await axios.post(
        "/api/whatsapp/upload-media",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (!uploadResponse.data.success) {
        throw new Error("Failed to upload media");
      }

      const { mediaId, url, filename } = uploadResponse.data;

      // Update temp message with media URL
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, mediaUrl: url } : msg
        )
      );

      // Now send the message with the media
      const sendResponse = await axios.post("/api/whatsapp/send-message", {
        to: selectedConversation.participantPhone,
        conversationId: selectedConversation._id,
        type: mediaType,
        mediaId,
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
        title: "Upload Failed",
        description:
          error.response?.data?.error || "Failed to upload and send media",
        variant: "destructive",
      });
    } finally {
      setUploadingMedia(false);
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
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

  const canSendFreeForm = selectedConversation ? isMessageWindowActive(selectedConversation) : false;

  const copyPhoneNumber = () => {
    if (!selectedConversation) return;
    navigator.clipboard.writeText(selectedConversation.participantPhone);
    toast({
      title: "Copied",
      description: "Phone number copied to clipboard",
    });
  };

  return (
    <div className="flex flex-col gap-4 mt-6">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="retarget">Retarget</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="pt-4">
          <div className="flex h-[calc(100vh-160px)] gap-4">
            <ConversationSidebar
              conversations={conversations}
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
            />

      <Card className="flex-1 flex flex-col">
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
                  />

            <CardContent className="flex-1 p-4 overflow-hidden">
                    <MessageList
                      messages={messages}
                      messagesLoading={messagesLoading}
                      messageSearchQuery={messageSearchQuery}
                      messagesEndRef={messagesEndRef}
                      selectedConversationActive={!!selectedConversation}
                    />
            </CardContent>

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
                    onOpenTemplateFromWarning={() => setShowTemplateDialog(true)}
                  />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="w-64 h-64 mb-6 relative">
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <MessageSquare className="h-32 w-32 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              WhatsApp Business
            </h2>
            <p className="max-w-sm">
              Send and receive messages using your WhatsApp Business account.
              Select a contact or start a new conversation.
            </p>
            <div className="mt-6 text-sm text-muted-foreground">
              <p>Logged in as: {token?.name}</p>
              <p>Role: {token?.role}</p>
            </div>
          </div>
        )}
      </Card>
          </div>
        </TabsContent>

        <TabsContent value="retarget" className="pt-4">
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
            dailyRemaining={Math.max(0, 100 - retargetDailyCount)}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            templates={templates}
            templateParams={retargetTemplateParams}
            onTemplateParamsChange={setRetargetTemplateParams}
            totalToSend={Math.min(retargetSelectedIds.length, Math.max(0, 100 - retargetDailyCount))}
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
    </div>
  );
}
