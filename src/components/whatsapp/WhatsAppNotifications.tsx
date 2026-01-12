"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Clock, ExternalLink, Loader2, Circle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/AuthStore";
import { useSocket } from "@/hooks/useSocket";

interface NotificationItem {
  _id: string;
  participantPhone: string;
  participantName: string;
  lastMessageContent: string;
  type: "expiring" | "unread";
  hoursRemaining?: number;
  minutesRemaining?: number;
  severity?: "critical" | "urgent" | "warning";
  unreadCount?: number;
  lastMessageTime?: string;
  businessPhoneId: string;
  assignedAgent?: string;
}

export function WhatsAppNotifications() {
  const [summary, setSummary] = useState<{
    expiringCount: number;
    unreadCount: number;
    topItems: NotificationItem[];
  }>({
    expiringCount: 0,
    unreadCount: 0,
    topItems: [],
  });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { token } = useAuthStore();
  const { socket, isConnected } = useSocket();

  // Check if user has access
  const hasAccess = token?.role === "SuperAdmin" || 
                   token?.role === "Sales-TeamLead" || 
                   token?.role === "Sales";

  // Feature flag
  const FEATURE_WHATSAPP_NOTIFICATIONS = process.env.NEXT_PUBLIC_FEATURE_WHATSAPP_NOTIFICATIONS !== "false";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!hasAccess) return;

    try {
      setLoading(true);
      const response = await axios.get("/api/whatsapp/notifications/summary");
      if (response.data.success) {
        setSummary(response.data.summary || {
          expiringCount: 0,
          unreadCount: 0,
          topItems: [],
        });
      }
    } catch (err: any) {
      console.error("Error fetching WhatsApp notifications:", err);
      setSummary({
        expiringCount: 0,
        unreadCount: 0,
        topItems: [],
      });
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!isMounted || !hasAccess) return;
    
    fetchNotifications();
    // Refresh every 15 minutes (background job handles more frequent checks)
    const interval = setInterval(fetchNotifications, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isMounted, hasAccess, fetchNotifications]);

  // Listen for real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !hasAccess) return;

    socket.emit("join-whatsapp-room");

    // Listen for new messages and conversation updates
    const handleNewMessage = () => {
      fetchNotifications();
    };

    const handleConversationUpdate = () => {
      fetchNotifications();
    };

    socket.on("whatsapp-new-message", handleNewMessage);
    socket.on("whatsapp-conversation-update", handleConversationUpdate);

    return () => {
      socket.off("whatsapp-new-message", handleNewMessage);
      socket.off("whatsapp-conversation-update", handleConversationUpdate);
    };
  }, [socket, hasAccess, fetchNotifications]);

  const totalCount = summary.expiringCount + summary.unreadCount;

  const handleOpenConversation = (participantPhone: string) => {
    // WhatsApp page expects 'phone' parameter, not conversation ID
    router.push(`/whatsapp?phone=${encodeURIComponent(participantPhone)}`);
    setIsOpen(false);
  };

  if (!hasAccess || !isMounted || !FEATURE_WHATSAPP_NOTIFICATIONS) {
    return null;
  }

  // Connection health indicator
  const getConnectionStatus = () => {
    if (!socket) return { color: "bg-gray-400", label: "Not initialized" };
    if (isConnected) return { color: "bg-green-500", label: "Connected" };
    return { color: "bg-yellow-500", label: "Reconnecting" };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) fetchNotifications();
    }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="relative rounded-3xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold flex gap-x-1 hover:scale-105 transition-transform"
        >
          <div className="relative">
            <FaWhatsapp className="h-4 w-4" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Circle className={`absolute -top-1 -right-1 h-2 w-2 ${connectionStatus.color} rounded-full border border-white`} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Socket: {connectionStatus.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          WhatsApp
          {totalCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5 animate-bounce"
            >
              {totalCount > 99 ? "99+" : totalCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaWhatsapp className="h-5 w-5 text-green-500" />
            WhatsApp Notifications
          </DialogTitle>
          <DialogDescription>
            Expiring conversations and unread messages
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Expiring Conversations */}
            {summary.topItems.filter((item) => item.type === "expiring").length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Expiring Soon ({summary.expiringCount})
                </h3>
                <div className="space-y-2">
                  {summary.topItems
                    .filter((item) => item.type === "expiring")
                    .map((item) => {
                      const urgencyColor = item.severity === "critical" ? "text-red-600 border-red-500" : 
                                         item.severity === "urgent" ? "text-orange-600 border-orange-500" : 
                                         "text-yellow-600 border-yellow-500";
                      const bgColor = item.severity === "critical" ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-100" :
                                     item.severity === "urgent" ? "bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100" :
                                     "bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100";
                      
                      return (
                        <div
                          key={item._id}
                          className={`p-3 rounded-lg border ${bgColor} cursor-pointer transition-colors`}
                          onClick={() => handleOpenConversation(item.participantPhone)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm truncate">
                                  {item.participantName}
                                </p>
                                <Badge variant="outline" className={`text-xs ${urgencyColor}`}>
                                  {item.hoursRemaining}h {item.minutesRemaining}m
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.lastMessageContent}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {summary.topItems.filter((item) => item.type === "expiring").length > 0 && 
             summary.topItems.filter((item) => item.type === "unread").length > 0 && (
              <Separator />
            )}

            {/* Unread Conversations */}
            {summary.topItems.filter((item) => item.type === "unread").length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Unread Messages ({summary.unreadCount})
                </h3>
                <div className="space-y-2">
                  {summary.topItems
                    .filter((item) => item.type === "unread")
                    .map((item) => (
                      <div
                        key={item._id}
                        className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
                        onClick={() => handleOpenConversation(item.participantPhone)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">
                                {item.participantName}
                              </p>
                              <Badge className="bg-blue-500 text-white text-xs">
                                {item.unreadCount}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.lastMessageContent}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {totalCount === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            )}

            {totalCount > 0 && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push("/whatsapp");
                    setIsOpen(false);
                  }}
                  className="w-full"
                >
                  View All Conversations
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


