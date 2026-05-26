"use client";

import { useState, useEffect, useRef, useCallback, type ComponentType, type ReactNode } from "react";
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
  Images,
  MessageCircle,
  Sun,
  Moon,
  Shield,
  Link2,
  ListChecks,
  MapPin,
  MapPinOff,
} from "lucide-react";
import axios from "@/util/axios";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { formatTime } from "../utils";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useUnifiedWhatsAppSearch } from "../hooks/useUnifiedWhatsAppSearch";
import { UnifiedSearchResults } from "./UnifiedSearchResults";
import { MediaPopup } from "./MediaPopup";
import { WhatsAppConversationTypeMigrationButton } from "@/components/dashboard/WhatsAppConversationTypeMigrationButton";
import { WhatsAppPhoneLocationsManager } from "@/components/dashboard/WhatsAppPhoneLocationsManager";
import { WhatsAppPhoneMaskForm } from "./WhatsAppPhoneMaskForm";
import {
  getMaskedMessagePreview,
  resolveConversationDisplayLabel,
  type WhatsAppPhoneMaskRules,
} from "@/lib/whatsapp/phoneMask";
import { canAssignWhatsAppParticipantLocation } from "@/lib/whatsapp/participantLocationPrivileges";
import { SetParticipantLocationDialog } from "./SetParticipantLocationDialog";

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
  };
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

function ConversationActionItems({
  MenuItem,
  conversation,
  isArchived,
  canChangeType,
  role,
  onRenameFor,
  onTriggerUpload,
  onConversationTypeChange,
  onArchive,
  onUnarchive,
  onSetLocation,
  canSetLocation,
  isMobile,
}: {
  MenuItem: ComponentType<{
    onSelect?: () => void;
    className?: string;
    children: ReactNode;
  }>;
  conversation: Conversation;
  isArchived?: boolean;
  canChangeType: boolean;
  role?: Conversation["conversationType"];
  onRenameFor?: (conversationId: string, currentName?: string) => void;
  onTriggerUpload?: (conversationId: string) => void;
  onConversationTypeChange?: (
    conversationId: string,
    conversationType: "owner" | "guest",
  ) => void | Promise<void>;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onSetLocation?: (conversation: Conversation) => void;
  canSetLocation?: boolean;
  isMobile?: boolean;
}) {
  const itemClass = isMobile ? "py-3 text-base" : undefined;

  return (
    <>
      {canSetLocation && onSetLocation ? (
        <MenuItem
          className={itemClass}
          onSelect={() => onSetLocation(conversation)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          {(conversation as { participantLocation?: string }).participantLocation
            ? "Change location"
            : "Set location"}
        </MenuItem>
      ) : null}
      <MenuItem
        className={itemClass}
        onSelect={() => onRenameFor?.(conversation._id, conversation.participantName)}
      >
        <MoreVertical className="h-4 w-4 mr-2" />
        Rename
      </MenuItem>
      <MenuItem
        className={itemClass}
        onSelect={() => onTriggerUpload?.(conversation._id)}
      >
        <Images className="h-4 w-4 mr-2" />
        Upload profile picture
      </MenuItem>
      {canChangeType && role !== "owner" && (
        <MenuItem
          className={itemClass}
          onSelect={() => void onConversationTypeChange?.(conversation._id, "owner")}
        >
          <User className="h-4 w-4 mr-2" />
          Convert to owner
        </MenuItem>
      )}
      {canChangeType && role !== "guest" && (
        <MenuItem
          className={itemClass}
          onSelect={() => void onConversationTypeChange?.(conversation._id, "guest")}
        >
          <Users className="h-4 w-4 mr-2" />
          Convert to guest
        </MenuItem>
      )}
      {isArchived ? (
        <MenuItem
          className={itemClass}
          onSelect={() => onUnarchive?.(conversation._id)}
        >
          <ArchiveRestore className="h-4 w-4 mr-2" />
          Unarchive
        </MenuItem>
      ) : (
        <MenuItem
          className={itemClass}
          onSelect={() => onArchive?.(conversation._id)}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </MenuItem>
      )}
    </>
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
  onUpdateConversation,
  onTriggerUpload,
  onRenameFor,
  onConversationTypeChange,
  onSetLocation,
  phoneMaskRules,
  userRole = "",
  userEmail = "",
  userAreas,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  isMounted: boolean;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  isArchived?: boolean;
  isMobile?: boolean;
  onUpdateConversation?: (conversationId: string, patch: Partial<Conversation>) => void;
  onTriggerUpload?: (conversationId: string) => void;
  onRenameFor?: (conversationId: string, currentName?: string) => void;
  onConversationTypeChange?: (
    conversationId: string,
    conversationType: "owner" | "guest",
  ) => void | Promise<void>;
  onSetLocation?: (conversation: Conversation) => void;
  phoneMaskRules?: WhatsAppPhoneMaskRules;
  userRole?: string;
  userEmail?: string;
  userAreas?: string | string[];
}): JSX.Element {
  // Use parent-level upload/rename handlers to avoid input unmount issues
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

  const maskRules = phoneMaskRules ?? {
    maskOwnerPhones: false,
    maskGuestPhones: false,
  };
  const isInternal =
    Boolean(conversation.isInternal) || conversation.source === "internal";
  const whatsappName =
    (conversation as { whatsappName?: string }).whatsappName ||
    (conversation as { waName?: string }).waName ||
    (conversation as { waDisplayName?: string }).waDisplayName;

  const { title: listTitle, maskedPhone: phone } = resolveConversationDisplayLabel(
    {
      participantName: conversation.participantName,
      participantPhone: conversation.participantPhone,
      whatsappName: typeof whatsappName === "string" ? whatsappName : undefined,
      conversationType: conversation.conversationType,
      isInternal,
    },
    maskRules,
    userRole,
  );

  const hasRealDisplayName =
    !isInternal &&
    Boolean(conversation.participantName?.trim() || whatsappName) &&
    listTitle !== phone;

  const messagePreview = getMaskedMessagePreview(
    conversation.lastMessageContent,
    conversation.participantPhone,
    conversation.conversationType,
    maskRules,
    userRole,
  );

  const role = conversation.conversationType;
  const canChangeType =
    !conversation.isInternal &&
    conversation.source !== "internal" &&
    Boolean(onConversationTypeChange);

  const listingLinkSentCount = conversation.listingLinkSentCount ?? 0;
  const optionsSentCount = conversation.optionsSentCount ?? 0;
  const showGuestStats =
    role === "guest" && (listingLinkSentCount > 0 || optionsSentCount > 0);

  const canSetLocation =
    !isInternal &&
    Boolean(onSetLocation) &&
    canAssignWhatsAppParticipantLocation({
      role: userRole,
      email: userEmail,
      allotedArea: userAreas,
    });

  const hasActions = Boolean(
    onArchive ||
      onUnarchive ||
      canChangeType ||
      onRenameFor ||
      canSetLocation
  );

  const actionMenuProps = {
    conversation,
    isArchived,
    canChangeType,
    role,
    onRenameFor,
    onTriggerUpload,
    onConversationTypeChange,
    onArchive,
    onUnarchive,
    onSetLocation,
    canSetLocation,
    isMobile,
  };

  const row = (
    <div
      className={cn(
        "relative flex items-center gap-3 cursor-pointer transition-colors group",
        "mx-2 mb-0.5 rounded-xl px-3 py-3 min-h-[72px] md:py-2.5 md:min-h-[56px]",
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
            {isInternal
              ? "You"
              : listTitle.slice(0, 2).toUpperCase() || "??"}
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
              {listTitle}
            </span>
            {/* {hasUnread && (
              <Badge className="flex-shrink-0 bg-blue-500 text-white text-[11px] font-medium min-w-[18px] h-[18px] rounded-full px-1">
                {conversation.unreadCount}
              </Badge>
            )} */}
            {hasRealDisplayName && phone && !hasUnread && (
              <span className="text-[12px] text-[#667781] dark:text-[#8696a0] flex-shrink-0 tabular-nums">
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
            {messagePreview || phone || " "}
          </span>
        </div>
        {showGuestStats && (
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {listingLinkSentCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#008069] dark:text-[#00a884] bg-[#e7f8f3] dark:bg-[#0b3328] px-1.5 py-0.5 rounded-full tabular-nums">
                      <Link2 className="h-3 w-3" />
                      {listingLinkSentCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Listing link{listingLinkSentCount === 1 ? "" : "s"} sent
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {optionsSentCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6b5b95] dark:text-[#b8a9e0] bg-[#f3f0f8] dark:bg-[#2a2438] px-1.5 py-0.5 rounded-full tabular-nums">
                      <ListChecks className="h-3 w-3" />
                      {optionsSentCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    &quot;Options sent&quot; message{optionsSentCount === 1 ? "" : "s"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        {/* Location badge */}
        {(conversation as any).participantLocation && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#54656f] dark:text-[#8696a0] bg-[#f0f2f5] dark:bg-[#202c33] px-1.5 py-0.5 rounded-full capitalize">
                    <MapPin className="h-2.5 w-2.5" />
                    {(conversation as any).participantLocation}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Participant location</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        {!(conversation as any).participantLocation && !(conversation as any).participantLocationKey && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
              <MapPinOff className="h-2.5 w-2.5" />
              No location
            </span>
          </div>
        )}
      </div>

      {/* Chevron: hover menu */}
      {hasActions && (
        <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-[#e9edef] dark:hover:bg-[#374045] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronDown className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <ConversationActionItems
                MenuItem={DropdownMenuItem as ComponentType<{
                  onSelect?: () => void;
                  className?: string;
                  children: ReactNode;
                }>}
                {...actionMenuProps}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  if (!hasActions) {
    return row;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-[180px]">
        <ConversationActionItems
          MenuItem={ContextMenuItem as ComponentType<{
            onSelect?: () => void;
            className?: string;
            children: ReactNode;
          }>}
          {...actionMenuProps}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}


export function ConversationSidebar({
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
}: SidebarProps) {
  const [showPhoneMaskForm, setShowPhoneMaskForm] = useState(false);
  const [conversationTab, setConversationTab] = useState<"all" | "owners" | "guests">("all");
  const [filterPill, setFilterPill] = useState<"all" | "unread">("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
   const [showMediaPopup, setShowMediaPopup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [locationDialogConversation, setLocationDialogConversation] =
    useState<Conversation | null>(null);

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
      userRole === "SuperAdmin" && adminLocationFilter !== "all" && !adminQueue
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
      } else {
        window.location.reload();
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

  // Calculate unread count for notification badge
  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + ((conv.unreadCount || 0) > 0 && conv.lastMessageDirection === "incoming" ? 1 : 0),
    0
  );

  return (
    <div
      className={cn(
        "flex h-full bg-white dark:bg-[#111b21] min-h-0 min-w-0 w-full overflow-hidden",
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
          "flex flex-col h-full min-w-0 flex-1 overflow-hidden bg-white dark:bg-[#111b21]",
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
            "flex items-center justify-between bg-white dark:bg-[#111b21] flex-shrink-0 min-w-0",
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
                        <DropdownMenuItem onClick={onAddGuest}>
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
                    {(userRole === "SuperAdmin" ||
                      userRole === "Admin" ||
                      userRole === "Developer") && (
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
                          <WhatsAppPhoneLocationsManager />
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
              : "bg-white dark:bg-[#111b21]",
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
                      "pl-6 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0]",
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
                <Button
                  onClick={onStartConversation}
                  disabled={
                    loading || !newCountryCode.trim() || !newPhoneNumber.trim()
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
                    ? "bg-white dark:bg-[#111b21] shadow-sm"
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

        {/* Filter pills - All | Unread | Favourites | Groups | Labels (WhatsApp style) */}
        {!showNewChat && (
          <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto overflow-y-hidden min-w-0 bg-white dark:bg-[#111b21] flex-shrink-0 scrollbar-none">
            <button
              onClick={() => {
                setFilterPill("all");
                setConversationTab("all");
              }}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-[14px] font-medium transition-colors",
                filterPill === "all" && conversationTab === "all"
                  ? "bg-[#e9edef] dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef]"
                  : "bg-transparent text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]",
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
                  : "bg-transparent text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]",
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
                      : "bg-transparent text-[#667781] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]",
                  )}
                >
                  Labels
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    setConversationTab("all");
                    setFilterPill("all");
                  }}
                >
                  All
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setConversationTab("owners");
                    setFilterPill("all");
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  Owners
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setConversationTab("guests");
                    setFilterPill("all");
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Guests
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {userRole === "SuperAdmin" && !showNewChat && (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 min-w-0",
                  adminQueue
                    ? "bg-[#f0f2f5] dark:bg-[#202c33] border-[#e9edef] dark:border-[#222d34] opacity-60"
                    : "bg-[#e7f5ff] dark:bg-[#1a2a33] border-[#cfe8f6] dark:border-[#2a3942]",
                )}
              >
                <MapPin className="h-4 w-4 text-[#008069] dark:text-[#00a884] flex-shrink-0" />
                <Select
                  value={adminLocationFilter}
                  onValueChange={(v) => onAdminLocationFilterChange?.(v)}
                  disabled={adminQueue}
                >
                  <SelectTrigger className="h-8 flex-1 text-[13px] bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045]">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {adminLocationOptions.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* SuperAdmin location filter */}

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
                      `/api/whatsapp/conversations/${conversationId}`,
                    );
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.conversation) {
                        conv = data.conversation;
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
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-white dark:bg-[#111b21]",
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
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-[#f0f2f5] dark:bg-[#202c33]",
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
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={`${conversation._id}-${conversation.lastMessageTime}-${conversation.unreadCount}`}
                  conversation={conversation}
                  isSelected={selectedConversation?._id === conversation._id}
                  onClick={() => onSelectConversation(conversation)}
                  isMounted={isMounted}
                  onArchive={
                    showingArchived ? undefined : onArchiveConversation
                  }
                  onUnarchive={
                    showingArchived ? onUnarchiveConversation : undefined
                  }
                  isArchived={showingArchived || conversation.isArchivedByUser}
                  isMobile={isMobile}
                  onUpdateConversation={onUpdateConversation}
                  onTriggerUpload={triggerUploadFor}
                  onRenameFor={handleRenameFor}
                  onConversationTypeChange={onConversationTypeChange}
                  onSetLocation={setLocationDialogConversation}
                  phoneMaskRules={phoneMaskRules}
                  userRole={userRole}
                  userEmail={userEmail}
                  userAreas={userAreas}
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
}
