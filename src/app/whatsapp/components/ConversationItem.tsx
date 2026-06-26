"use client";

import { memo, type ComponentType, type ReactNode } from "react";
import {
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  User,
  Users,
  MoreVertical,
  Archive,
  ArchiveRestore,
  ChevronDown,
  Images,
  Link2,
  ListChecks,
  MapPin,
  MapPinOff,
  Timer,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { formatTime } from "../utils";
import {
  getMaskedMessagePreview,
  resolveConversationDisplayLabel,
  type WhatsAppPhoneMaskRules,
} from "@/lib/whatsapp/phoneMask";
import { canAssignWhatsAppParticipantLocation } from "@/lib/whatsapp/participantLocationPrivileges";
import { ConversationLabelChips } from "./ConversationLabelChips";

export interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  isMounted: boolean;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  isArchived?: boolean;
  isMobile?: boolean;
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
  onOpenDisposition?: () => void;
  onOpenSetVisit?: () => void;
  onOpenReminder?: () => void;
  onCrmActionForConversation?: (conversation: Conversation) => void;
}

function labelsEqual(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((label, index) => label === b[index]);
}

function maskRulesEqual(
  a?: WhatsAppPhoneMaskRules,
  b?: WhatsAppPhoneMaskRules,
): boolean {
  return (
    (a?.maskOwnerPhones ?? false) === (b?.maskOwnerPhones ?? false) &&
    (a?.maskGuestPhones ?? false) === (b?.maskGuestPhones ?? false)
  );
}

type ConversationRowFields = Conversation & {
  participantLocation?: string;
  participantLocationKey?: string;
  whatsappName?: string;
  waName?: string;
  waDisplayName?: string;
};

function conversationRowsEqual(
  prev: ConversationRowFields,
  next: ConversationRowFields,
): boolean {
  return (
    prev._id === next._id &&
    prev.lastMessageTime === next.lastMessageTime &&
    prev.lastMessageContent === next.lastMessageContent &&
    prev.lastMessageDirection === next.lastMessageDirection &&
    prev.unreadCount === next.unreadCount &&
    prev.lastMessageStatus === next.lastMessageStatus &&
    prev.participantName === next.participantName &&
    prev.participantProfilePic === next.participantProfilePic &&
    prev.participantPhone === next.participantPhone &&
    prev.conversationType === next.conversationType &&
    prev.isOnline === next.isOnline &&
    prev.isInternal === next.isInternal &&
    prev.source === next.source &&
    (prev.listingLinkSentCount ?? 0) === (next.listingLinkSentCount ?? 0) &&
    (prev.optionsSentCount ?? 0) === (next.optionsSentCount ?? 0) &&
    prev.participantLocation === next.participantLocation &&
    prev.participantLocationKey === next.participantLocationKey &&
    labelsEqual(prev.labels, next.labels)
  );
}

function areConversationItemPropsEqual(
  prev: ConversationItemProps,
  next: ConversationItemProps,
): boolean {
  return (
    conversationRowsEqual(
      prev.conversation as ConversationRowFields,
      next.conversation as ConversationRowFields,
    ) &&
    prev.isSelected === next.isSelected &&
    prev.isArchived === next.isArchived &&
    prev.isMounted === next.isMounted &&
    prev.isMobile === next.isMobile &&
    prev.userRole === next.userRole &&
    prev.userEmail === next.userEmail &&
    prev.userAreas === next.userAreas &&
    maskRulesEqual(prev.phoneMaskRules, next.phoneMaskRules) &&
    Boolean(prev.onArchive) === Boolean(next.onArchive) &&
    Boolean(prev.onUnarchive) === Boolean(next.onUnarchive) &&
    Boolean(prev.onRenameFor) === Boolean(next.onRenameFor) &&
    Boolean(prev.onConversationTypeChange) === Boolean(next.onConversationTypeChange) &&
    Boolean(prev.onSetLocation) === Boolean(next.onSetLocation) &&
    Boolean(prev.onOpenDisposition) === Boolean(next.onOpenDisposition) &&
    Boolean(prev.onOpenSetVisit) === Boolean(next.onOpenSetVisit) &&
    Boolean(prev.onOpenReminder) === Boolean(next.onOpenReminder) &&
    Boolean(prev.onCrmActionForConversation) ===
      Boolean(next.onCrmActionForConversation)
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
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
  onCrmActionForConversation,
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
  onOpenDisposition?: () => void;
  onOpenSetVisit?: () => void;
  onOpenReminder?: () => void;
  onCrmActionForConversation?: (conversation: Conversation) => void;
}) {
  const isInternal =
    conversation.isInternal || conversation.source === "internal";
  const runCrmAction = (action: () => void) => {
    onCrmActionForConversation?.(conversation);
    action();
  };
  const itemClass = isMobile ? "py-3 text-base" : undefined;

  return (
    <>
      {!isInternal && onOpenDisposition && (
        <MenuItem
          className={itemClass}
          onSelect={() => runCrmAction(onOpenDisposition)}
        >
          <ListChecks className="h-4 w-4 mr-2" />
          Lead disposition
        </MenuItem>
      )}
      {!isInternal && onOpenSetVisit && (
        <MenuItem
          className={itemClass}
          onSelect={() => runCrmAction(onOpenSetVisit)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Set visit
        </MenuItem>
      )}
      {!isInternal && onOpenReminder && (
        <MenuItem
          className={itemClass}
          onSelect={() => runCrmAction(onOpenReminder)}
        >
          <Timer className="h-4 w-4 mr-2" />
          Set reminder
        </MenuItem>
      )}
      {!isInternal &&
        (onOpenDisposition || onOpenSetVisit || onOpenReminder) && (
          <div className="h-px bg-[#e9edef] dark:bg-[#222d34] my-1" />
        )}
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

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  isMounted,
  onArchive,
  onUnarchive,
  isArchived,
  isMobile = false,
  onTriggerUpload,
  onRenameFor,
  onConversationTypeChange,
  onSetLocation,
  phoneMaskRules,
  userRole = "",
  userEmail = "",
  userAreas,
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
  onCrmActionForConversation,
}: ConversationItemProps): JSX.Element {
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
  const rowFields = conversation as ConversationRowFields;
  const whatsappName =
    rowFields.whatsappName || rowFields.waName || rowFields.waDisplayName;

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

  const hasCrmActions =
    !isInternal &&
    Boolean(onOpenDisposition || onOpenSetVisit || onOpenReminder);

  const hasActions = Boolean(
    onArchive ||
      onUnarchive ||
      canChangeType ||
      onRenameFor ||
      canSetLocation ||
      hasCrmActions,
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
    onOpenDisposition,
    onOpenSetVisit,
    onOpenReminder,
    onCrmActionForConversation,
  };

  const row = (
    <div
      className={cn(
        "relative flex items-center gap-3 cursor-pointer transition-colors group",
        "mx-2 mb-0.5 rounded-xl px-3 py-3 min-h-[72px] md:py-2.5 md:min-h-[56px]",
        "hover:bg-[#f0f0f0] dark:hover:bg-[#2a3942]",
        "active:bg-[#e9edef] dark:active:bg-[#1d282f]",
        isSelected && "bg-[#f0f0f0] dark:bg-[#2a3942]",
      )}
      onClick={() => onSelect(conversation)}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 md:h-12 md:w-12 rounded-full">
          <AvatarImage src={conversation.participantProfilePic} />
          <AvatarFallback
            className={cn(
              "text-sm font-medium rounded-full",
              conversation.isInternal || conversation.source === "internal"
                ? "bg-[#25d366] text-white"
                : "bg-[#e0e0e0] dark:bg-[#6b7b85] text-[#54656f] dark:text-white",
            )}
          >
            {isInternal
              ? "You"
              : listTitle.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        {(conversation.isOnline || hasUnread) && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-[#25d366] rounded-full border-2 border-white dark:border-[#111b21]" />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-hidden py-1 pl-2">
        <div className="flex items-center justify-between gap-2 min-h-5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {role && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium uppercase tracking-wide",
                  role === "owner"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                )}
              >
                {role === "owner" ? "O" : "G"}
              </span>
            )}
            <span
              className={cn(
                "text-[16px] truncate flex-1 min-w-0",
                hasUnread
                  ? "font-semibold text-[#111b21] dark:text-[#e9edef]"
                  : "font-medium text-[#111b21] dark:text-[#e9edef]",
              )}
            >
              {listTitle}
            </span>
            {hasRealDisplayName && phone && !hasUnread && (
              <span className="text-[12px] text-[#667781] dark:text-[#8696a0] flex-shrink-0 tabular-nums">
                {phone.replace(/^\+?91/, "")}
              </span>
            )}
          </div>
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
        <div className="flex items-center gap-1.5 min-w-0 pr-0">
          {conversation.lastMessageDirection === "outgoing" && (
            <span className="flex-shrink-0 mt-0.5">
              {getStatusIcon(conversation.lastMessageStatus)}
            </span>
          )}
          <span
            className={cn(
              "text-[14px] truncate min-w-0",
              hasUnread
                ? "text-[#111b21] dark:text-[#d1d7db] font-medium"
                : "text-[#667781] dark:text-[#8696a0]",
            )}
          >
            {messagePreview || phone || " "}
          </span>
        </div>
        <ConversationLabelChips labels={conversation.labels} max={2} />
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
        {rowFields.participantLocation && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#54656f] dark:text-[#8696a0] bg-[#f0f2f5] dark:bg-[#202c33] px-1.5 py-0.5 rounded-full capitalize">
                    <MapPin className="h-2.5 w-2.5" />
                    {rowFields.participantLocation}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Participant location</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        {!rowFields.participantLocation && !rowFields.participantLocationKey && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
              <MapPinOff className="h-2.5 w-2.5" />
              No location
            </span>
          </div>
        )}
      </div>

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
}, areConversationItemPropsEqual);
