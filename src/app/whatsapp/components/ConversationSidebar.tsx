import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Phone, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { formatTime } from "../utils";

interface SidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  loading: boolean;
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
}

export function ConversationSidebar({
  conversations,
  selectedConversation,
  searchQuery,
  onSearchQueryChange,
  loading,
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
}: SidebarProps) {
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participantPhone.includes(searchQuery)
  );

  return (
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
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="p-2 border-b">
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
        <ScrollArea className="h-[calc(100%-80px)]">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet. Start a new chat by entering a phone number above.
            </div>
          ) : (
            filteredConversations.map((conversation) => (
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
                        "text-sm truncate",
                        conversation.unreadCount > 0 ? "font-bold" : "font-medium"
                      )}
                    >
                      {conversation.participantName || conversation.participantPhone}
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
                      {conversation.lastMessageDirection === "outgoing" && <span className="mr-1">✓</span>}
                      {conversation.lastMessageContent || conversation.participantPhone}
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
  );
}

