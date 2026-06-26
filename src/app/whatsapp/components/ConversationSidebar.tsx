"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  User,
  Users,
  UserPlus,
  ArrowLeft,
  MoreVertical,
  Filter,
  Archive,
  MessageSquare,
  X,
  SquarePlus,
  MessageSquarePlus,
  Images,
  MessageCircle,
  Sun,
  Moon,
  Shield,
  MapPin,
  MapPinOff,
  Timer,
  Plus,
} from "lucide-react";
import axios from "@/util/axios";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
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
import { WhatsAppConversationTypeMigrationButton } from "@/components/dashboard/WhatsAppConversationTypeMigrationButton";
// WhatsAppPhoneLocationsManager hidden — location-to-phone mapping now managed via /dashboard/whatsapp/channels
import { WhatsAppPhoneMaskForm } from "./WhatsAppPhoneMaskForm";
import {
  canAccessWhatsAppAdminQueue,
  canUseInboxLocationFilter,
} from "@/lib/whatsapp/participantLocationPrivileges";
import { type WhatsAppPhoneMaskRules } from "@/lib/whatsapp/phoneMask";
import { SetParticipantLocationDialog } from "./SetParticipantLocationDialog";
import { InitiationLimitBadge } from "./InitiationLimitBadge";
import { ConversationItem } from "./ConversationItem";
import { SIDEBAR_LABEL_FILTERS } from "@/lib/whatsapp/crmLabels";

function inboxFilterPillClass(active: boolean): string {
  return cn(
    "rounded-full font-semibold transition-colors whitespace-nowrap min-w-0 flex-1 basis-0",
    "px-1.5 py-1.5 text-[10px] leading-none sm:px-2 sm:text-[11px]",
    "truncate text-center",
    active
      ? "bg-[#d8f5e0] text-[#007a5a] border border-transparent dark:bg-[#1a3d2f] dark:text-[#8fd4a8]"
      : "bg-transparent text-[#667781] border border-[#c8d1d8] hover:bg-[#f0f2f5] dark:text-[#aebac1] dark:border-[#3d4f5c] dark:hover:bg-[#202c33]/60",
  );
}

function inboxFilterIconButtonClass(active = false): string {
  return cn(
    "shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-colors",
    active
      ? "bg-[#d8f5e0] text-[#007a5a] border border-transparent dark:bg-[#1a3d2f] dark:text-[#8fd4a8]"
      : "bg-transparent text-[#667781] border border-[#c8d1d8] hover:bg-[#f0f2f5] dark:text-[#aebac1] dark:border-[#3d4f5c] dark:hover:bg-[#202c33]/60",
  );
}

interface SidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  loading: boolean;
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
    unreadCount?: number;
  };
  /** Server-derived unread chat count (tab badge) */
  totalUnreadCount?: number;
  hasMoreConversations?: boolean;
  loadingMoreConversations?: boolean;
  onLoadMoreConversations?: () => void;
  onAddOwner?: () => void;
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
  userEmail?: string;
  userAreas?: string | string[];
  // User profile for nav strip
  userName?: string;
  userProfilePic?: string;
  // Mobile responsiveness
  isMobile?: boolean;
  // Jump to message from search results
  onJumpToMessage?: (conversationId: string, messageId: string) => void;
  // Update conversation locally after meta changes (e.g. profile pic, name)
  onUpdateConversation?: (conversationId: string, patch: Partial<Conversation>) => void;
  onConversationTypeChange?: (
    conversationId: string,
    conversationType: "owner" | "guest",
  ) => void | Promise<void>;
  /** Refetch conversation list after SuperAdmin bulk migration */
  onRefreshConversations?: () => void;
  /** Per-employee rules: mask owner/guest phones in the UI */
  phoneMaskRules?: WhatsAppPhoneMaskRules;
  /** HR/SuperAdmin can open the phone visibility form */
  canManagePhoneMask?: boolean;
  /** Admin Queue: when true the sidebar shows conversations without a location key */
  adminQueue?: boolean;
  onAdminQueueChange?: (value: boolean) => void;
  /** SuperAdmin: filter inbox by participant city */
  adminLocationFilter?: string;
  adminLocationOptions?: string[];
  onAdminLocationFilterChange?: (value: string) => void;
  /** Parent sets this after Add Owner/Guest so tab filter does not hide the new chat */
  sidebarTabHint?: "all" | "owners" | "guests" | null;
  onSidebarTabHintConsumed?: () => void;
  /** CRM label filter — server-side via labelFilter query param */
  labelFilter?: string;
  onLabelFilterChange?: (value: string) => void;
  initiationLimitRefreshKey?: number;
  /** When true, sales users cannot start new guest conversations */
  guestInitiationAtLimit?: boolean;
  onOpenDisposition?: () => void;
  onOpenSetVisit?: () => void;
  onOpenReminder?: () => void;
  onCrmActionForConversation?: (conversation: Conversation) => void;
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
  const themeToggleLabel = mounted
    ? isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle theme";
  const themeTooltip = mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors"
            aria-label={themeToggleLabel}
          >
            {mounted && isDark ? (
              <Sun className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
            ) : (
              <Moon className="h-6 w-6 text-[#54656f] dark:text-[#8696a0]" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" suppressHydrationWarning>
          {themeTooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  selectedConversation,
  searchQuery,
  onSearchQueryChange,
  loading,
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
  onAddOwner,
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
  userEmail,
  userAreas,
  // User profile
  userName,
  userProfilePic,
  // Mobile responsiveness
  isMobile = false,
  // Jump to message
  onUpdateConversation,
  onConversationTypeChange,
  onJumpToMessage,
  onRefreshConversations,
  phoneMaskRules,
  canManagePhoneMask = false,
  adminQueue = false,
  onAdminQueueChange,
  adminLocationFilter = "all",
  adminLocationOptions = [],
  onAdminLocationFilterChange,
  sidebarTabHint = null,
  onSidebarTabHintConsumed,
  labelFilter = "all",
  onLabelFilterChange,
  totalUnreadCount: totalUnreadCountProp = 0,
  initiationLimitRefreshKey = 0,
  guestInitiationAtLimit = false,
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
  onCrmActionForConversation,
}: SidebarProps) {
  const [showPhoneMaskForm, setShowPhoneMaskForm] = useState(false);
  const [conversationTab, setConversationTab] = useState<"all" | "owners" | "guests">("all");
  const isUnreadFilter = labelFilter === "unread";
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
   const [showMediaPopup, setShowMediaPopup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [locationDialogConversation, setLocationDialogConversation] =
    useState<Conversation | null>(null);
  const [labelsMenuOpen, setLabelsMenuOpen] = useState(false);

  const isAllFilterActive =
    !isUnreadFilter && conversationTab === "all" && labelFilter === "all";
  const isLabelsFilterActive =
    conversationTab !== "all" ||
    (labelFilter !== "all" && labelFilter !== "unread");

  const inboxPrivilegeUser = {
    role: userRole,
    email: userEmail,
    allotedArea: userAreas,
  };
  const showInboxLocationFilter =
    userRole === "SuperAdmin" || canUseInboxLocationFilter(inboxPrivilegeUser);
  const showAdminQueueMenu =
    userRole === "SuperAdmin" ||
    userRole === "Admin" ||
    userRole === "Developer" ||
    canAccessWhatsAppAdminQueue(inboxPrivilegeUser);

  const {
    results: unifiedSearchResults,
    loading: searchLoading,
    search: executeSearch,
    clearSearch,
  } = useUnifiedWhatsAppSearch({
    debounceMs: 300,
    includeArchived: showingArchived,
    limit: 50,
    locationFilter:
      showInboxLocationFilter &&
      adminLocationFilter !== "all" &&
      !adminQueue
        ? adminLocationFilter
        : undefined,
  });

  const isSearchMode = searchQuery.trim().length > 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!sidebarTabHint) return;
    setConversationTab(sidebarTabHint);
    onSidebarTabHintConsumed?.();
  }, [sidebarTabHint, onSidebarTabHintConsumed]);

  // File upload ref & target for per-conversation uploads
  const perItemFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetIdRef = useRef<string | null>(null);

  const handleProfilePicSelectedFor = async (e: any) => {
    try {
      const file = e.target.files?.[0];
      const conversationId = uploadTargetIdRef.current;
      if (!file || !conversationId) return;
      const form = new FormData();
      form.append("file", file);
      const uploadResp = await axios.post("/api/whatsapp/upload-to-bunny", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = uploadResp?.data?.url;
      if (!url) throw new Error("Upload failed");
      // Optimistically update UI and set type to owner by default
      if (typeof onUpdateConversation === "function") {
        onUpdateConversation(conversationId, {
          participantProfilePic: url,
          conversationType: "owner",
        } as Partial<Conversation>);
      }
      await axios.post(`/api/whatsapp/conversations/${conversationId}/meta`, {
        participantProfilePic: url,
        conversationType: "owner",
      });
      // clear target
      uploadTargetIdRef.current = null;
    } catch (err) {
      console.error("Profile pic upload failed:", err);
      alert("Failed to upload profile picture");
    } finally {
      if (perItemFileInputRef.current) perItemFileInputRef.current.value = "";
    }
  };

  const triggerUploadFor = (conversationId: string) => {
    uploadTargetIdRef.current = conversationId;
    if (perItemFileInputRef.current) perItemFileInputRef.current.click();
  };

  const handleRenameFor = async (conversationId: string, currentName?: string) => {
    try {
      const newName = window.prompt("Enter new display name", currentName || "");
      if (!newName) return;
      await axios.post(`/api/whatsapp/conversations/${conversationId}/meta`, {
        participantName: newName,
      });
      if (typeof onUpdateConversation === "function") {
        onUpdateConversation(conversationId, { participantName: newName } as Partial<Conversation>);
      }
    } catch (err) {
      console.error("Rename failed:", err);
      alert("Failed to rename conversation");
    }
  };

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

  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      onSelectConversation(conversation);
    },
    [onSelectConversation],
  );

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conv) => {
        if (conversationTab === "owners" && conv.conversationType !== "owner") {
          return false;
        }
        if (conversationTab === "guests" && conv.conversationType !== "guest") {
          return false;
        }
        return true;
      }),
    [conversations, conversationTab],
  );

  // Counts — always use server-provided meta (stable 0 on SSR) to avoid hydration text mismatch.
  const ownerCount = conversationCounts?.ownerCount ?? 0;
  const guestCount = conversationCounts?.guestCount ?? 0;
  const totalCount = conversationCounts?.totalCount ?? 0;

  // Virtualizer for conversation list
  const conversationVirtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 10,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

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

  const totalUnreadCount =
    totalUnreadCountProp ||
    conversationCounts?.unreadCount ||
    0;
  const displayUnreadCount = isMounted ? totalUnreadCount : 0;

  return (
    <div
      className={cn(
        "flex h-full bg-white dark:bg-[#06090a] min-h-0 min-w-0 w-full overflow-hidden",
        "md:border-r md:border-[#e9edef] md:dark:border-[#222d34]",
      )}
    >
      {/* Vertical Navigation Strip - Hidden on mobile, visible on desktop */}
      <div
        className={cn(
          "hidden md:flex flex-col items-center bg-[#f7f5f3] dark:bg-[#202c33] border-r border-[#e9edef] dark:border-[#222d34]",
          "w-[70px] flex-shrink-0 py-2 gap-1",
        )}
      >
        {/* Chats Icon - Active, with unread count badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="relative w-12 h-12 rounded-full bg-[#e9edef] dark:bg-[#2a3942] flex items-center justify-center hover:bg-[#d1d7db] dark:hover:bg-[#374045] transition-colors">
                <LuMessageSquareText className="h-6 w-6 text-[#111b21] dark:text-[#e9edef]" />
                {displayUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 flex items-center justify-center bg-[#25d366] text-white text-[11px] font-semibold rounded-full border-2 border-white dark:border-[#202c33] leading-none">
                    {displayUnreadCount > 99 ? "99+" : displayUnreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Chats{displayUnreadCount > 0 ? ` (${displayUnreadCount} unread)` : ""}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
            <TooltipContent side="right">
              {userName || "Profile"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Sidebar Content - min-w-0 so it shrinks and doesn't overflow */}
      <div
        className={cn(
          "flex flex-col h-full min-w-0 flex-1 overflow-hidden bg-white dark:bg-[#06090a]",
        )}
      >
        {/* Hidden file input for per-item uploads (stays mounted) */}
        <input
          ref={perItemFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleProfilePicSelectedFor}
        />
        {/* Header - WhatsApp style: white, "WhatsApp" title, new chat + menu */}
        <div
          className={cn(
            "flex items-center justify-between bg-white dark:bg-[#06090a] flex-shrink-0 min-w-0",
            "h-[60px] px-3 pt-[env(safe-area-inset-top,0px)] md:pt-0 md:px-3",
            "border-b border-[#f0f2f5] dark:border-[#222d34]",
          )}
        >
          {showNewChat ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewChat(false)}
                className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-[17px] font-medium text-[#111b21] dark:text-[#e9edef]">
                New chat
              </span>
              {onAddOwner || onAddGuest ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#008069] dark:text-[#00a884] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] rounded-full h-9 w-9"
                      aria-label="Add owner or guest"
                    >
                      <UserPlus className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[132px]">
                    {onAddOwner && (
                      <DropdownMenuItem
                        onClick={() => {
                          onAddOwner();
                          setShowNewChat(false);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Owner
                      </DropdownMenuItem>
                    )}
                    {onAddGuest && (
                      <DropdownMenuItem
                        onClick={() => {
                          onAddGuest();
                          setShowNewChat(false);
                        }}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Guest
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="w-9" />
              )}
            </>
          ) : (
            <>
              <span className="text-[18px] font-bold text-[#111b21] dark:text-[#e9edef] truncate min-w-0">
                WhatsApp
              </span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {isMounted && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="p-2 rounded-full hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] inline-flex">
                          {isConnected ? (
                            <Wifi className="h-5 w-5 text-[#25d366]" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-red-500" />
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isConnected ? "Connected" : "Disconnected"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {(onAddOwner || onAddGuest) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#008069] dark:text-[#00a884] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] rounded-full h-9 w-9"
                        aria-label="Add owner or guest"
                        title="Add owner or guest"
                      >
                        <UserPlus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[132px]">
                      {onAddOwner && (
                        <DropdownMenuItem onClick={onAddOwner}>
                          <User className="h-4 w-4 mr-2" />
                          Owner
                        </DropdownMenuItem>
                      )}
                      {onAddGuest && (
                        <DropdownMenuItem
                          onClick={onAddGuest}
                          disabled={guestInitiationAtLimit}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Guest
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewChat(true)}
                  className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] rounded-full h-9 w-9"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] rounded-full h-9 w-9"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px]">
                    <DropdownMenuItem onClick={() => setConversationTab("all")}>
                      All ({totalCount})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setConversationTab("owners")}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Owners ({ownerCount})
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setConversationTab("guests")}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Guests ({guestCount})
                    </DropdownMenuItem>
                    {canManagePhoneMask && (
                      <DropdownMenuItem
                        onClick={() => setShowPhoneMaskForm(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Phone visibility rules
                      </DropdownMenuItem>
                    )}
                    {showAdminQueueMenu && (
                      <>
                        <div className="h-px bg-[#e9edef] dark:bg-[#222d34] my-1" />
                        <DropdownMenuItem
                          onClick={() => onAdminQueueChange?.(!adminQueue)}
                          className={cn(
                            adminQueue &&
                              "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          <MapPinOff className="h-4 w-4 mr-2" />
                          {adminQueue
                            ? "Exit Admin Queue"
                            : "Admin Queue (no location)"}
                        </DropdownMenuItem>
                      </>
                    )}
                    {userRole === "SuperAdmin" && (
                      <>
                        <div className="h-px bg-[#e9edef] dark:bg-[#222d34] my-1" />
                        <div className="px-2 py-1.5 space-y-2">
                          <WhatsAppConversationTypeMigrationButton
                            onSuccess={onRefreshConversations}
                          />
                        </div>
                      </>
                    )}
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
            searchFocused || (searchQuery && searchQuery.trim().length > 0)
              ? "bg-[#e9edef] dark:bg-[#2a3942]"
              : "bg-white dark:bg-[#06090a]",
          )}
        >
          {showNewChat ? (
            <div className="space-y-2 min-w-0">
              <div className="flex gap-2 min-w-0">
                <div className="relative w-20 flex-shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0] text-sm">
                    +
                  </span>
                  <Input
                    placeholder="91"
                    value={newCountryCode}
                    onChange={(e) =>
                      onCountryCodeChange(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    className={cn(
                      "pl-6 bg-[#f0f2f5] dark:bg-[#06090a] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0]",
                      // Mobile: Taller inputs for touch
                      "h-11",
                      "md:h-9",
                    )}
                    maxLength={4}
                  />
                </div>
                <Input
                  placeholder="Phone number"
                  value={newPhoneNumber}
                  onChange={(e) =>
                    onPhoneNumberChange(e.target.value.replace(/\D/g, ""))
                  }
                  className={cn(
                    "flex-1 min-w-0 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0]",
                    // Mobile: Taller inputs for touch
                    "h-11",
                    "md:h-9",
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onStartConversation();
                  }}
                />
                {guestInitiationAtLimit && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Daily new guest limit reached. Existing chats are unaffected.
                  </p>
                )}
                <Button
                  onClick={onStartConversation}
                  disabled={
                    guestInitiationAtLimit ||
                    loading ||
                    !newCountryCode.trim() ||
                    !newPhoneNumber.trim()
                  }
                  className={cn(
                    "bg-[#25d366] hover:bg-[#1da851] text-white flex-shrink-0",
                    // Mobile: Larger button
                    "h-11 px-4",
                    "md:h-9 md:px-3",
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Start"
                  )}
                </Button>
              </div>
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
                  searchFocused || searchQuery?.trim()
                    ? "bg-white dark:bg-[#111b21] "
                    : "bg-[#f0f2f5] dark:bg-[#202c33]",
                  "md:h-9 md:text-[14px]",
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

        {/* Filter pills - All | Unread | Favourites | Labels (+) — compact, no horizontal scroll */}
        {!showNewChat && (
          <div className="flex items-center gap-1.5 px-2.5 py-2 min-w-0 w-full overflow-hidden flex-nowrap bg-white dark:bg-[#06090a] flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setConversationTab("all");
                onLabelFilterChange?.("all");
              }}
              className={inboxFilterPillClass(isAllFilterActive)}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setConversationTab("all");
                onLabelFilterChange?.("unread");
              }}
              className={inboxFilterPillClass(isUnreadFilter)}
            >
              {displayUnreadCount > 0 ? `Unread (${displayUnreadCount})` : "Unread"}
            </button>
            <button
              type="button"
              className={inboxFilterPillClass(false)}
            >
              Favourites
            </button>

            <DropdownMenu open={labelsMenuOpen} onOpenChange={setLabelsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={inboxFilterPillClass(isLabelsFilterActive)}
                >
                  Labels
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                {SIDEBAR_LABEL_FILTERS.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => {
                      if (item.key === "owners") {
                        setConversationTab("owners");
                        onLabelFilterChange?.("owners");
                      } else if (item.key === "guests") {
                        setConversationTab("guests");
                        onLabelFilterChange?.("guests");
                      } else if (item.key === "unread") {
                        setConversationTab("all");
                        onLabelFilterChange?.("unread");
                      } else if (item.key === "all") {
                        setConversationTab("all");
                        onLabelFilterChange?.("all");
                      } else {
                        setConversationTab("all");
                        onLabelFilterChange?.(item.key);
                      }
                    }}
                    className={cn(
                      (item.key === "unread"
                        ? isUnreadFilter
                        : item.key === "owners"
                          ? conversationTab === "owners"
                          : item.key === "guests"
                            ? conversationTab === "guests"
                            : item.key === "all"
                              ? isAllFilterActive
                              : labelFilter === item.key) &&
                        "bg-[#e9edef] dark:bg-[#2a3942]",
                    )}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {showInboxLocationFilter && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={adminQueue}
                    className={cn(
                      inboxFilterIconButtonClass(adminLocationFilter !== "all"),
                      adminQueue && "opacity-60 cursor-not-allowed",
                    )}
                    aria-label={
                      adminLocationFilter === "all"
                        ? userRole === "SuperAdmin"
                          ? "All locations"
                          : "All my locations"
                        : adminLocationFilter
                    }
                    title={
                      adminLocationFilter === "all"
                        ? userRole === "SuperAdmin"
                          ? "All locations"
                          : "All my locations"
                        : adminLocationFilter
                    }
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => onAdminLocationFilterChange?.("all")}
                    className={cn(
                      adminLocationFilter === "all" &&
                        "bg-[#e9edef] dark:bg-[#2a3942]",
                    )}
                  >
                    {userRole === "SuperAdmin" ? "All locations" : "All my locations"}
                  </DropdownMenuItem>
                  {adminLocationOptions.map((loc) => (
                    <DropdownMenuItem
                      key={loc}
                      onClick={() => onAdminLocationFilterChange?.(loc)}
                      className={cn(
                        adminLocationFilter === loc &&
                          "bg-[#e9edef] dark:bg-[#2a3942]",
                      )}
                    >
                      {loc}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {!showNewChat && (
          <div className="px-3 pb-2 bg-white dark:bg-[#06090a] flex-shrink-0 space-y-2">
            <InitiationLimitBadge refreshKey={initiationLimitRefreshKey} />
            {guestInitiationAtLimit && (
              <p className="text-xs text-red-600 dark:text-red-400 px-1">
                You have reached your daily limit of 15 new guest conversations.
              </p>
            )}
          </div>
        )}

        {/* Admin Queue banner */}
        {adminQueue && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex-shrink-0">
            <MapPinOff className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-[13px] font-medium text-amber-700 dark:text-amber-300 flex-1">
              Admin Queue — conversations without a location
            </span>
            <button
              onClick={() => onAdminQueueChange?.(false)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
            >
              <X className="h-4 w-4" />
            </button>
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
              phoneMaskRules={phoneMaskRules}
              userRole={userRole}
              onSelectConversation={async (conversationId) => {
                // Clear search first to show all chats
                handleClearSearch();

                // Try to find conversation in local array first
                let conv = conversations.find((c) => c._id === conversationId);

                // If not found locally, construct from search results
                if (!conv && unifiedSearchResults) {
                  const searchResult = unifiedSearchResults.conversations.find(
                    (c) => c.conversationId === conversationId,
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
                      status: searchResult.status || "active",
                    };
                  }
                }

                // If still not found, fetch from API as last resort
                if (!conv) {
                  try {
                    const response = await fetch(
                      `/api/whatsapp/conversations?conversation=${encodeURIComponent(conversationId)}`,
                    );
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.conversations?.[0]) {
                        conv = data.conversations[0];
                      }
                    }
                  } catch (error) {
                    console.error("Failed to fetch conversation:", error);
                  }
                }

                if (conv) {
                  onSelectConversation(conv);
                } else {
                  console.error("Conversation not found:", conversationId);
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
              <p className="text-[#111b21] dark:text-[#e9edef] font-medium mb-1">
                No chats found
              </p>
              <p className="text-sm text-[#667781] dark:text-[#8696a0]">
                {searchQuery
                  ? "Try a different search"
                  : "Start a new conversation"}
              </p>
            </div>
          ) : (
            <>
              {/* Archived - reference style: box-with-arrow icon, "Archived" label, unread count only */}
              {onToggleArchiveView && !showingArchived && (
                <div
                  onClick={onToggleArchiveView}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-white dark:bg-[#06090a]",
                    "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] active:bg-[#e9edef] dark:active:bg-[#1d282f]",
                    "border-b border-[#f0f2f5] dark:border-[#222d34]",
                  )}
                >
                  <RiInboxArchiveLine
                    className="h-10 w-5 flex-shrink-0 text-[#54656f] dark:text-[#8696a0]"
                    strokeWidth={0.3}
                  />
                  <span className="flex-1 text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">
                    Archived
                  </span>
                  {archivedUnreadCount > 0 && (
                    <span className="text-[14px] text-[#667781] dark:text-[#8696a0] tabular-nums">
                      {archivedUnreadCount}
                    </span>
                  )}
                </div>
              )}
              {onToggleArchiveView && showingArchived && (
                <div
                  onClick={onToggleArchiveView}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-[#f0f2f5] dark:bg-[#06090a]",
                    "hover:bg-[#e9edef] dark:hover:bg-[#2a3942] border-b border-[#e9edef] dark:border-[#222d34]",
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center flex-shrink-0">
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </div>
                  <span className="flex-1 text-[16px] font-medium text-[#111b21] dark:text-[#e9edef]">
                    Back to all chats
                  </span>
                </div>
              )}
              <div
                style={{
                  height: `${conversationVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {conversationVirtualizer.getVirtualItems().map((virtualItem) => {
                  const conversation = filteredConversations[virtualItem.index];
                  if (!conversation) return null;
                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={conversationVirtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <ConversationItem
                        conversation={conversation}
                        isSelected={selectedConversation?._id === conversation._id}
                        onSelect={handleSelectConversation}
                        isMounted={isMounted}
                        onArchive={showingArchived ? undefined : onArchiveConversation}
                        onUnarchive={showingArchived ? onUnarchiveConversation : undefined}
                        isArchived={showingArchived || conversation.isArchivedByUser}
                        isMobile={isMobile}
                        onTriggerUpload={triggerUploadFor}
                        onRenameFor={handleRenameFor}
                        onConversationTypeChange={onConversationTypeChange}
                        onSetLocation={setLocationDialogConversation}
                        phoneMaskRules={phoneMaskRules}
                        userRole={userRole}
                        userEmail={userEmail}
                        userAreas={userAreas}
                        onOpenDisposition={onOpenDisposition}
                        onOpenSetVisit={onOpenSetVisit}
                        onOpenReminder={onOpenReminder}
                        onCrmActionForConversation={onCrmActionForConversation}
                      />
                    </div>
                  );
                })}
              </div>

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

      <SetParticipantLocationDialog
        open={Boolean(locationDialogConversation)}
        onOpenChange={(open) => {
          if (!open) setLocationDialogConversation(null);
        }}
        conversation={locationDialogConversation}
        userRole={userRole}
        userEmail={userEmail}
        userAreas={userAreas}
        onSaved={(conversationId, location) => {
          onUpdateConversation?.(conversationId, {
            participantLocation: location,
          });
          onRefreshConversations?.();
          setLocationDialogConversation(null);
        }}
      />

      {/* Media Popup */}
      <MediaPopup
        open={showMediaPopup}
        onClose={() => setShowMediaPopup(false)}
        conversation={selectedConversation}
        phoneId={undefined}
      />

      {canManagePhoneMask && (
        <WhatsAppPhoneMaskForm
          open={showPhoneMaskForm}
          onOpenChange={setShowPhoneMaskForm}
        />
      )}
    </div>
  );
});
