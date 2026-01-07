import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageSquare, Phone, Wifi, WifiOff, Check, CheckCheck, Clock, AlertTriangle, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { formatTime } from "../utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  conversationCounts?: {
    total: number;
    owners: number;
    guests: number;
  };
  allowedPhoneConfigs: any[];
  selectedPhoneConfig: any;
  onPhoneConfigChange: (config: any) => void;
  newCountryCode: string;
  onCountryCodeChange: (value: string) => void;
  newPhoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  onStartConversation: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  isConnected: boolean;
  onOpenAddGuest: () => void;
}

export function ConversationSidebar({
  conversations,
  selectedConversation,
  searchQuery,
  onSearchQueryChange,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  conversationCounts = { total: 0, owners: 0, guests: 0 },
  allowedPhoneConfigs,
  selectedPhoneConfig,
  onPhoneConfigChange,
  newCountryCode,
  onCountryCodeChange,
  newPhoneNumber,
  onPhoneNumberChange,
  onStartConversation,
  onSelectConversation,
  isConnected,
  onOpenAddGuest,
}: SidebarProps) {
  const [conversationTab, setConversationTab] = useState<"all" | "owners" | "guests">("all");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filter conversations by tab and search query (client-side filtering for loaded conversations)
  const filteredConversations = conversations.filter((conv) => {
    // Filter by tab
    if (conversationTab === "owners" && conv.conversationType !== "owner") return false;
    if (conversationTab === "guests" && conv.conversationType !== "guest") return false;
    
    // Filter by search query
    return (
      conv.participantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participantPhone.includes(searchQuery)
    );
  });

  // Use database counts from API, not UI calculations
  const ownerCount = conversationCounts.owners;
  const guestCount = conversationCounts.guests;
  const totalCount = conversationCounts.total;

  const getStatusIcon = (status?: Conversation["lastMessageStatus"]) => {
    if (!status) return null;
    switch (status) {
      case "sending":
        return <Clock className="h-3 w-3 text-gray-400" />;
      case "sent":
        return <Check className="h-3 w-3 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "failed":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status?: Conversation["lastMessageStatus"]) => {
    if (!status) return "";
    switch (status) {
      case "sending": return "Sending...";
      case "sent": return "Sent";
      case "delivered": return "Delivered";
      case "read": return "Read";
      case "failed": return "Failed";
      default: return "";
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <Card className="w-80 flex flex-col h-full">
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
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        {/* Tabs for Owners/Guests */}
        <div className="p-2 border-b">
          <Tabs value={conversationTab} onValueChange={(v) => setConversationTab(v as "all" | "owners" | "guests")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="owners" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                Owners ({ownerCount})
              </TabsTrigger>
              <TabsTrigger value="guests" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Guests ({guestCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="p-2 border-b space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={onOpenAddGuest}
          >
            <Users className="h-3 w-3 mr-1" />
            Add New Guest
          </Button>
          <div className="flex gap-2">
            <div className="flex gap-1 flex-1">
              {allowedPhoneConfigs.length > 1 && (
                <div className="w-48">
                  <Select
                    value={selectedPhoneConfig?.phoneNumberId || ""}
                    onValueChange={(val) => {
                      const found = allowedPhoneConfigs.find((c: any) => c.phoneNumberId === val);
                      onPhoneConfigChange(found || null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select WhatsApp Number" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedPhoneConfigs.map((config: any) => (
                        <SelectItem key={config.phoneNumberId} value={config.phoneNumberId}>
                          {config.displayName} ({config.displayNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  +
                </span>
                <Input
                  placeholder="91"
                  value={newCountryCode}
                  onChange={(e) => onCountryCodeChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-9 text-sm w-16 pl-5"
                  maxLength={4}
                />
              </div>
              <Input
                placeholder="Phone number..."
                value={newPhoneNumber}
                onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, ""))}
                className="h-9 text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onStartConversation();
                }}
              />
            </div>
            <Button
              size="sm"
              onClick={onStartConversation}
              disabled={loading || !newCountryCode.trim() || !newPhoneNumber.trim()}
              title={
                !newCountryCode.trim() || !newPhoneNumber.trim()
                  ? "Enter country code and phone number"
                  : "Start conversation"
              }
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet. Start a new chat by entering a phone number above.
            </div>
          ) : (
            <>
              {filteredConversations.map((conversation) => (
              <div
                key={conversation._id}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b",
                  selectedConversation?._id === conversation._id && "bg-muted",
                  conversation.unreadCount > 0 && "bg-green-50 dark:bg-green-950/20"
                )}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={conversation.participantProfilePic} />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {conversation.participantName?.slice(0, 2).toUpperCase() || "??"}
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
                        "text-base truncate",
                        conversation.unreadCount > 0 ? "font-bold" : "font-medium"
                      )}
                    >
                      {conversation.participantName || conversation.participantPhone}
                    </p>
                    {conversation.lastMessageTime && (
                      <span className="text-sm text-muted-foreground">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      {conversation.lastMessageDirection === "outgoing" && conversation.lastMessageStatus && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex-shrink-0">
                                {getStatusIcon(conversation.lastMessageStatus)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getStatusLabel(conversation.lastMessageStatus)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <p
                        className={cn(
                          "text-sm truncate",
                          conversation.unreadCount > 0
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {conversation.lastMessageContent || conversation.participantPhone}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="h-5 min-w-5 rounded-full p-0 flex items-center justify-center bg-green-500 text-xs flex-shrink-0"
                      >
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerTarget} className="flex items-center justify-center py-4">
                {loadingMore ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="h-1" />
                )}
              </div>
            )}
            </>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

