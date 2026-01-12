"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Trash2, Eye, EyeOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useAuthStore } from "@/AuthStore";
import { cn } from "@/lib/utils";
import { formatTime } from "@/app/whatsapp/utils";
import { BroadcastNotificationForm } from "@/components/Notifications/BroadcastNotificationForm";

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
  isActive: boolean;
  readCount: number;
}

export default function NotificationsManagementPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const { token } = useAuthStore();

  const isSuperAdmin = token?.role === "SuperAdmin";
  const isHR = token?.role === "HR";
  const canBroadcast = isSuperAdmin || isHR;

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }
    fetchNotifications();
  }, [isSuperAdmin, activeTab]);

  const fetchNotifications = async () => {
    if (!isSuperAdmin) return;

    try {
      setLoading(true);
      const includeInactive = activeTab === "all" || activeTab === "inactive";
      const response = await axios.get(
        `/api/notifications/all?includeInactive=${includeInactive}&limit=100`
      );
      if (response.data.success) {
        let filtered = response.data.notifications || [];
        
        // Filter by active/inactive based on tab
        if (activeTab === "active") {
          filtered = filtered.filter((n: Notification) => n.isActive);
        } else if (activeTab === "inactive") {
          filtered = filtered.filter((n: Notification) => !n.isActive);
        }
        
        setNotifications(filtered);
        setTotalCount(response.data.totalCount || 0);
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (notificationId: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/api/notifications/${notificationId}`, {
        isActive: !currentStatus,
      });
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isActive: !currentStatus } : n
        )
      );
    } catch (error: any) {
      console.error("Error toggling notification status:", error);
      alert(error.response?.data?.error || "Failed to update notification");
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm("Are you sure you want to permanently delete this notification?")) {
      return;
    }

    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setTotalCount((prev) => prev - 1);
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      alert(error.response?.data?.error || "Failed to delete notification");
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

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Access denied. Only SuperAdmin can view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all system notifications
          </p>
        </div>
        {canBroadcast && (
          <BroadcastNotificationForm onSuccess={fetchNotifications} />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications found</p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const config = getTypeConfig(notification.type);
                        const isExpired = notification.expiresAt
                          ? new Date(notification.expiresAt) <= new Date()
                          : false;

                        return (
                          <div
                            key={notification._id}
                            className={cn(
                              "p-4 rounded-lg border transition-colors",
                              config.bgColor,
                              !notification.isActive && "opacity-50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-sm">
                                    {notification.title}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", config.color, config.borderColor)}
                                  >
                                    {notification.type}
                                  </Badge>
                                  {!notification.isActive && (
                                    <Badge variant="outline" className="text-xs">
                                      Inactive
                                    </Badge>
                                  )}
                                  {isExpired && (
                                    <Badge variant="outline" className="text-xs text-gray-500">
                                      Expired
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                  <div>
                                    <span className="font-medium">Target: </span>
                                    {notification.target.allUsers ? (
                                      <span>All Users</span>
                                    ) : (
                                      <span>
                                        {notification.target.roles?.length ? `Roles: ${notification.target.roles.join(", ")}` : ""}
                                        {notification.target.roles?.length && notification.target.locations?.length ? " • " : ""}
                                        {notification.target.locations?.length ? `Locations: ${notification.target.locations.join(", ")}` : ""}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-medium">Created by: </span>
                                    {notification.createdBy.name}
                                  </div>
                                  <div>
                                    <span className="font-medium">Read by: </span>
                                    {notification.readCount} user(s)
                                  </div>
                                  <div>
                                    <span className="font-medium">Created: </span>
                                    {formatTime(notification.createdAt)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(notification._id, notification.isActive)}
                                  title={notification.isActive ? "Deactivate" : "Activate"}
                                >
                                  {notification.isActive ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(notification._id)}
                                  title="Delete notification"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



