"use client";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/AuthStore";
import { useSocket } from "@/hooks/useSocket";
import axios from "axios";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  Video,
  Search,
  MoreVertical,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  LayoutTemplate,
  Wifi,
  WifiOff,
  FileText,
  Music,
  Film,
  X,
  Archive,
  Trash2,
  UserPlus,
  Bell,
  BellOff,
  Smile,
  Timer,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MessageContent {
  text?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactivePayload?: any;
}

interface Message {
  _id?: string;
  messageId: string;
  from: string;
  to: string;
  type: string;
  content: MessageContent | string;
  displayText?: string; // Added by API for convenience
  mediaUrl?: string;
  timestamp: Date;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  direction: "incoming" | "outgoing";
}

interface Conversation {
  _id: string;
  participantPhone: string;
  participantName: string;
  participantProfilePic?: string;
  lastMessageContent?: string;
  lastMessageTime?: Date;
  lastMessageDirection?: string;
  unreadCount: number;
  status: string;
  lastCustomerMessageAt?: Date;
  sessionExpiresAt?: Date;
}

interface Template {
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

// Helper function to extract display text from content object
function getMessageDisplayText(message: Message): string {
  // If displayText is provided by API, use it
  if (message.displayText) return message.displayText;
  
  const content = message.content;
  
  // Handle string content (legacy format)
  if (typeof content === "string") return content;
  
  // Handle content object
  if (content) {
    if (content.text) return content.text;
    if (content.caption) return content.caption;
    if (content.location) {
      const loc = content.location;
      return `📍 ${loc.name || loc.address || `${loc.latitude}, ${loc.longitude}`}`;
    }
  }
  
  // Fallback based on type
  const typeLabels: Record<string, string> = {
    image: "📷 Image",
    video: "🎬 Video",
    audio: "🎵 Audio",
    document: "📄 Document",
    sticker: "🎨 Sticker",
    interactive: "Interactive message",
    template: "Template message",
  };
  
  return typeLabels[message.type] || `${message.type} message`;
}

// Helper function to extract parameter placeholders from template
function getTemplateParameters(template: Template): { type: string; index: number; text: string }[] {
  const params: { type: string; index: number; text: string }[] = [];
  
  template.components?.forEach((component: any) => {
    if (component.type === "BODY" && component.text) {
      // Find all {{n}} placeholders in the text
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          params.push({ type: "body", index, text: `Body Parameter ${index}` });
        });
      }
    }
    if (component.type === "HEADER" && component.format === "TEXT" && component.text) {
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          params.push({ type: "header", index, text: `Header Parameter ${index}` });
        });
      }
    }
  });
  
  return params;
}

// Helper function to build template components for API
function buildTemplateComponents(template: Template, params: Record<string, string>): any[] {
  const components: any[] = [];
  
  // Check for header parameters
  const headerParams = Object.entries(params)
    .filter(([key]) => key.startsWith("header_"))
    .sort(([a], [b]) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
    .map(([_, value]) => ({ type: "text", text: value }));
  
  if (headerParams.length > 0) {
    components.push({
      type: "header",
      parameters: headerParams,
    });
  }
  
  // Check for body parameters
  const bodyParams = Object.entries(params)
    .filter(([key]) => key.startsWith("body_"))
    .sort(([a], [b]) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
    .map(([_, value]) => ({ type: "text", text: value }));
  
  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams,
    });
  }
  
  return components;
}

// Helper function to check if 24-hour messaging window is active
function isMessageWindowActive(conversation: Conversation | null): boolean {
  if (!conversation?.lastCustomerMessageAt) return false;
  const lastMessage = new Date(conversation.lastCustomerMessageAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

// Helper function to get remaining hours in messaging window
function getRemainingHours(conversation: Conversation | null): { hours: number; minutes: number } | null {
  if (!conversation?.lastCustomerMessageAt) return null;
  const lastMessage = new Date(conversation.lastCustomerMessageAt);
  const now = new Date();
  const msRemaining = (lastMessage.getTime() + 24 * 60 * 60 * 1000) - now.getTime();
  
  if (msRemaining <= 0) return null;
  
  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
}

// Helper function to get template preview text with parameters filled
function getTemplatePreviewText(template: Template, params: Record<string, string>): string {
  let previewText = "";
  
  template.components?.forEach((comp: any) => {
    if (comp.type === "HEADER" && comp.text) {
      let headerText = comp.text;
      const matches = headerText.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          headerText = headerText.replace(match, params[`header_${index}`] || match);
        });
      }
      previewText += headerText + "\n\n";
    }
    if (comp.type === "BODY" && comp.text) {
      let bodyText = comp.text;
      const matches = bodyText.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          bodyText = bodyText.replace(match, params[`body_${index}`] || match);
        });
      }
      previewText += bodyText;
    }
    if (comp.type === "FOOTER" && comp.text) {
      previewText += "\n\n" + comp.text;
    }
  });
  
  return previewText || `Template: ${template.name}`;
}

export default function WhatsAppChat() {
  const { token } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
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
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 24-hour window warning state
  const [showWindowWarning, setShowWindowWarning] = useState(false);

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

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

  // Ref to track selected conversation for socket events (avoids stale closure)
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

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
      }
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive",
      });
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

  const startNewConversation = async () => {
    if (!newCountryCode.trim() || !newPhoneNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both country code and phone number",
        variant: "destructive",
      });
      return;
    }

    // Combine country code and phone number
    const fullPhoneNumber = `${newCountryCode.replace(/\D/g, "")}${newPhoneNumber.replace(/\D/g, "")}`;

    try {
      setLoading(true);
      const response = await axios.post("/api/whatsapp/conversations", {
        participantPhone: fullPhoneNumber,
        participantName: fullPhoneNumber,
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
    setShowAttachmentMenu(false);

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

  const getStatusIcon = (status: Message["status"]) => {
    switch (status) {
      case "sending":
        return <Clock className="h-4 w-4 text-gray-200" />;
      case "sent":
        return <Check className="h-4 w-4 text-gray-200" />;
      case "delivered":
        return <CheckCheck className="h-4 w-4 text-gray-200" />;
      case "read":
        return <CheckCheck className="h-4 w-4 text-blue-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-700" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date | string | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participantPhone.includes(searchQuery)
  );

  return (
    <div className="flex h-[calc(100vh)] gap-4 mt-10">
      {/* Conversations Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            WhatsApp Chats
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex gap-2">
              <div className="flex gap-1 flex-1">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+</span>
                  <Input
                    placeholder="91"
                    value={newCountryCode}
                    onChange={(e) => setNewCountryCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="h-9 text-sm w-16 pl-5"
                    maxLength={4}
                  />
                </div>
                <Input
                  placeholder="Phone number..."
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  className="h-9 text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") startNewConversation();
                  }}
                />
              </div>
              <Button
                size="sm"
                onClick={startNewConversation}
                disabled={loading || !newCountryCode.trim() || !newPhoneNumber.trim()}
                title={!newCountryCode.trim() || !newPhoneNumber.trim() ? "Enter country code and phone number" : "Start conversation"}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-80px)]">
            {loading && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No conversations yet. Start a new chat by entering a phone
                number above.
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b",
                    selectedConversation?._id === conversation._id &&
                      "bg-muted",
                    conversation.unreadCount > 0 &&
                      "bg-green-50 dark:bg-green-950/20"
                  )}
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={conversation.participantProfilePic} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {conversation.participantName
                          ?.slice(0, 2)
                          .toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-sm truncate",
                          conversation.unreadCount > 0
                            ? "font-bold"
                            : "font-medium"
                        )}
                      >
                        {conversation.participantName ||
                          conversation.participantPhone}
                      </p>
                      {conversation.lastMessageTime && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-xs truncate max-w-[180px]",
                          conversation.unreadCount > 0
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {conversation.lastMessageDirection === "outgoing" && (
                          <span className="mr-1">✓</span>
                        )}
                        {conversation.lastMessageContent ||
                          conversation.participantPhone}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge
                          variant="default"
                          className="h-5 min-w-5 rounded-full p-0 flex items-center justify-center bg-green-500 text-xs"
                        >
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={selectedConversation.participantProfilePic}
                    />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {(
                        selectedConversation.participantName ||
                        selectedConversation.participantPhone
                      )
                        ?.slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedConversation.participantName ||
                        selectedConversation.participantPhone}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.participantPhone}
                      </p>
                      {/* 24-hour window indicator */}
                      {(() => {
                        const remaining = getRemainingHours(selectedConversation);
                        if (remaining) {
                          return (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs gap-1",
                                remaining.hours < 2 
                                  ? "border-orange-500 text-orange-500" 
                                  : "border-green-500 text-green-500"
                              )}
                            >
                              <Timer className="h-3 w-3" />
                              {remaining.hours}h {remaining.minutes}m
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="outline" className="text-xs gap-1 border-red-500 text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              Template only
                            </Badge>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Audio Call Button */}
                  {callPermissions.canMakeCalls && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleAudioCall}
                      disabled={callingAudio}
                      title="Voice Call"
                    >
                      {callingAudio ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  {/* Video Call Button */}
                  {callPermissions.canMakeVideoCalls && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleVideoCall}
                      disabled={callingVideo}
                      title="Video Call"
                    >
                      {callingVideo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchTemplates}
                    title="Refresh Templates"
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        templatesLoading && "animate-spin"
                      )}
                    />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    title="Search Messages"
                  >
                    <Search className="h-4 w-4" />
                  </Button>

                  {/* More Options Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(
                            selectedConversation.participantPhone
                          );
                          toast({
                            title: "Copied",
                            description: "Phone number copied to clipboard",
                          });
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Copy Phone Number
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleMuteNotifications}>
                        <BellOff className="h-4 w-4 mr-2" />
                        Mute Notifications
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleArchiveConversation}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() =>
                          toast({
                            title: "Delete",
                            description: "Delete feature coming soon",
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Message Search Bar (toggleable) */}
              {showMessageSearch && (
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Search in conversation..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setShowMessageSearch(false);
                      setMessageSearchQuery("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 p-4 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
                      <MessageSquare className="h-16 w-16 mb-4 text-green-200" />
                      <p className="text-lg font-medium">No messages yet</p>
                      <p className="text-sm">
                        Send a message to start the conversation
                      </p>
                    </div>
                  ) : (
                    messages
                      .filter(
                        (msg) => {
                          if (!messageSearchQuery) return true;
                          const displayText = getMessageDisplayText(msg);
                          return displayText.toLowerCase().includes(messageSearchQuery.toLowerCase());
                        }
                      )
                      .map((message) => (
                        <div
                          key={message._id || message.messageId}
                          className={cn(
                            "flex",
                            message.direction === "outgoing"
                              ? "justify-end"
                              : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg p-3",
                              message.direction === "outgoing"
                                ? "bg-green-800 text-white"
                                : "bg-muted"
                            )}
                          >
                            {/* Render media content */}
                            {/* Show loading state for media being uploaded */}
                            {!message.mediaUrl && 
                              message.status === "sending" &&
                              (message.type === "image" || message.type === "video" || message.type === "audio" || message.type === "document") && (
                                <div className="mb-2 flex items-center justify-center p-4 bg-black/10 rounded-lg">
                                  <Loader2 className="h-8 w-8 animate-spin" />
                                  <span className="ml-2 text-sm">Uploading...</span>
                                </div>
                              )}
                            {message.mediaUrl &&
                              (message.type === "image" ||
                                message.type === "sticker") && (
                                <div className="mb-2 relative">
                                  {message.status === "sending" && (
                                    <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                                    </div>
                                  )}
                                  <img
                                    src={message.mediaUrl}
                                    alt={getMessageDisplayText(message) || "Image"}
                                    className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90"
                                    onClick={() =>
                                      window.open(message.mediaUrl, "_blank")
                                    }
                                  />
                                </div>
                              )}
                            {message.mediaUrl && message.type === "video" && (
                              <div className="mb-2">
                                <video
                                  src={message.mediaUrl}
                                  controls
                                  className="max-w-full rounded-lg max-h-64"
                                />
                              </div>
                            )}
                            {message.mediaUrl && message.type === "audio" && (
                              <div className="mb-2">
                                <audio
                                  src={message.mediaUrl}
                                  controls
                                  className="max-w-full"
                                />
                              </div>
                            )}
                            {message.mediaUrl &&
                              message.type === "document" && (
                                <div className="mb-2">
                                  <a
                                    href={message.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded border",
                                      message.direction === "outgoing"
                                        ? "border-green-300 hover:bg-green-600"
                                        : "border-gray-300 hover:bg-gray-100"
                                    )}
                                  >
                                    <FileText className="h-6 w-6" />
                                    <span className="text-sm underline">
                                      Download Document
                                    </span>
                                  </a>
                                </div>
                              )}
                            {/* Render location if present */}
                            {message.type === "location" && typeof message.content === "object" && message.content?.location && (
                              <div className="mb-2">
                                <a
                                  href={`https://www.google.com/maps?q=${message.content.location.latitude},${message.content.location.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded border",
                                    message.direction === "outgoing"
                                      ? "border-green-300 hover:bg-green-600"
                                      : "border-gray-300 hover:bg-gray-100"
                                  )}
                                >
                                  📍 {message.content.location.name || message.content.location.address || "View Location"}
                                </a>
                              </div>
                            )}
                            {/* Only show text if it's meaningful (not just type labels for media) */}
                            {(() => {
                              const displayText = getMessageDisplayText(message);
                              const isMediaType = ["image", "video", "audio", "document", "sticker"].includes(message.type);
                              const hasCaption = typeof message.content === "object" && message.content?.caption && message.content.caption !== message.content.caption?.split("/").pop();
                              // Show text for non-media, or show caption for media if it exists and isn't just the filename
                              if (!isMediaType || (isMediaType && hasCaption)) {
                                const textToShow = isMediaType && typeof message.content === "object" 
                                  ? message.content.caption 
                                  : displayText;
                                if (textToShow && !textToShow.startsWith("📷") && !textToShow.startsWith("🎬") && !textToShow.startsWith("🎵") && !textToShow.startsWith("📄") && !textToShow.startsWith("🎨")) {
                                  return <p className="text-sm break-words">{textToShow}</p>;
                                }
                              }
                              // For media without caption, show nothing (image/video speaks for itself)
                              if (isMediaType && message.mediaUrl) {
                                return null;
                              }
                              // Fallback for other cases
                              return <p className="text-sm break-words">{displayText}</p>;
                            })()}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span
                                className={cn(
                                  "text-xs",
                                  message.direction === "outgoing"
                                    ? "text-green-100"
                                    : "text-muted-foreground"
                                )}
                              >
                                {new Date(message.timestamp).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                              {message.direction === "outgoing" &&
                                getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* 24-hour Window Warning Dialog */}
            <Dialog open={showWindowWarning} onOpenChange={setShowWindowWarning}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-orange-500">
                    <AlertTriangle className="h-5 w-5" />
                    24-Hour Messaging Window Expired
                  </DialogTitle>
                  <DialogDescription className="pt-2">
                    WhatsApp requires businesses to respond within 24 hours of the customer&apos;s last message. 
                    Since the window has expired, you can only send pre-approved template messages.
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-muted p-4 rounded-lg mt-2">
                  <h4 className="font-medium text-sm mb-2">What can you do?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Send a template message to re-engage the customer</li>
                    <li>• Wait for the customer to message you first</li>
                    <li>• The window resets when they reply</li>
                  </ul>
                </div>
                <DialogFooter className="gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowWindowWarning(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowWindowWarning(false);
                      setShowTemplateDialog(true);
                    }}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Send Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-end gap-2">
                <Dialog
                  open={showTemplateDialog}
                  onOpenChange={setShowTemplateDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" title="Send Template Message">
                      <LayoutTemplate className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5 text-green-500" />
                        Send Template Message
                      </DialogTitle>
                      <DialogDescription>
                        Choose a pre-approved template to send. Templates allow you to message customers outside the 24-hour window.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      {/* Template Selection with Search */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Template</label>
                        <Select
                          value={selectedTemplate?.name || ""}
                          onValueChange={(value) => {
                            const template = templates.find(
                              (t) => t.name === value
                            );
                            setSelectedTemplate(template || null);
                            setTemplateParams({}); // Clear params when template changes
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a template..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {templates
                              .filter((t) => t.status === "APPROVED")
                              .map((template) => (
                              <SelectItem
                                key={template.name}
                                value={template.name}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{template.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {template.category} • {template.language}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Template Preview */}
                      {selectedTemplate && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 border-b">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-green-500" />
                              Message Preview
                            </p>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-900">
                            {/* WhatsApp-style message bubble */}
                            <div className="bg-green-100 dark:bg-green-800/30 rounded-lg p-3 max-w-[90%] ml-auto">
                              {/* Header */}
                              {selectedTemplate.components?.find((c: any) => c.type === "HEADER")?.text && (
                                <p className="font-semibold text-sm mb-1">
                                  {(() => {
                                    const headerComp = selectedTemplate.components.find((c: any) => c.type === "HEADER");
                                    let text = headerComp.text;
                                    const matches = text.match(/\{\{(\d+)\}\}/g);
                                    if (matches) {
                                      matches.forEach((match: string) => {
                                        const index = parseInt(match.replace(/[{}]/g, ""));
                                        const paramValue = templateParams[`header_${index}`];
                                        text = text.replace(match, paramValue || `[Parameter ${index}]`);
                                      });
                                    }
                                    return text;
                                  })()}
                                </p>
                              )}
                              {/* Body */}
                              {selectedTemplate.components?.find((c: any) => c.type === "BODY")?.text && (
                                <p className="text-sm whitespace-pre-wrap">
                                  {(() => {
                                    const bodyComp = selectedTemplate.components.find((c: any) => c.type === "BODY");
                                    let text = bodyComp.text;
                                    const matches = text.match(/\{\{(\d+)\}\}/g);
                                    if (matches) {
                                      matches.forEach((match: string) => {
                                        const index = parseInt(match.replace(/[{}]/g, ""));
                                        const paramValue = templateParams[`body_${index}`];
                                        text = text.replace(match, paramValue ? `*${paramValue}*` : `[Parameter ${index}]`);
                                      });
                                    }
                                    return text;
                                  })()}
                                </p>
                              )}
                              {/* Footer */}
                              {selectedTemplate.components?.find((c: any) => c.type === "FOOTER")?.text && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {selectedTemplate.components.find((c: any) => c.type === "FOOTER")?.text}
                                </p>
                              )}
                              {/* Buttons */}
                              {selectedTemplate.components?.find((c: any) => c.type === "BUTTONS") && (
                                <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                                  {selectedTemplate.components.find((c: any) => c.type === "BUTTONS")?.buttons?.map((btn: any, i: number) => (
                                    <div key={i} className="text-center py-1 text-sm text-blue-500 font-medium">
                                      {btn.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="bg-muted px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                            <span>Category: {selectedTemplate.category}</span>
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              {selectedTemplate.status}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Template Parameters */}
                      {selectedTemplate && getTemplateParameters(selectedTemplate).length > 0 && (
                        <div className="space-y-3 border rounded-lg p-3">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs">
                              {getTemplateParameters(selectedTemplate).length} parameter(s)
                            </span>
                            Fill in the values below
                          </p>
                          {getTemplateParameters(selectedTemplate).map((param) => (
                            <div key={`${param.type}_${param.index}`} className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <span className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                                  {`{{${param.index}}}`}
                                </span>
                                {param.text}
                              </label>
                              <Input
                                placeholder={`Enter value...`}
                                value={templateParams[`${param.type}_${param.index}`] || ""}
                                onChange={(e) => {
                                  setTemplateParams(prev => ({
                                    ...prev,
                                    [`${param.type}_${param.index}`]: e.target.value
                                  }));
                                }}
                                className="bg-background"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Send Button */}
                      <Button
                        className="w-full bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          sendTemplateMessage();
                          setShowTemplateDialog(false);
                        }}
                        disabled={!selectedTemplate || sendingMessage}
                      >
                        {sendingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Template Message
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={(e) => handleFileUpload(e, "document")}
                />
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "image")}
                />

                {/* Attachment Menu */}
                <Popover
                  open={showAttachmentMenu}
                  onOpenChange={setShowAttachmentMenu}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={uploadingMedia}
                    >
                      {uploadingMedia ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" side="top" align="start">
                    <div className="grid gap-1">
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 h-9"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <ImageIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Photo</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 h-9"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileText className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Document</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 h-9"
                        onClick={() => {
                          toast({
                            title: "Audio",
                            description: "Audio upload coming soon",
                          });
                          setShowAttachmentMenu(false);
                        }}
                      >
                        <Music className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Audio</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start gap-2 h-9"
                        onClick={() => {
                          toast({
                            title: "Video",
                            description: "Video upload coming soon",
                          });
                          setShowAttachmentMenu(false);
                        }}
                      >
                        <Film className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Video</span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Quick Image Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingMedia || !isMessageWindowActive(selectedConversation)}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>

                {/* Emoji Picker */}
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      disabled={!isMessageWindowActive(selectedConversation)}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" side="top" align="start">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: any) => {
                        setNewMessage((prev) => prev + emoji.native);
                        setShowEmojiPicker(false);
                      }}
                      theme="auto"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </PopoverContent>
                </Popover>

                <Textarea
                  placeholder={isMessageWindowActive(selectedConversation) 
                    ? "Type a message..." 
                    : "24-hour window expired. Send a template to start."
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                  disabled={!isMessageWindowActive(selectedConversation)}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage || !isMessageWindowActive(selectedConversation)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Warning when 24-hour window expired */}
              {!isMessageWindowActive(selectedConversation) && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Messaging Window Expired</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>The 24-hour free messaging window has closed. You can only send template messages now.</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowTemplateDialog(true)}
                      className="ml-2"
                    >
                      <LayoutTemplate className="h-4 w-4 mr-1" />
                      Send Template
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
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
  );
}
