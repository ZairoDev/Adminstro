import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Search,
  Phone,
  Wifi,
  WifiOff,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  User,
  Users,
  UserPlus,
  ArrowLeft,
  MoreVertical,
  Filter,
  Archive,
  ArchiveRestore,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { formatTime } from "../utils";
import { formatPhoneDisplayWithLocation } from "@/lib/whatsapp/config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUnifiedWhatsAppSearch } from "../hooks/useUnifiedWhatsAppSearch";
import { UnifiedSearchResults } from "./UnifiedSearchResults";

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
  conversationCounts?: {
    totalCount: number;
    ownerCount: number;
    guestCount: number;
  };
  hasMoreConversations?: boolean;
  loadingMoreConversations?: boolean;
  onLoadMoreConversations?: () => void;
  onAddGuest?: () => void;
  // Archive functionality (WhatsApp-style)
  archivedCount?: number;
  showingArchived?: boolean;
  onToggleArchiveView?: () => void;
  onArchiveConversation?: (conversationId: string) => void;
  onUnarchiveConversation?: (conversationId: string) => void;
  // User info for access control
  userRole?: string;
  userAreas?: string | string[];
  // Mobile responsiveness
  isMobile?: boolean;
  // Jump to message from search results
  onJumpToMessage?: (conversationId: string, messageId: string) => void;
}

// Memoized conversation item to prevent unnecessary re-renders
const ConversationItem = memo(function ConversationItem({
  conversation,
  isSelected,
  onClick,
  isMounted,
  onArchive,
  onUnarchive,
  isArchived,
  isMobile = false,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  isMounted: boolean;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  isArchived?: boolean;
  isMobile?: boolean;
}) {
  const hasUnread =
    (conversation.unreadCount || 0) > 0 &&
    conversation.lastMessageDirection === "incoming";

  const getStatusIcon = (status?: Conversation["lastMessageStatus"]) => {
    if (!status) return null;
    switch (status) {
      case "sending":
        return <Clock className="h-3 w-3 text-[#8696a0]" />;
      case "sent":
        return <Check className="h-3 w-3 text-[#8696a0]" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-[#8696a0]" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-[#53bdeb]" />;
      case "failed":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const displayName = (() => {
    // Check if this is the "You" conversation (internal)
    if (conversation.isInternal || conversation.source === "internal") {
      return "You";
    }
    
    const savedName = conversation.participantName;
    const whatsappName =
      (conversation as any).whatsappName ||
      (conversation as any).waName ||
      (conversation as any).waDisplayName;
    const phone = conversation.participantPhone;

    if (savedName && whatsappName && whatsappName !== savedName) {
      return `${savedName} (${whatsappName})`;
    }
    if (savedName) return savedName;
    if (whatsappName) return whatsappName;
    return phone;
  })();

  return (
    <div
      className={cn(
        "flex items-center gap-3 cursor-pointer transition-colors group border border-transparent rounded-md",
        // Mobile: Larger touch targets (min 48px height)
        "px-3 py-3 min-h-[72px]",
        // Desktop: Slightly smaller
        "md:px-3 md:py-2.5 md:min-h-0",
        // Hover states (desktop only, mobile uses active)
        "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]",
        "active:bg-[#e9edef] dark:active:bg-[#1d282f]",
        isSelected && "bg-[#f0f2f5] dark:bg-[#2a3942]",
        hasUnread && !isSelected && "bg-[#f0f2f5] dark:bg-[#182229]"
      )}
      onClick={onClick}
    >
      {/* Avatar - Responsive sizing */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 md:h-12 md:w-12">
          <AvatarImage src={conversation.participantProfilePic} />
          <AvatarFallback className={cn(
            "text-sm font-medium",
            conversation.isInternal || conversation.source === "internal"
              ? "bg-[#25d366] text-white" // Green background for "You" conversation
              : "bg-[#dfe5e7] dark:bg-[#6b7b85] text-[#54656f] dark:text-white"
          )}>
            {conversation.isInternal || conversation.source === "internal" 
              ? "You" 
              : displayName?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        {/* Green dot: online OR has unread incoming messages */}
        {(conversation.isOnline || hasUnread) && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-[#25d366] rounded-full border-2 border-white dark:border-[#111b21]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#e9edef] dark:border-[#222d34] py-1">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={cn(
              "text-[15px] truncate",
              hasUnread ? "font-semibold text-[#111b21] dark:text-[#e9edef]" : "font-normal text-[#111b21] dark:text-[#e9edef]"
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              "text-xs flex-shrink-0 ml-2",
              hasUnread ? "text-[#25d366] font-medium" : "text-[#667781] dark:text-[#8696a0]"
            )}
          >
            {isMounted ? formatTime(conversation.lastMessageTime) : ""}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {conversation.lastMessageDirection === "outgoing" && (
              <span className="flex-shrink-0">
                {getStatusIcon(conversation.lastMessageStatus)}
              </span>
            )}
            <span
              className={cn(
                "text-[13px] truncate",
                hasUnread
                  ? "text-[#111b21] dark:text-[#d1d7db] font-medium"
                  : "text-[#667781] dark:text-[#8696a0]"
              )}
            >
              {conversation.lastMessageContent || conversation.participantPhone}
            </span>
          </div>

          {/* Unread badge */}
          {hasUnread && (
            <span className="ml-2 flex-shrink-0 bg-[#25d366] text-white text-[11px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
              {conversation.unreadCount}
            </span>
          )}
          
          {/* Archive/Unarchive button on hover */}
          {(onArchive || onUnarchive) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#e9edef] dark:hover:bg-[#374045] transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-[#54656f] dark:text-[#aebac1]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isArchived ? (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onUnarchive?.(conversation._id);
                  }}>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onArchive?.(conversation._id);
                  }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
});

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
  conversationCounts,
  hasMoreConversations,
  loadingMoreConversations,
  onLoadMoreConversations,
  onAddGuest,
  // Archive props
  archivedCount = 0,
  showingArchived = false,
  onToggleArchiveView,
  onArchiveConversation,
  onUnarchiveConversation,
  // User info for access control
  userRole,
  userAreas,
  // Mobile responsiveness
  isMobile = false,
  // Jump to message
  onJumpToMessage,
}: SidebarProps) {
  const [conversationTab, setConversationTab] = useState<"all" | "owners" | "guests">("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Unified conversation-centric search hook
  const {
    query: unifiedSearchQuery,
    results: unifiedSearchResults,
    loading: searchLoading,
    error: searchError,
    isSearchMode,
    search: executeSearch,
    clearSearch,
  } = useUnifiedWhatsAppSearch({
    debounceMs: 300,
    includeArchived: showingArchived,
    limit: 50,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handler to clear search completely
  const handleClearSearch = useCallback(() => {
    onSearchQueryChange("");
    clearSearch();
  }, [onSearchQueryChange, clearSearch]);

  // CRITICAL: No client-side filtering - database is source of truth
  // Search and phone filtering happen at API/database level
  // Only filter by conversation type (tab) client-side as this is a UI-only filter
  const filteredConversations = conversations.filter((conv) => {
    if (conversationTab === "owners" && conv.conversationType !== "owner") return false;
    if (conversationTab === "guests" && conv.conversationType !== "guest") return false;
    return true; // No search filtering - handled by backend
  });

  // Counts
  const ownerCount = isMounted && conversationCounts?.ownerCount !== undefined
    ? conversationCounts.ownerCount
    : conversations.filter((c) => c.conversationType === "owner").length;
  const guestCount = isMounted && conversationCounts?.guestCount !== undefined
    ? conversationCounts.guestCount
    : conversations.filter((c) => c.conversationType === "guest").length;
  const totalCount = isMounted && conversationCounts?.totalCount !== undefined
    ? conversationCounts.totalCount
    : conversations.length;

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !onLoadMoreConversations || !hasMoreConversations || loadingMoreConversations) return;
    
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      onLoadMoreConversations();
    }
  }, [hasMoreConversations, loadingMoreConversations, onLoadMoreConversations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className={cn(
      "flex flex-col h-full bg-white dark:bg-[#111b21] min-h-0",
      // Mobile: Full width, no border
      "w-full",
      // Desktop: Fixed width with border
      "md:border-r md:border-[#e9edef] md:dark:border-[#222d34]"
    )}>
      {/* Header - Responsive */}
      <div className={cn(
        "flex items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] flex-shrink-0",
        // Mobile: Taller header with safe area
        "h-[56px] px-3 pt-[env(safe-area-inset-top,0px)]",
        // Desktop: Standard height
        "md:h-[60px] md:px-4 md:pt-0"
      )}>
        {showNewChat ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewChat(false)}
              className="text-[#54656f] dark:text-[#aebac1] hover:bg-transparent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-[17px] font-medium text-[#111b21] dark:text-[#e9edef]">New chat</span>
            <div className="w-10" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-[20px] font-semibold text-[#111b21] dark:text-[#e9edef]">Chats</span>
              {isMounted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {isConnected ? (
                        <Wifi className="h-4 w-4 text-[#25d366]" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {isConnected ? "Connected" : "Disconnected"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-center gap-0.5 md:gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewChat(true)}
                className={cn(
                  "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                  // Mobile: Larger touch targets
                  "h-11 w-11 min-h-[44px] min-w-[44px]",
                  "md:h-10 md:w-10 md:min-h-0 md:min-w-0"
                )}
              >
                <UserPlus className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                      // Mobile: Larger touch targets
                      "h-11 w-11 min-h-[44px] min-w-[44px]",
                      "md:h-10 md:w-10 md:min-h-0 md:min-w-0"
                    )}
                  >
                    <Filter className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setConversationTab("all")}>
                    All ({totalCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConversationTab("owners")}>
                    <User className="h-4 w-4 mr-2" />
                    Owners ({ownerCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConversationTab("guests")}>
                    <Users className="h-4 w-4 mr-2" />
                    Guests ({guestCount})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Show phone selector if:
                  1. User is SuperAdmin (full access), OR
                  2. User has multiple phone numbers available, OR
                  3. User has multiple locations assigned (similar to SuperAdmin)
              */}
              {(() => {
                // Filter out internal phone numbers (like "You") and testing numbers from selection
                const realPhoneConfigs = allowedPhoneConfigs.filter(
                  (config: any) => !config.isInternal
                );
                
                // Check if user has multiple locations assigned
                const normalizedUserAreas = userAreas
                  ? (Array.isArray(userAreas) ? userAreas : [userAreas])
                      .map((a: string) => a.toLowerCase().trim())
                      .filter(Boolean)
                  : [];
                const hasMultipleLocations = normalizedUserAreas.length > 1;
                const isSuperAdmin = userRole === "SuperAdmin";
                
                // Show filter if: SuperAdmin, multiple phones, or multiple locations
                const shouldShowFilter = isSuperAdmin || realPhoneConfigs.length > 1 || hasMultipleLocations;
                
                return shouldShowFilter && realPhoneConfigs.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                          // Mobile: Larger touch targets
                          "h-11 w-11 min-h-[44px] min-w-[44px]",
                          "md:h-10 md:w-10 md:min-h-0 md:min-w-0"
                        )}
                      >
                        <Phone className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {realPhoneConfigs.map((config: any) => (
                        <DropdownMenuItem
                          key={config.phoneNumberId}
                          onClick={() => onPhoneConfigChange(config)}
                          className={cn(
                            selectedPhoneConfig?.phoneNumberId === config.phoneNumberId && "bg-accent"
                          )}
                        >
                          {/* Display format: "Display Name (+phone) [Location]" */}
                          {formatPhoneDisplayWithLocation(config)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* Search / New Chat Input - Responsive */}
      <div className="px-3 py-2 bg-white dark:bg-[#111b21]">
        {showNewChat ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative w-20">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0] text-sm">+</span>
                <Input
                  placeholder="91"
                  value={newCountryCode}
                  onChange={(e) => onCountryCodeChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className={cn(
                    "pl-6 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0]",
                    // Mobile: Taller inputs for touch
                    "h-11",
                    "md:h-9"
                  )}
                  maxLength={4}
                />
              </div>
              <Input
                placeholder="Phone number"
                value={newPhoneNumber}
                onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, ""))}
                className={cn(
                  "flex-1 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0]",
                  // Mobile: Taller inputs for touch
                  "h-11",
                  "md:h-9"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onStartConversation();
                }}
              />
              <Button
                onClick={onStartConversation}
                disabled={loading || !newCountryCode.trim() || !newPhoneNumber.trim()}
                className={cn(
                  "bg-[#25d366] hover:bg-[#1da851] text-white",
                  // Mobile: Larger button
                  "h-11 px-4",
                  "md:h-9 md:px-3"
                )}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start"}
              </Button>
            </div>
            {onAddGuest && (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-[#008069] dark:text-[#00a884] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]",
                  // Mobile: Taller button for touch
                  "h-12 text-[15px]",
                  "md:h-10 md:text-[14px]"
                )}
                onClick={() => {
                  onAddGuest();
                  setShowNewChat(false);
                }}
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Add new owner with details
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#54656f] dark:text-[#8696a0]" />
            <Input
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                onSearchQueryChange(value);
                // Trigger unified search
                if (value.trim()) {
                  executeSearch(value);
                } else {
                  clearSearch();
                }
              }}
              className={cn(
                "pl-10 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0",
                // Mobile: Taller search input
                "h-11 text-[15px]",
                "md:h-[35px] md:text-[14px]"
              )}
            />
            {searchQuery && !searchLoading && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#25d366]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter tabs indicator */}
      {conversationTab !== "all" && (
        <div className="px-3 py-1.5 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between">
          <span className="text-xs text-[#54656f] dark:text-[#8696a0]">
            Showing: {conversationTab === "owners" ? "Owners" : "Guests"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConversationTab("all")}
            className="h-6 text-xs text-[#008069] dark:text-[#00a884] hover:bg-transparent"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Conversation List or Search Results */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-[#c5c6c8] dark:scrollbar-thumb-[#374045]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isSearchMode ? (
          <UnifiedSearchResults
            results={unifiedSearchResults}
            query={searchQuery}
            loading={searchLoading}
            onSelectConversation={async (conversationId) => {
              // Clear search first to show all chats
              handleClearSearch();
              
              // Try to find conversation in local array first
              let conv = conversations.find(c => c._id === conversationId);
              
              // If not found locally, construct from search results
              if (!conv && unifiedSearchResults) {
                const searchResult = unifiedSearchResults.conversations.find(
                  c => c.conversationId === conversationId
                );
                
                if (searchResult) {
                  // Map search result to Conversation type
                  conv = {
                    _id: searchResult.conversationId,
                    participantPhone: searchResult.participantPhone,
                    participantName: searchResult.participantName,
                    participantProfilePic: searchResult.participantProfilePic,
                    lastMessageContent: searchResult.lastMessageContent,
                    lastMessageTime: searchResult.lastMessageTime,
                    unreadCount: searchResult.unreadCount,
                    conversationType: searchResult.conversationType,
                    status: searchResult.status || 'active',
                  };
                }
              }
              
              // If still not found, fetch from API as last resort
              if (!conv) {
                try {
                  const response = await fetch(`/api/whatsapp/conversations/${conversationId}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.conversation) {
                      conv = data.conversation;
                    }
                  }
                } catch (error) {
                  console.error('Failed to fetch conversation:', error);
                }
              }
              
              if (conv) {
                onSelectConversation(conv);
              } else {
                console.error('Conversation not found:', conversationId);
              }
            }}
            onStartNewChat={(phone) => {
              // Clear search first
              handleClearSearch();
              // Set phone number and switch to new chat mode
              const normalized = phone.replace(/\D/g, "");
              if (normalized.length > 10) {
                // Has country code
                const countryCode = normalized.slice(0, -10);
                const phoneNumber = normalized.slice(-10);
                onCountryCodeChange(countryCode);
                onPhoneNumberChange(phoneNumber);
              } else {
                onCountryCodeChange("91"); // Default to India
                onPhoneNumberChange(normalized);
              }
              setShowNewChat(true);
            }}
            onJumpToMessage={async (conversationId, messageId) => {
              // Don't clear search yet - we need it for highlighting
              
              // Ensure conversation is available
              let conv = conversations.find(c => c._id === conversationId);
              
              if (!conv && unifiedSearchResults) {
                const searchResult = unifiedSearchResults.conversations.find(
                  c => c.conversationId === conversationId
                );
                
                if (searchResult) {
                  // Map search result to Conversation type
                  conv = {
                    _id: searchResult.conversationId,
                    participantPhone: searchResult.participantPhone,
                    participantName: searchResult.participantName,
                    participantProfilePic: searchResult.participantProfilePic,
                    lastMessageContent: searchResult.lastMessageContent,
                    lastMessageTime: searchResult.lastMessageTime,
                    unreadCount: searchResult.unreadCount,
                    conversationType: searchResult.conversationType,
                    status: searchResult.status || 'active',
                  };
                  
                  // Select conversation first
                  onSelectConversation(conv);
                }
              }
              
              // Call the parent handler to scroll to message
              if (onJumpToMessage) {
                onJumpToMessage(conversationId, messageId);
              }
              
              // Clear search after a delay to allow scroll to complete
              setTimeout(() => {
                handleClearSearch();
              }, 500);
            }}
          />
        ) : loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#25d366]" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-[#8696a0]" />
            </div>
            <p className="text-[#111b21] dark:text-[#e9edef] font-medium mb-1">No chats found</p>
            <p className="text-sm text-[#667781] dark:text-[#8696a0]">
              {searchQuery ? "Try a different search" : "Start a new conversation"}
            </p>
          </div>
        ) : (
          <>
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
                isSelected={selectedConversation?._id === conversation._id}
                onClick={() => onSelectConversation(conversation)}
                isMounted={isMounted}
                onArchive={showingArchived ? undefined : onArchiveConversation}
                onUnarchive={showingArchived ? onUnarchiveConversation : undefined}
                isArchived={showingArchived || conversation.isArchivedByUser}
              />
            ))}
            
            {/* Load More */}
            {hasMoreConversations && (
              <div className="flex justify-center py-3">
                {loadingMoreConversations ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#25d366]" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMoreConversations}
                    className="text-[#008069] dark:text-[#00a884] hover:bg-transparent"
                  >
                    Load more chats
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Archive Section - WhatsApp Style (at bottom) - Responsive */}
      {onToggleArchiveView && (
        <div
          className={cn(
            "flex items-center gap-3 cursor-pointer transition-colors border-t border-[#e9edef] dark:border-[#222d34]",
            "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]",
            "active:bg-[#e9edef] dark:active:bg-[#1d282f]",
            showingArchived && "bg-[#d9fdd3] dark:bg-[#005c4b]",
            // Mobile: Larger touch target, safe area padding at bottom
            "px-4 py-4 min-h-[64px] pb-[max(16px,env(safe-area-inset-bottom))]",
            // Desktop: Standard sizing
            "md:py-3 md:min-h-0 md:pb-3"
          )}
          onClick={onToggleArchiveView}
        >
          <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
            {showingArchived ? (
              <ArrowLeft className="h-5 w-5 text-white" />
            ) : (
              <Archive className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex-1">
            <span className="text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">
              {showingArchived ? "Back to all chats" : "Archived"}
            </span>
          </div>
          {!showingArchived && archivedCount > 0 && (
            <span className="bg-[#25d366] text-white text-[11px] font-medium min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1.5">
              {archivedCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
