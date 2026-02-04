"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LuMessageSquareText } from "react-icons/lu";
import { RiInboxArchiveLine } from "react-icons/ri";
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
  SquarePlus,
  ChevronDown,
  MessageSquarePlus,
  CircleDot,
  Building2,
  Megaphone,
  Images,
  MessageCircle,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { formatTime } from "../utils";
import { formatPhoneDisplayWithLocation } from "@/lib/whatsapp/config";
import { Badge } from "@/components/ui/badge";
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
import { MediaPopup } from "./MediaPopup";

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
  /** Number of archived chats with unread messages; shown next to "Archived" */
  archivedUnreadCount?: number;
  showingArchived?: boolean;
  onToggleArchiveView?: () => void;
  onArchiveConversation?: (conversationId: string) => void;
  onUnarchiveConversation?: (conversationId: string) => void;
  // User info for access control
  userRole?: string;
  userAreas?: string | string[];
  // User profile for nav strip
  userName?: string;
  userProfilePic?: string;
  // Mobile responsiveness
  isMobile?: boolean;
  // Jump to message from search results
  onJumpToMessage?: (conversationId: string, messageId: string) => void;
}

/** Theme toggle button for the nav strip: toggles between light and dark mode */
function ThemeToggleButton() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");
  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {mounted && isDark ? (
              <Sun className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
            ) : (
              <Moon className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {mounted && isDark ? "Light mode" : "Dark mode"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ConversationItem({
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
    if (conversation.isInternal || conversation.source === "internal") {
      return "You";
    }
    
    const savedName = conversation.participantName;
    const whatsappName =
      (conversation as any).whatsappName ||
      (conversation as any).waName ||
      (conversation as any).waDisplayName;

    if (savedName && whatsappName && whatsappName !== savedName) {
      return `${savedName} (${whatsappName})`;
    }
    if (savedName) return savedName;
    if (whatsappName) return whatsappName;
    return null;
  })();

  const phone = conversation.participantPhone;
  const role = conversation.participantRole || conversation.conversationType;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 cursor-pointer transition-colors group",
        "mx-2 mb-0.5 rounded-xl px-3 py-3 min-h-[72px] md:py-2.5 md:min-h-[56px]",
        // Rounded light grey highlight only when active or hover
        "hover:bg-[#f0f0f0] dark:hover:bg-[#2a3942]",
        "active:bg-[#e9edef] dark:active:bg-[#1d282f]",
        isSelected && "bg-[#f0f0f0] dark:bg-[#2a3942]"
      )}
      onClick={onClick}
    >
      {/* Avatar - WhatsApp style circular */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 md:h-12 md:w-12 rounded-full">
          <AvatarImage src={conversation.participantProfilePic} />
          <AvatarFallback className={cn(
            "text-sm font-medium rounded-full",
            conversation.isInternal || conversation.source === "internal"
              ? "bg-[#25d366] text-white"
              : "bg-[#e0e0e0] dark:bg-[#6b7b85] text-[#54656f] dark:text-white"
          )}>
            {conversation.isInternal || conversation.source === "internal"
              ? "You"
              : (displayName || phone)?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        {(conversation.isOnline || hasUnread) && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-[#25d366] rounded-full border-2 border-white dark:border-[#111b21]" />
        )}
      </div>

      {/* Content - bringing together both notification style and streamlined user info layout */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-hidden py-1 pl-2">
        <div className="flex items-center justify-between gap-2 min-h-5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {role && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium uppercase tracking-wide",
                role === "owner"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              )}>
                {role === "owner" ? "O" : "G"}
              </span>
            )}
            <span
              className={cn(
                "text-[16px] truncate flex-1 min-w-0",
                hasUnread ? "font-semibold text-[#111b21] dark:text-[#e9edef]" : "font-medium text-[#111b21] dark:text-[#e9edef]"
              )}
            >
              {displayName || phone}
            </span>
            {/* {hasUnread && (
              <Badge className="flex-shrink-0 bg-blue-500 text-white text-[11px] font-medium min-w-[18px] h-[18px] rounded-full px-1">
                {conversation.unreadCount}
              </Badge>
            )} */}
            {displayName && phone && !hasUnread && (
              <span className="text-[12px] text-[#667781] dark:text-[#8696a0] flex-shrink-0">
                {phone.replace(/^\+?91/, "")}
              </span>
            )}
          </div>
          {/* Message meta: time and unread badge, right aligned */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[12px] text-[#667781] dark:text-[#8696a0] whitespace-nowrap">
              {isMounted ? formatTime(conversation.lastMessageTime) : ""}
            </span>
            {hasUnread && (
              <span className="bg-[#25d366] text-white text-[11px] font-medium min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1.5 flex-shrink-0">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
        {/* Message preview row: last message content, status icon, etc. */}
        <div className="flex items-center gap-1.5 min-w-0 pr-0">
          {conversation.lastMessageDirection === "outgoing" && (
            <span className="flex-shrink-0 mt-0.5">{getStatusIcon(conversation.lastMessageStatus)}</span>
          )}
          <span
            className={cn(
              "text-[14px] truncate min-w-0",
              hasUnread ? "text-[#111b21] dark:text-[#d1d7db] font-medium" : "text-[#667781] dark:text-[#8696a0]"
            )}
          >
            {conversation.lastMessageContent || conversation.participantPhone || " "}
          </span>
        </div>
      </div>

      {/* Chevron: only on hover, absolute so it doesn't take layout space or create gap */}
      {(onArchive || onUnarchive) && (
        <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-[#e9edef] dark:hover:bg-[#374045] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronDown className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
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
        </div>
      )}
    </div>
  );
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
  conversationCounts,
  hasMoreConversations,
  loadingMoreConversations,
  onLoadMoreConversations,
  onAddGuest,
  // Archive props
  archivedCount = 0,
  archivedUnreadCount = 0,
  showingArchived = false,
  onToggleArchiveView,
  onArchiveConversation,
  onUnarchiveConversation,
  // User info for access control
  userRole,
  userAreas,
  // User profile
  userName,
  userProfilePic,
  // Mobile responsiveness
  isMobile = false,
  // Jump to message
  onJumpToMessage,
}: SidebarProps) {
  const [conversationTab, setConversationTab] = useState<"all" | "owners" | "guests">("all");
  const [filterPill, setFilterPill] = useState<"all" | "unread">("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
   const [showMediaPopup, setShowMediaPopup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  const {
    results: unifiedSearchResults,
    loading: searchLoading,
    search: executeSearch,
    clearSearch,
  } = useUnifiedWhatsAppSearch({
    debounceMs: 300,
    includeArchived: showingArchived,
    limit: 50,
    phoneId: selectedPhoneConfig?.phoneNumberId && !selectedPhoneConfig.isInternal ? selectedPhoneConfig.phoneNumberId : undefined,
  });

  const isSearchMode = searchQuery.trim().length > 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClearSearch = useCallback(() => {
    onSearchQueryChange("");
    clearSearch();
  }, [onSearchQueryChange, clearSearch]);

  const handleJumpToMessage = useCallback(async (conversationId: string, messageId: string) => {
    let conv = conversations.find(c => c._id === conversationId);
    if (!conv && unifiedSearchResults) {
      const r = unifiedSearchResults.conversations.find(c => c.conversationId === conversationId);
      if (r) {
        conv = {
          _id: r.conversationId,
          participantPhone: r.participantPhone,
          participantName: r.participantName,
          participantProfilePic: r.participantProfilePic,
          lastMessageContent: r.lastMessageContent,
          lastMessageTime: r.lastMessageTime,
          unreadCount: r.unreadCount || 0,
          conversationType: r.conversationType,
          status: r.status || 'active',
        } as any;
      }
    }
    if (conv) {
      onSelectConversation(conv);
      if (onJumpToMessage) {
        onJumpToMessage(conversationId, messageId);
      }
    }
  }, [conversations, unifiedSearchResults, onSelectConversation, onJumpToMessage]);

  // Only filter by conversation type (tab) and unread client-side
  const filteredConversations = conversations.filter((conv) => {
    if (conversationTab === "owners" && conv.conversationType !== "owner") return false;
    if (conversationTab === "guests" && conv.conversationType !== "guest") return false;
    if (filterPill === "unread") {
      const hasUnread = (conv.unreadCount || 0) > 0 && conv.lastMessageDirection === "incoming";
      if (!hasUnread) return false;
    }
    return true;
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

  const realPhoneConfigs = allowedPhoneConfigs.filter((c: any) => !c.isInternal);
  const showPhoneMenu = (userRole === "SuperAdmin" || realPhoneConfigs.length > 1 ||
    (userAreas ? (Array.isArray(userAreas) ? userAreas : [userAreas]).map((a: string) => String(a).toLowerCase().trim()).filter(Boolean).length > 1 : false)) &&
    realPhoneConfigs.length > 0;

  // Calculate unread count for notification badge
  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + ((conv.unreadCount || 0) > 0 && conv.lastMessageDirection === "incoming" ? 1 : 0),
    0
  );

  return (
    <div className={cn(
      "flex h-full bg-white dark:bg-[#111b21] min-h-0 min-w-0 w-full overflow-hidden",
      "md:border-r md:border-[#e9edef] md:dark:border-[#222d34]"
    )}>
      {/* Vertical Navigation Strip - Hidden on mobile, visible on desktop */}
      <div className={cn(
        "hidden md:flex flex-col items-center bg-[#f7f5f3] dark:bg-[#202c33] border-r border-[#e9edef] dark:border-[#222d34]",
        "w-[70px] flex-shrink-0 py-2 gap-1"
      )}>
        {/* Chats Icon - Active, with unread count badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="relative w-12 h-12 rounded-full bg-[#e9edef] dark:bg-[#2a3942] flex items-center justify-center hover:bg-[#d1d7db] dark:hover:bg-[#374045] transition-colors">
                <LuMessageSquareText className="h-6 w-6 text-[#111b21] dark:text-[#e9edef]" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 flex items-center justify-center bg-[#25d366] text-white text-[11px] font-semibold rounded-full border-2 border-white dark:border-[#202c33] leading-none">
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Chats{totalUnreadCount > 0 ? ` (${totalUnreadCount} unread)` : ""}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Status Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="relative w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors">
                <CircleDot className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-[#25d366] rounded-full border border-white dark:border-[#202c33]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Status</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Communities Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors">
                <Users className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Communities</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Groups Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors">
                <Users className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Groups</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Separator */}
        <div className="h-px w-8 bg-[#d1d7db] dark:bg-[#374045] my-1" />

        {/* Business Tools Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors">
                <Building2 className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Business Tools</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Broadcast Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors">
                <Megaphone className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Broadcast</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Spacer to push bottom items down */}
        <div className="flex-1" />

        {/* Media Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowMediaPopup(true)}
                className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors"
              >
                <Images className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Media</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggleButton />

        {/* User Profile Picture */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-12 h-12 rounded-full overflow-hidden hover:opacity-90 transition-opacity mt-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={userProfilePic} />
                  <AvatarFallback className="bg-[#25d366] text-white text-sm font-medium">
                    {userName ? userName.slice(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{userName || "Profile"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Sidebar Content - min-w-0 so it shrinks and doesn't overflow */}
      <div className={cn(
        "flex flex-col h-full min-w-0 flex-1 overflow-hidden bg-white dark:bg-[#111b21]"
      )}>
      {/* Header - WhatsApp style: white, "WhatsApp" title, new chat + menu */}
      <div className={cn(
        "flex items-center justify-between bg-white dark:bg-[#111b21] flex-shrink-0 min-w-0",
        "h-[60px] px-3 pt-[env(safe-area-inset-top,0px)] md:pt-0 md:px-3",
        "border-b border-[#f0f2f5] dark:border-[#222d34]"
      )}>
        {showNewChat ? (
          <>
            <Button variant="ghost" size="icon" onClick={() => setShowNewChat(false)} className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-[17px] font-medium text-[#111b21] dark:text-[#e9edef]">New chat</span>
            <div className="w-10" />
          </>
        ) : (
          <>
            <span className="text-[18px] font-bold text-[#111b21] dark:text-[#e9edef] truncate min-w-0">WhatsApp</span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {isMounted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="p-2 rounded-full hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] inline-flex">
                        {isConnected ? <Wifi className="h-5 w-5 text-[#25d366]" /> : <WifiOff className="h-5 w-5 text-red-500" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{isConnected ? "Connected" : "Disconnected"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowNewChat(true)} className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] rounded-full h-9 w-9">
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] rounded-full h-9 w-9">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => setConversationTab("all")}>All ({totalCount})</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConversationTab("owners")}><User className="h-4 w-4 mr-2" />Owners ({ownerCount})</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConversationTab("guests")}><Users className="h-4 w-4 mr-2" />Guests ({guestCount})</DropdownMenuItem>
                  {/* {showPhoneMenu && (
                    <>
                      <div className="h-px bg-[#e9edef] dark:bg-[#222d34] my-1" />
                      {realPhoneConfigs.map((config: any) => (
                        <DropdownMenuItem key={config.phoneNumberId} onClick={() => onPhoneConfigChange(config)} className={cn(selectedPhoneConfig?.phoneNumberId === config.phoneNumberId && "bg-accent")}>
                          <Phone className="h-4 w-4 mr-2" />
                          {formatPhoneDisplayWithLocation(config)}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )} */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      {/* Search - pill shaped, WhatsApp-style highlighted area when active */}
      <div
        className={cn(
          "px-3 py-2 flex-shrink-0 min-w-0 overflow-hidden transition-colors duration-200 rounded-t-lg",
          (searchFocused || (searchQuery && searchQuery.trim().length > 0))
            ? "bg-[#e9edef] dark:bg-[#2a3942]"
            : "bg-white dark:bg-[#111b21]"
        )}
      >
        {showNewChat ? (
          <div className="space-y-3 min-w-0">
            <div className="flex gap-2 min-w-0">
              <div className="relative w-20 flex-shrink-0">
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
                  "flex-1 min-w-0 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0]",
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
                  "bg-[#25d366] hover:bg-[#1da851] text-white flex-shrink-0",
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
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#54656f] dark:text-[#8696a0]" />
            <Input
              placeholder="Search by name, phone or message"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(e) => {
                const value = e.target.value;
                onSearchQueryChange(value);
                if (value.trim()) {
                  executeSearch(value);
                } else {
                  clearSearch();
                }
              }}
              className={cn(
                "w-full min-w-0 pl-10 pr-10 border-0 rounded-[22px] text-[15px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0 h-10 transition-colors",
                (searchFocused || searchQuery?.trim())
                  ? "bg-white dark:bg-[#111b21] shadow-sm"
                  : "bg-[#f0f2f5] dark:bg-[#202c33]",
                "md:h-9 md:text-[14px]"
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

      {/* Filter pills - All | Unread | Favourites | Groups | Labels (WhatsApp style) */}
      {!showNewChat && (
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto overflow-y-hidden min-w-0 bg-white dark:bg-[#111b21] flex-shrink-0 scrollbar-none">
          <button
            onClick={() => { setFilterPill("all"); setConversationTab("all"); }}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-[14px] font-medium transition-colors",
              filterPill === "all" && conversationTab === "all"
                ? "bg-[#e9edef] dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef]"
                : "bg-transparent text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterPill("unread")}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-[14px] font-medium transition-colors",
              filterPill === "unread"
                ? "bg-[#e9edef] dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef]"
                : "bg-transparent text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]"
            )}
          >
            Unread
          </button>
          <button className="shrink-0 px-4 py-2 rounded-full text-[14px] font-medium text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors">
            Favourites
          </button>
         
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 shrink-0 px-4 py-2 rounded-full text-[14px] font-medium transition-colors",
                  conversationTab !== "all"
                    ? "bg-[#e9edef] dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef]"
                    : "bg-transparent text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]"
                )}
              >
                Labels
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => { setConversationTab("all"); setFilterPill("all"); }}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setConversationTab("owners"); setFilterPill("all"); }}><User className="h-4 w-4 mr-2" />Owners</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setConversationTab("guests"); setFilterPill("all"); }}><Users className="h-4 w-4 mr-2" />Guests</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Conversation List or Search Results */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#c5c6c8] dark:scrollbar-thumb-[#374045]"
        style={{ WebkitOverflowScrolling: "touch" }}
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
            onJumpToMessage={handleJumpToMessage}
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
            {/* Archived - reference style: box-with-arrow icon, "Archived" label, unread count only */}
            {onToggleArchiveView && !showingArchived && (
              <div
                onClick={onToggleArchiveView}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-white dark:bg-[#111b21]",
                  "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] active:bg-[#e9edef] dark:active:bg-[#1d282f]",
                  "border-b border-[#f0f2f5] dark:border-[#222d34]"
                )}
              >
                <RiInboxArchiveLine className="h-10 w-5 flex-shrink-0 text-[#54656f] dark:text-[#8696a0]" strokeWidth={0.3} />
                <span className="flex-1 text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">Archived</span>
                {archivedUnreadCount > 0 && (
                  <span className="text-[14px] text-[#667781] dark:text-[#8696a0] tabular-nums">{archivedUnreadCount}</span>
                )}
              </div>
            )}
            {onToggleArchiveView && showingArchived && (
              <div
                onClick={onToggleArchiveView}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-[#f0f2f5] dark:bg-[#202c33]",
                  "hover:bg-[#e9edef] dark:hover:bg-[#2a3942] border-b border-[#e9edef] dark:border-[#222d34]"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center flex-shrink-0">
                  <ArrowLeft className="h-5 w-5 text-white" />
                </div>
                <span className="flex-1 text-[16px] font-medium text-[#111b21] dark:text-[#e9edef]">Back to all chats</span>
              </div>
            )}
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={`${conversation._id}-${conversation.lastMessageTime}-${conversation.unreadCount}`}
                conversation={conversation}
                isSelected={selectedConversation?._id === conversation._id}
                onClick={() => onSelectConversation(conversation)}
                isMounted={isMounted}
                onArchive={showingArchived ? undefined : onArchiveConversation}
                onUnarchive={showingArchived ? onUnarchiveConversation : undefined}
                isArchived={showingArchived || conversation.isArchivedByUser}
                isMobile={isMobile}
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
      </div>

      {/* Media Popup */}
      <MediaPopup
        open={showMediaPopup}
        onClose={() => setShowMediaPopup(false)}
        conversation={selectedConversation}
        phoneId={selectedPhoneConfig?.phoneNumberId && !selectedPhoneConfig.isInternal ? selectedPhoneConfig.phoneNumberId : undefined}
      />
    </div>
  );
}
