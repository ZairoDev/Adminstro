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
  MapPin,
  MapPinOff,
  ListChecks,
  PanelRight,
  Webhook,
  Handshake,
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
import { getConversationBusinessPhoneId, getRemainingHours } from "../utils";
import { cn } from "@/lib/utils";
import axios from "@/util/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { canAssignWhatsAppParticipantLocation } from "@/lib/whatsapp/participantLocationPrivileges";
import type { ConversationReader } from "@/lib/whatsapp/conversationReaders";
import { WebhookLogButton } from "./WebhookLogDialog";
import { canForwardLeadToSales } from "@/lib/whatsapp/leadGenHandoff";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatHeaderProps {
  conversation: Conversation;
  callPermissions: { canMakeCalls: boolean };
  callPermsFetched?: boolean;
  onFetchCallPermissions?: () => void;
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
  readers?: ConversationReader[];
  skipReadersFetch?: boolean;
  onReadersChange?: (readers: ConversationReader[]) => void;
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
  userEmail?: string;
  userAreas?: string | string[];
  onLocationSet?: (conversationId: string, location: string) => void;
  onOpenDisposition?: () => void;
  onOpenSetVisit?: () => void;
  onOpenReminder?: () => void;
  onToggleCrmPanel?: () => void;
  crmPanelOpen?: boolean;
  onForwardedToSales?: (conversationId: string) => void;
}

interface Reader extends ConversationReader {}

export const ChatHeader = memo(function ChatHeader({
  conversation,
  callPermissions,
  callPermsFetched = false,
  onFetchCallPermissions,
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
  readers: readersProp = [],
  skipReadersFetch = false,
  onReadersChange,
  readersRefreshToken = 0,
  currentUserId,
  onBack,
  isMobile = false,
  availablePhoneConfigs = [],
  currentPhoneId,
  onTransferLead,
  onConversationTypeChange,
  phoneMaskRules,
  userRole = "",
  userEmail = "",
  userAreas,
  onLocationSet,
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
  onToggleCrmPanel,
  crmPanelOpen = false,
  onForwardedToSales,
}: ChatHeaderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const readers = readersProp;
  const [settingLocation, setSettingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [forwardConfirmOpen, setForwardConfirmOpen] = useState(false);
  const [forwardingToSales, setForwardingToSales] = useState(false);
  const [assignableLocations, setAssignableLocations] = useState<
    Array<{ displayName: string; locationKey: string }>
  >([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const businessPhoneId =
    (conversation as { businessPhoneId?: string }).businessPhoneId ||
    currentPhoneId ||
    "";
  const showCallButton =
    Boolean(getConversationBusinessPhoneId(conversation)) &&
    (!callPermsFetched || callPermissions.canMakeCalls);
  const prefetchCallPermissions = () => {
    onFetchCallPermissions?.();
  };
  const canAssignLocation = canAssignWhatsAppParticipantLocation({
    role: userRole,
    email: userEmail,
    allotedArea: userAreas,
  });

  useEffect(() => {
    if (!settingLocation || !canAssignLocation) return;
    let cancelled = false;
    setLoadingLocations(true);
    axios
      .get("/api/whatsapp/configured-locations")
      .then((res) => {
        if (!cancelled) {
          setAssignableLocations(res.data.locations || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load cities");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLocations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settingLocation, canAssignLocation]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Re-evaluate the 24h window every minute so the countdown stays live and
  // the badge flips to/from "Template only" without a page refresh.
  const [windowTick, setWindowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setWindowTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const outboundPhoneId = getConversationBusinessPhoneId(conversation);
  const remaining = useMemo(
    () =>
      isMounted ? getRemainingHours(conversation, outboundPhoneId) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- windowTick forces minute-level re-evaluation
    [conversation, isMounted, outboundPhoneId, windowTick],
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
  const participantLocation = (conversation as { participantLocation?: string })
    .participantLocation;

  const handleSetLocation = async () => {
    const loc = locationInput.trim();
    if (!loc || !conversation._id) return;
    try {
      await axios.post(`/api/whatsapp/conversations/${conversation._id}/meta`, {
        participantLocation: loc,
      });
      onLocationSet?.(conversation._id, loc);
      setSettingLocation(false);
      setLocationInput("");
      toast.success("Location assigned");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to set location";
      toast.error(message);
    }
  };

  const canForwardToSales =
    canForwardLeadToSales(userRole) &&
    conversation.handedToSales === false &&
    conversation.source !== "internal" &&
    !conversation.isInternal;

  const handleForwardToSales = async () => {
    if (!conversation._id || forwardingToSales) return;
    setForwardingToSales(true);
    try {
      await axios.post("/api/whatsapp/conversations/forward-to-sales", {
        conversationId: conversation._id,
      });
      toast.success("Lead forwarded to Sales team");
      setForwardConfirmOpen(false);
      onForwardedToSales?.(conversation._id);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to forward lead";
      toast.error(message);
    } finally {
      setForwardingToSales(false);
    }
  };

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
    <>
    <div className="flex flex-col bg-[#f0f2f5] dark:bg-[#06090a] border-b border-[#e9edef] dark:border-[#222d34]">
      <div
        className={cn(
          "flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#06090a]",
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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                {headerTitle}
              </h2>
              {participantLocation && !settingLocation ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#54656f] dark:text-[#8696a0] bg-[#f0f2f5] dark:bg-[#374045] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0">
                  <MapPin className="h-2.5 w-2.5" />
                  {participantLocation}
                </span>
              ) : null}
              {canAssignLocation ? (
                settingLocation ? (
                  <span className="inline-flex items-center gap-1 flex-shrink-0">
                    {loadingLocations ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : assignableLocations.length === 0 ? (
                      <span className="text-[10px] text-amber-600">
                        No cities configured — add locations in Dashboard → WhatsApp Channels
                      </span>
                    ) : (
                      <Select
                        value={locationInput || participantLocation || ""}
                        onValueChange={setLocationInput}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-36">
                          <SelectValue placeholder="Select city…" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableLocations.map((loc) => (
                            <SelectItem key={loc.locationKey} value={loc.displayName}>
                              {loc.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[11px]"
                      disabled={!locationInput}
                      onClick={() => void handleSetLocation()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1 text-[11px]"
                      onClick={() => {
                        setSettingLocation(false);
                        setLocationInput("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationInput(participantLocation || "");
                      setSettingLocation(true);
                    }}
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex-shrink-0"
                    title="Assign or change city for this chat"
                  >
                    {participantLocation ? (
                      <>
                        <MapPin className="h-2.5 w-2.5" />
                        Change location
                      </>
                    ) : (
                      <>
                        <MapPinOff className="h-2.5 w-2.5" />
                        Set location
                      </>
                    )}
                  </button>
                )
              ) : null}
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
          {onOpenDisposition && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenDisposition}
              title="Lead disposition"
              className={cn(
                "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                "h-11 w-11 min-h-[44px] min-w-[44px]",
                "md:h-10 md:w-10 md:min-h-0 md:min-w-0",
              )}
            >
              <ListChecks className="h-5 w-5" />
            </Button>
          )}
          {onOpenSetVisit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSetVisit}
              title="Set visit"
              className={cn(
                "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                "h-11 w-11 min-h-[44px] min-w-[44px]",
                "md:h-10 md:w-10 md:min-h-0 md:min-w-0",
              )}
            >
              <MapPin className="h-5 w-5" />
            </Button>
          )}
          {onOpenReminder && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenReminder}
              title="Set reminder"
              className={cn(
                "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                "h-11 w-11 min-h-[44px] min-w-[44px]",
                "md:h-10 md:w-10 md:min-h-0 md:min-w-0",
              )}
            >
              <Timer className="h-5 w-5" />
            </Button>
          )}

          {canForwardToSales && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setForwardConfirmOpen(true)}
              disabled={forwardingToSales}
              title="Forward lead to Sales"
              className={cn(
                "text-[#008069] dark:text-[#00a884] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
                "h-11 w-11 min-h-[44px] min-w-[44px]",
                "md:h-10 md:w-10 md:min-h-0 md:min-w-0",
              )}
            >
              {forwardingToSales ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Handshake className="h-5 w-5" />
              )}
            </Button>
          )}

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

          {showCallButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAudioCall}
              onMouseEnter={prefetchCallPermissions}
              onFocus={prefetchCallPermissions}
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

          {onToggleCrmPanel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCrmPanel}
              title={crmPanelOpen ? "Hide CRM panel" : "Show CRM panel"}
              className={cn(
                "hidden md:flex rounded-full",
                "md:h-10 md:w-10",
                crmPanelOpen
                  ? "text-[#008069] bg-[#d9fdd3] dark:bg-[#005c4b] hover:bg-[#d9fdd3] dark:hover:bg-[#005c4b]"
                  : "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045]",
              )}
            >
              <PanelRight className="h-5 w-5" />
            </Button>
          )}

          <WebhookLogButton
            participantPhone={conversation.participantPhone}
            className={cn(
              "text-[#54656f] dark:text-[#aebac1] hover:bg-[#e9edef] dark:hover:bg-[#374045] rounded-full",
              "h-11 w-11 min-h-[44px] min-w-[44px]",
              "md:h-10 md:w-10 md:min-h-0 md:min-w-0",
            )}
          />

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
              {showCallButton && (
                <DropdownMenuItem
                  onClick={onAudioCall}
                  onMouseEnter={prefetchCallPermissions}
                  onFocus={prefetchCallPermissions}
                  className="md:hidden"
                >
                  <Phone className="h-4 w-4 mr-3" />
                  Voice call
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toastCopy}>
                <Phone className="h-4 w-4 mr-3" />
                Copy phone number
              </DropdownMenuItem>
              {canForwardToSales && (
                <DropdownMenuItem onClick={() => setForwardConfirmOpen(true)}>
                  <Handshake className="h-4 w-4 mr-3" />
                  Forward to Sales
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onRefreshTemplates}>
                <RefreshCw className={cn("h-4 w-4 mr-3", templatesLoading && "animate-spin")} />
                Refresh templates
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  document.getElementById("webhook-log-trigger")?.click();
                }}
              >
                <Webhook className="h-4 w-4 mr-3" />
                Webhook activity
              </DropdownMenuItem>
              {onOpenDisposition && (
                <DropdownMenuItem onClick={onOpenDisposition}>
                  <ListChecks className="h-4 w-4 mr-3" />
                  Lead disposition
                </DropdownMenuItem>
              )}
              {onOpenSetVisit && (
                <DropdownMenuItem onClick={onOpenSetVisit}>
                  <MapPin className="h-4 w-4 mr-3" />
                  Set visit
                </DropdownMenuItem>
              )}
              {onOpenReminder && (
                <DropdownMenuItem onClick={onOpenReminder}>
                  <Timer className="h-4 w-4 mr-3" />
                  Set reminder
                </DropdownMenuItem>
              )}
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

    <AlertDialog open={forwardConfirmOpen} onOpenChange={setForwardConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Forward lead to Sales?</AlertDialogTitle>
          <AlertDialogDescription>
            This hands the conversation to the Sales team. You will no longer
            see this chat in your WhatsApp inbox.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={forwardingToSales}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleForwardToSales();
            }}
            disabled={forwardingToSales}
          >
            {forwardingToSales ? "Forwarding…" : "Forward to Sales"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
});
