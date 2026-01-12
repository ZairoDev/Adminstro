"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Loader2, X } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import { useAuthStore } from "@/AuthStore";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { formatTime } from "@/app/whatsapp/utils";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical";
  target: {
    roles?: string[];
    locations?: string[];
    allUsers?: boolean;
  };
  createdBy: {
    _id: string;
    name: string;
    email?: string;
  };
  createdAt: string;
  expiresAt?: string;
  isRead: boolean;
}

export function SystemNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const { token } = useAuthStore();
  const { socket } = useSocket();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get("/api/notifications");
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isMounted || !token) return;

    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isMounted, token, fetchNotifications]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !token) return;

    const handleSystemNotification = () => {
      // Refresh notifications when new one arrives
      fetchNotifications();
    };

    socket.on("system-notification", handleSystemNotification);

    return () => {
      socket.off("system-notification", handleSystemNotification);
    };
  }, [socket, token, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.post("/api/notifications/read", { notificationId });
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.isRead);
      await Promise.all(
        unreadNotifications.map((n) =>
          axios.post("/api/notifications/read", { notificationId: n._id })
        )
      );
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDismiss = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent marking as read when clicking dismiss
    
    try {
      // Mark as read (which will hide it from user's view)
      await axios.post("/api/notifications/read", { notificationId });
      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      // Update unread count if it was unread
      const dismissed = notifications.find((n) => n._id === notificationId);
      if (dismissed && !dismissed.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "critical":
        return {
          color: "text-red-600",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-500",
        };
      case "warning":
        return {
          color: "text-yellow-600",
          bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
          borderColor: "border-yellow-500",
        };
      default:
        return {
          color: "text-blue-600",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-500",
        };
    }
  };

  if (!isMounted || !token) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) fetchNotifications();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>System Notifications</DialogTitle>
          <DialogDescription>
            Important announcements and alerts
          </DialogDescription>
        </DialogHeader>

        {/* Filter chips and actions */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-1 flex-wrap">
            {(["all", "critical", "warning", "info"] as const).map((filter) => (
              <Button
                key={filter}
                variant={severityFilter === filter ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs capitalize"
                onClick={() => setSeverityFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Read progress indicator */}
            {notifications.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {notifications.length - unreadCount}/{notifications.length} read
              </div>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications
                  .filter((notification) => {
                    // Apply severity filter
                    if (severityFilter !== "all" && notification.type !== severityFilter) {
                      return false;
                    }
                    // Filter expired
                    const isExpired = notification.expiresAt
                      ? new Date(notification.expiresAt) <= new Date()
                      : false;
                    return !isExpired;
                  })
                  .map((notification) => {
                    const config = getTypeConfig(notification.type);

                  return (
                    <div
                      key={notification._id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors group relative",
                        !notification.isRead && "border-l-4",
                        !notification.isRead && config.borderColor,
                        config.bgColor,
                        notification.isRead && "opacity-60"
                      )}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead(notification._id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">
                              {notification.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", config.color, config.borderColor)}
                            >
                              {notification.type}
                            </Badge>
                            {!notification.isRead && (
                              <Badge className="bg-blue-500 text-white text-xs">
                                New
                              </Badge>
                            )}
                            {notification.type === "critical" && (
                              <Badge className="bg-red-500 text-white text-xs">
                                Critical
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{notification.createdBy.name}</span>
                            <span>•</span>
                            <span>{formatTime(notification.createdAt)}</span>
                          </div>
                        </div>
                        {/* Dismiss button - hidden for critical notifications */}
                        {notification.type !== "critical" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0"
                            onClick={(e) => handleDismiss(notification._id, e)}
                            title="Dismiss notification"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

