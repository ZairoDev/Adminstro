import { useMemo, useState, useEffect, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Loader2,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Timer,
  X,
  ExternalLink,
  ArrowLeft,
  Radio,
  User,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Conversation } from "../types";
import type { WhatsAppPhoneConfig } from "@/lib/whatsapp/config";
import {
  resolveConversationDisplayLabel,
  type WhatsAppPhoneMaskRules,
} from "@/lib/whatsapp/phoneMask";
import { getRemainingHours } from "../utils";
import { cn } from "@/lib/utils";
import axios from "@/util/axios";

interface ChatHeaderProps {
  conversation: Conversation;
  callPermissions: { canMakeCalls: boolean };
  callingAudio: boolean;
  onAudioCall: () => void;
  onRefreshTemplates: () => void;
  templatesLoading: boolean;
  showMessageSearch: boolean;
  onToggleMessageSearch: () => void;
  onCloseSearch: () => void;
  messageSearchQuery: string;
  onMessageSearchChange: (value: string) => void;
  toastCopy: () => void;
  readersRefreshToken?: number;
  currentUserId?: string | null;
  onBack?: () => void;
  isMobile?: boolean;
  availablePhoneConfigs?: WhatsAppPhoneConfig[];
  currentPhoneId?: string | null;
  onTransferLead?: () => void;
  onConversationTypeChange?: (
    conversationId: string,
    conversationType: "owner" | "guest",
  ) => void | Promise<void>;
  phoneMaskRules?: WhatsAppPhoneMaskRules;
  userRole?: string;
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
  onAudioCall,
  onRefreshTemplates,
  templatesLoading,
  showMessageSearch,
  onToggleMessageSearch,
  onCloseSearch,
  messageSearchQuery,
  onMessageSearchChange,
  toastCopy,
  readersRefreshToken,
  currentUserId,
  onBack,
  isMobile = false,
  availablePhoneConfigs = [],
  currentPhoneId,
  onTransferLead,
  onConversationTypeChange,
  phoneMaskRules,
  userRole = "",
}: ChatHeaderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [readers, setReaders] = useState<Reader[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const conversationId = conversation?._id;
  useEffect(() => {
    if (!conversationId) return;
    let isCancelled = false;

    const fetchReaders = async () => {
      try {
        const response = await axios.get(
          `/api/whatsapp/conversations/${conversationId}/readers`,
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

    void fetchReaders();
    return () => {
      isCancelled = true;
    };
  }, [conversationId, readersRefreshToken]);

  const remaining = useMemo(
    () => (isMounted ? getRemainingHours(conversation) : null),
    [conversation, isMounted],
  );

  const maskRules = phoneMaskRules ?? {
    maskOwnerPhones: false,
    maskGuestPhones: false,
  };
  const whatsappName =
    (conversation as { whatsappName?: string }).whatsappName ||
    (conversation as { waName?: string }).waName ||
    (conversation as { waDisplayName?: string }).waDisplayName;

  const { title: headerTitle, maskedPhone: phone } = resolveConversationDisplayLabel(
    {
      participantName: conversation.participantName,
      participantPhone: conversation.participantPhone,
      whatsappName: typeof whatsappName === "string" ? whatsappName : undefined,
      conversationType: conversation.conversationType,
      isInternal:
        Boolean(conversation.isInternal) || conversation.source === "internal",
    },
    maskRules,
    userRole,
  );
  const role = conversation.conversationType;
  const canChangeType =
    !conversation.isInternal &&
    conversation.source !== "internal" &&
    Boolean(onConversationTypeChange);
  const statusText = conversation.isTyping
    ? "typing..."
    : conversation.isOnline
      ? "online"
      : conversation.lastSeen && isMounted
        ? `last seen ${new Date(conversation.lastSeen).toLocaleString()}`
        : phone;

  return (
    <div className="flex flex-col bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]">
      <div
        className={cn(
          "flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33]",
          "h-[60px] px-2 md:px-4",
        )}
      >
        {onBack && isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full h-10 w-10 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={conversation.participantProfilePic} />
            <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6b7b85] text-[#54656f] dark:text-white">
              {headerTitle.slice(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                {headerTitle}
              </h2>
              {conversation.referenceLink && (
                <a
                  href={conversation.referenceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#53bdeb] hover:opacity-80 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
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
                    : "text-[#667781] dark:text-[#8696a0]",
                )}
              >
                {statusText}
              </p>

              {remaining ? (
                <span
                  className={cn(
                    "text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0",
                    remaining.hours < 2
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                      : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
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

              {readers.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex -space-x-1.5 flex-shrink-0">
                        {readers
                          .filter((r) => !currentUserId || r.userId !== currentUserId)
                          .slice(0, 3)
                          .map((reader) => (
                            <Avatar
                              key={reader.userId}
                              className="h-5 w-5 border-2 border-[#f0f2f5] dark:border-[#202c33]"
                            >
                              <AvatarImage src={reader.avatar || undefined} />
                              <AvatarFallback className="text-[9px] bg-[#dfe5e7] dark:bg-[#6b7b85]">
                                {reader.name?.slice(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
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

        <div className="flex items-center gap-0 md:gap-1 flex-shrink-0">
          {onTransferLead && availablePhoneConfigs.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTransferLead}
              className={cn(
                "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                "hidden md:flex",
                "md:h-10 md:w-10",
              )}
            >
              <Radio className="h-5 w-5" />
            </Button>
          )}

          {callPermissions.canMakeCalls && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAudioCall}
              disabled={callingAudio}
              className={cn(
                "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                "hidden md:flex",
                "md:h-10 md:w-10",
              )}
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
            className={cn(
              "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
              "h-11 w-11 min-h-[44px] min-w-[44px]",
              "md:h-10 md:w-10 md:min-h-0 md:min-w-0",
            )}
          >
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                  "h-11 w-11 min-h-[44px] min-w-[44px]",
                  "md:h-10 md:w-10 md:min-h-0 md:min-w-0",
                )}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {callPermissions.canMakeCalls && (
                <DropdownMenuItem onClick={onAudioCall} className="md:hidden">
                  <Phone className="h-4 w-4 mr-3" />
                  Voice call
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toastCopy}>
                <Phone className="h-4 w-4 mr-3" />
                Copy phone number
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRefreshTemplates}>
                <RefreshCw className={cn("h-4 w-4 mr-3", templatesLoading && "animate-spin")} />
                Refresh templates
              </DropdownMenuItem>
              {canChangeType && role !== "owner" && (
                <DropdownMenuItem
                  onClick={() =>
                    void onConversationTypeChange?.(conversation._id, "owner")
                  }
                >
                  <User className="h-4 w-4 mr-3" />
                  Convert to owner
                </DropdownMenuItem>
              )}
              {canChangeType && role !== "guest" && (
                <DropdownMenuItem
                  onClick={() =>
                    void onConversationTypeChange?.(conversation._id, "guest")
                  }
                >
                  <Users className="h-4 w-4 mr-3" />
                  Convert to guest
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showMessageSearch && (
        <div
          className={cn(
            "flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]",
            "h-[52px] px-3",
            "md:h-[50px] md:px-4",
          )}
        >
          <Search className="h-4 w-4 text-[#54656f] dark:text-[#8696a0] flex-shrink-0" />
          <Input
            placeholder="Search messages..."
            value={messageSearchQuery}
            onChange={(e) => onMessageSearchChange(e.target.value)}
            className="flex-1 h-9 bg-white dark:bg-[#2a3942] border-0 focus-visible:ring-0"
          />
          <Button variant="ghost" size="icon" onClick={onCloseSearch} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});
