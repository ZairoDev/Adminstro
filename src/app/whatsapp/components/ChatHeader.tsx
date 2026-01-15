import { useMemo, useState, useEffect, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Archive,
  BellOff,
  Loader2,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  Video,
  X,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Conversation } from "../types";
import { getRemainingHours } from "../utils";
import { cn } from "@/lib/utils";
import axios from "axios";

interface ChatHeaderProps {
  conversation: Conversation;
  callPermissions: { canMakeCalls: boolean; canMakeVideoCalls: boolean };
  callingAudio: boolean;
  callingVideo: boolean;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onRefreshTemplates: () => void;
  templatesLoading: boolean;
  showMessageSearch: boolean;
  onToggleMessageSearch: () => void;
  onCloseSearch: () => void;
  messageSearchQuery: string;
  onMessageSearchChange: (value: string) => void;
  onMute: () => void;
  onArchive: () => void;
  toastCopy: () => void;
  onDelete: () => void;
  readersRefreshToken?: number;
  currentUserId?: string | null;
  onBack?: () => void;
}

interface Reader {
  userId: string;
  name: string;
  avatar: string | null;
  lastReadAt: Date;
}

export const ChatHeader = memo(function ChatHeader({
  conversation,
  callPermissions,
  callingAudio,
  callingVideo,
  onAudioCall,
  onVideoCall,
  onRefreshTemplates,
  templatesLoading,
  showMessageSearch,
  onToggleMessageSearch,
  onCloseSearch,
  messageSearchQuery,
  onMessageSearchChange,
  onMute,
  onArchive,
  toastCopy,
  onDelete,
  readersRefreshToken,
  currentUserId,
  onBack,
}: ChatHeaderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [readers, setReaders] = useState<Reader[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch readers
  const conversationId = conversation?._id;
  useEffect(() => {
    if (!conversationId) return;
    let isCancelled = false;

    const fetchReaders = async () => {
      try {
        const response = await axios.get(
          `/api/whatsapp/conversations/${conversationId}/readers`
        );
        if (!isCancelled && response.data.success) {
          setReaders(response.data.readers || []);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error fetching readers:", error);
        }
      }
    };

    fetchReaders();
    const interval = setInterval(fetchReaders, 300000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, readersRefreshToken]);

  const remaining = useMemo(() => {
    if (!isMounted) return null;
    return getRemainingHours(conversation);
  }, [conversation, isMounted]);

  const displayName = useMemo(() => {
    const savedName = conversation.participantName;
    const whatsappName =
      (conversation as any).whatsappName ||
      (conversation as any).waName ||
      (conversation as any).waDisplayName;
    const phone = conversation.participantPhone;

    if (savedName && whatsappName && whatsappName !== savedName) {
      return `${savedName} (${whatsappName})`;
    }
    return savedName || whatsappName || phone;
  }, [conversation]);

  // Status text
  const statusText = useMemo(() => {
    if (conversation.isTyping) return "typing...";
    if (conversation.isOnline) return "online";
    if (conversation.lastSeen) {
      const lastSeen = new Date(conversation.lastSeen);
      const now = new Date();
      const diff = now.getTime() - lastSeen.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "last seen just now";
      if (minutes < 60) return `last seen ${minutes}m ago`;
      if (minutes < 1440) return `last seen ${Math.floor(minutes / 60)}h ago`;
      return `last seen ${lastSeen.toLocaleDateString()}`;
    }
    return conversation.participantPhone;
  }, [conversation]);

  return (
    <div className="flex-shrink-0">
      {/* Main Header */}
      <div className="h-[60px] px-4 flex items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Back button for mobile */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden text-[#54656f] dark:text-[#aebac1] hover:bg-transparent -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Avatar */}
          <Avatar className="h-10 w-10 cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0">
            <AvatarImage src={conversation.participantProfilePic} />
            <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6b7b85] text-[#54656f] dark:text-white text-sm">
              {displayName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name & Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                {displayName}
              </h2>
              {conversation.referenceLink && (
                <a
                  href={conversation.referenceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors flex-shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "text-[13px] truncate",
                  conversation.isTyping
                    ? "text-[#25d366]"
                    : "text-[#667781] dark:text-[#8696a0]"
                )}
              >
                {statusText}
              </p>

              {/* Time remaining indicator */}
              {remaining ? (
                <span
                  className={cn(
                    "text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0",
                    remaining.hours < 2
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                      : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  )}
                >
                  <Timer className="h-3 w-3" />
                  {remaining.hours}h {remaining.minutes}m
                </span>
              ) : (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-1 flex-shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Template only
                </span>
              )}

              {/* Readers */}
              {readers.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex -space-x-1.5 flex-shrink-0">
                        {readers
                          .filter((r) => !currentUserId || r.userId !== currentUserId)
                          .slice(0, 3)
                          .map((reader) => (
                            <Avatar key={reader.userId} className="h-5 w-5 border-2 border-[#f0f2f5] dark:border-[#202c33]">
                              <AvatarImage src={reader.avatar || undefined} />
                              <AvatarFallback className="text-[9px] bg-[#dfe5e7] dark:bg-[#6b7b85]">
                                {reader.name?.slice(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        {readers.length > 3 && (
                          <div className="h-5 w-5 rounded-full bg-[#dfe5e7] dark:bg-[#6b7b85] border-2 border-[#f0f2f5] dark:border-[#202c33] flex items-center justify-center text-[9px] text-[#54656f] dark:text-white">
                            +{readers.length - 3}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium mb-1">Seen by:</p>
                      {readers.map((r) => (
                        <p key={r.userId} className="text-sm">
                          {currentUserId && r.userId === currentUserId ? "You" : r.name}
                        </p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {callPermissions.canMakeVideoCalls && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVideoCall}
              disabled={callingVideo}
              className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full"
            >
              {callingVideo ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>
          )}

          {callPermissions.canMakeCalls && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAudioCall}
              disabled={callingAudio}
              className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full"
            >
              {callingAudio ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMessageSearch}
            className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={toastCopy}>
                <Phone className="h-4 w-4 mr-3" />
                Copy phone number
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRefreshTemplates}>
                <RefreshCw className={cn("h-4 w-4 mr-3", templatesLoading && "animate-spin")} />
                Refresh templates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onMute}>
                <BellOff className="h-4 w-4 mr-3" />
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-3" />
                Archive chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4 mr-3" />
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar (collapsible) */}
      {showMessageSearch && (
        <div className="h-[50px] px-4 flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#54656f] dark:text-[#8696a0]" />
            <Input
              autoFocus
              placeholder="Search messages..."
              value={messageSearchQuery}
              onChange={(e) => onMessageSearchChange(e.target.value)}
              className="h-[35px] pl-10 bg-white dark:bg-[#2a3942] border-0 rounded-lg text-[14px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseSearch}
            className="text-[#54656f] dark:text-[#8696a0] hover:bg-transparent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
});
