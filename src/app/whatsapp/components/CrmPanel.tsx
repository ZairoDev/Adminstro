"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CoreWhatsAppDispositionAction } from "@/lib/leads/leadDisposition";
import type { LeadLookupResult } from "@/lib/whatsapp/leadLookupService";
import {
  formatLeadStatusLabel,
  normalizeLeadStatus,
  primaryDispositionActionsForLeadStatus,
} from "@/lib/leads/leadDisposition";
import {
  CRM_LABEL_CHIP_COLORS,
  PRIMARY_DISPOSITION_CRM_LABELS,
  primaryDispositionLabelsForLeadStatus,
} from "@/lib/whatsapp/crmLabels";
import {
  X,
  Plus,
  Calendar,
  Home,
  ExternalLink,
  Search,
  ThumbsDown,
  CheckCircle2,
  Bell,
  XCircle,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import type { WhatsAppPhoneConfig } from "@/lib/whatsapp/config";
import {
  formatPhoneDisplayWithLocation,
  getPhoneConfigById,
} from "@/lib/whatsapp/config";

function primaryLabelsOnConversation(labelList: string[]): string[] {
  const allowed = new Set<string>(PRIMARY_DISPOSITION_CRM_LABELS);
  return labelList.filter((label) => allowed.has(label));
}

function sameLabelSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

const LEAD_ACTIONS: Array<{
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  dispositionAction?: CoreWhatsAppDispositionAction;
  onClick: "disposition" | "reminder";
}> = [
  {
    id: "good-to-go",
    label: "Good To Go",
    icon: CheckCircle2,
    color: "text-emerald-500",
    dispositionAction: "good_to_go",
    onClick: "disposition",
  },
  {
    id: "reject",
    label: "Reject",
    icon: XCircle,
    color: "text-red-500",
    dispositionAction: "reject_lead",
    onClick: "disposition",
  },
  {
    id: "decline",
    label: "Decline",
    icon: ThumbsDown,
    color: "text-orange-500",
    dispositionAction: "decline_lead",
    onClick: "disposition",
  },
  {
    id: "revert-fresh",
    label: "Revert to Fresh",
    icon: RotateCcw,
    color: "text-sky-500",
    dispositionAction: "revert_to_fresh",
    onClick: "disposition",
  },
  {
    id: "reminder",
    label: "Set Reminder",
    icon: Bell,
    color: "text-violet-500",
    onClick: "reminder",
  },
];

interface SharedProperty {
  propertyId: string;
  vsid?: string;
  title?: string;
  image?: string;
  city?: string;
  basePrice?: number;
  url?: string;
  owner?: { name?: string } | null;
}

interface CrmPanelProps {
  isOpen?: boolean;
  conversation: Conversation | null;
  availablePhoneConfigs?: WhatsAppPhoneConfig[];
  onClose: () => void;
  onOpenDisposition: (action?: CoreWhatsAppDispositionAction) => void;
  onOpenSetVisit: () => void;
  onOpenReminder: () => void;
  onLabelsUpdated?: (labels: string[]) => void;
  onLeadUpdated?: (lead: LeadLookupResult | null) => void;
  className?: string;
}

export function CrmPanel({
  isOpen = true,
  conversation,
  availablePhoneConfigs = [],
  onClose,
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
  onLabelsUpdated,
  onLeadUpdated,
  className,
}: CrmPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"crm" | "details" | "notes">(
    "crm",
  );
  const [sharedProperties, setSharedProperties] = useState<SharedProperty[]>(
    [],
  );
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [vsidSearch, setVsidSearch] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [leadInfo, setLeadInfo] = useState<LeadLookupResult | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [chatNote, setChatNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const conversationId = conversation?._id;

  const fetchLeadInfo = useCallback(async () => {
    if (!conversation?.participantPhone) {
      setLeadInfo(null);
      return;
    }
    setLeadLoading(true);
    try {
      const res = await axios.get("/api/whatsapp/leads/lookup", {
        params: { phone: conversation.participantPhone },
      });
      const lead = (res.data?.lead as LeadLookupResult | null) ?? null;
      setLeadInfo(lead);
      onLeadUpdated?.(lead);

      if (lead?._id && conversationId) {
        const expected = primaryDispositionLabelsForLeadStatus(lead.leadStatus);
        const currentPrimary = primaryLabelsOnConversation(
          conversation?.labels ?? [],
        );
        if (!sameLabelSet(expected, currentPrimary)) {
          try {
            const syncRes = await axios.patch(
              `/api/whatsapp/conversations/${conversationId}/labels`,
              { syncFromLeadStatus: lead.leadStatus ?? "fresh" },
            );
            const synced: string[] = syncRes.data?.labels ?? [];
            setLabels(synced);
            onLabelsUpdated?.(synced);
          } catch {
            // Non-critical — CRM status still reflects lead record
          }
        }
      }
    } catch {
      setLeadInfo(null);
    } finally {
      setLeadLoading(false);
    }
  }, [conversation?.participantPhone, conversation?.labels, conversationId, onLabelsUpdated, onLeadUpdated]);

  useEffect(() => {
    setLabels(conversation?.labels ?? []);
    setChatNote(conversation?.notes ?? "");
  }, [conversation?.labels, conversation?.notes]);

  useEffect(() => {
    if (!isOpen || !conversation?.participantPhone) {
      setLeadInfo(null);
      return;
    }
    void fetchLeadInfo();
  }, [isOpen, conversation?.participantPhone, fetchLeadInfo]);

  useEffect(() => {
    if (!isOpen || !conversationId) {
      setSharedProperties([]);
      setLoadingProperties(false);
      return;
    }
    let cancelled = false;
    setLoadingProperties(true);
    axios
      .get(`/api/whatsapp/conversations/${conversationId}/shared-properties`)
      .then((res) => {
        if (!cancelled) setSharedProperties(res.data?.properties ?? []);
      })
      .catch(() => {
        if (!cancelled) setSharedProperties([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProperties(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, conversationId]);

  const handleRemoveLabel = async (label: string) => {
    if (!conversationId) return;
    const prev = labels;
    const next = prev.filter((x) => x !== label);
    setLabels(next);
    try {
      const res = await axios.patch(
        `/api/whatsapp/conversations/${conversationId}/labels`,
        { remove: label },
      );
      const updated: string[] = res.data?.labels ?? next;
      setLabels(updated);
      onLabelsUpdated?.(updated);
    } catch {
      setLabels(prev);
    }
  };

  const handleSaveNote = async () => {
    const trimmed = noteValue.trim();
    if (!trimmed) return;

    setSavingNote(true);
    try {
      if (leadInfo?._id) {
        const res = await axios.post("/api/sales/createNote", {
          id: leadInfo._id,
          note: trimmed,
        });
        const updated = res.data?.data as LeadLookupResult | undefined;
        if (updated?._id) {
          setLeadInfo(updated);
          onLeadUpdated?.(updated);
        }
        setNoteValue("");
        toast({ title: "Note saved to CRM lead" });
        return;
      }

      if (!conversationId) return;
      await axios.post(`/api/whatsapp/conversations/${conversationId}/meta`, {
        notes: trimmed,
      });
      setChatNote(trimmed);
      setNoteValue("");
      toast({ title: "Chat note saved" });
    } catch {
      toast({
        title: "Could not save note",
        variant: "destructive",
      });
    } finally {
      setSavingNote(false);
    }
  };

  const crmLeadStatus = leadInfo?.leadStatus;
  const crmReason = leadInfo?.rejectionReason || leadInfo?.reason;
  const normalizedLeadStatus = normalizeLeadStatus(crmLeadStatus);

  const statusChipLabel = useMemo(() => {
    if (leadInfo) {
      if (normalizedLeadStatus === "fresh") return "Fresh";
      return formatLeadStatusLabel(crmLeadStatus);
    }
    const fromLabels = labels.find((label) =>
      (PRIMARY_DISPOSITION_CRM_LABELS as readonly string[]).includes(label),
    );
    return fromLabels ?? null;
  }, [leadInfo, normalizedLeadStatus, crmLeadStatus, labels]);

  const canScheduleVisit =
    normalizedLeadStatus === "active" || labels.includes("Visit Scheduled");

  const visibleLeadActions = useMemo(() => {
    const allowed = new Set(
      primaryDispositionActionsForLeadStatus(crmLeadStatus),
    );
    return LEAD_ACTIONS.filter(
      (item) =>
        item.onClick === "reminder" ||
        (item.dispositionAction &&
          allowed.has(item.dispositionAction)),
    );
  }, [crmLeadStatus]);

  if (!conversation) return null;

  const tabs: Array<{ id: "crm" | "details" | "notes"; label: string }> = [
    { id: "crm", label: "CRM" },
    { id: "details", label: "Details" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col h-full border-l border-[#e9edef] dark:border-[#222d34]",
        "bg-white dark:bg-[#111b21]",
        className,
      )}
    >
      {/* Panel header: tabs + close */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#e9edef] dark:border-[#222d34] flex-shrink-0 bg-[#f0f2f5] dark:bg-[#202c33]">
        <div className="flex flex-1 items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors",
                activeTab === tab.id
                  ? "bg-white dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] shadow-sm"
                  : "text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#aebac1]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full text-[#8696a0] hover:text-[#54656f] dark:hover:text-[#aebac1] hover:bg-white/60 dark:hover:bg-[#111b21]/60 flex-shrink-0"
          aria-label="Close CRM panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        {/* ──── CRM Tab ──── */}
        {activeTab === "crm" && (
          <div className="px-4 py-3 space-y-4">
            {/* Lead Status */}
            <section className="space-y-2">
              <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                Lead Status
              </p>
              {leadLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-[#8696a0]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Syncing CRM…
                </div>
              ) : (
                <div className="space-y-1.5">
                  {leadInfo && (
                    <p className="text-[12px] text-[#54656f] dark:text-[#aebac1]">
                      CRM page:{" "}
                      <span className="font-medium">
                        {formatLeadStatusLabel(crmLeadStatus)}
                      </span>
                      {leadInfo.leadQualityByReviewer
                        ? ` · Review: ${leadInfo.leadQualityByReviewer}`
                        : ""}
                      {crmReason ? ` · ${crmReason}` : ""}
                    </p>
                  )}
                  {statusChipLabel ? (
                    <button
                      type="button"
                      onClick={() => onOpenDisposition()}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer transition-opacity hover:opacity-80",
                        CRM_LABEL_CHIP_COLORS[statusChipLabel] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {statusChipLabel}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenDisposition()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border border-dashed border-[#d1d5db] dark:border-[#374045] text-[#8696a0] hover:border-[#008069] hover:text-[#008069] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Set Status
                    </button>
                  )}
                </div>
              )}
            </section>

            <Separator className="bg-[#f0f2f5] dark:bg-[#222d34]" />

            {/* Labels */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                  Labels
                </p>
                <button
                  type="button"
                  onClick={() => onOpenDisposition()}
                  className="text-[11px] text-[#008069] hover:opacity-80 transition-opacity"
                >
                  Manage
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => (
                  <span
                    key={label}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                      CRM_LABEL_CHIP_COLORS[label] ??
                        "bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#aebac1] border-transparent",
                    )}
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => void handleRemoveLabel(label)}
                      className="hover:opacity-60 transition-opacity ml-0.5"
                      aria-label={`Remove ${label} label`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onOpenDisposition()}
                  className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-dashed border-[#8696a0] text-[#8696a0] hover:border-[#008069] hover:text-[#008069] transition-colors"
                  aria-label="Add label"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </section>

            <Separator className="bg-[#f0f2f5] dark:bg-[#222d34]" />

            {/* Lead Actions */}
            <section className="space-y-2">
              <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                Lead Actions
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {visibleLeadActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={
                        action.onClick === "reminder"
                          ? onOpenReminder
                          : () =>
                              onOpenDisposition(action.dispositionAction)
                      }
                      className={cn(
                        "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl",
                        "bg-[#f0f2f5] dark:bg-[#202c33]",
                        "hover:bg-[#e9edef] dark:hover:bg-[#2a3942]",
                        "transition-colors cursor-pointer text-center",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", action.color)} />
                      <span className="text-[10px] font-medium text-[#54656f] dark:text-[#aebac1] leading-tight">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator className="bg-[#f0f2f5] dark:bg-[#222d34]" />

            {canScheduleVisit && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                  Visit
                </p>
                <button
                  type="button"
                  onClick={onOpenSetVisit}
                  className="text-[11px] text-[#008069] hover:opacity-80 transition-opacity"
                >
                  {labels.includes("Visit Scheduled") ? "Edit" : "Schedule"}
                </button>
              </div>
              {labels.includes("Visit Scheduled") ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f0f2f5] dark:bg-[#202c33]">
                  <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                      Visit Scheduled
                    </p>
                    <button
                      type="button"
                      onClick={onOpenSetVisit}
                      className="text-[11px] text-[#008069] hover:opacity-80 mt-0.5"
                    >
                      View &amp; edit details →
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSetVisit}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#d1d5db] dark:border-[#374045] text-[#8696a0] hover:border-[#008069] hover:text-[#008069] transition-colors"
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[12px]">Schedule a Visit</span>
                </button>
              )}
            </section>
            )}

            <Separator className="bg-[#f0f2f5] dark:bg-[#222d34]" />

            {/* Shared Properties */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                  Shared Properties
                </p>
                {sharedProperties.length > 1 && (
                  <button
                    type="button"
                    className="text-[11px] text-[#008069] hover:opacity-80 transition-opacity"
                  >
                    View All ({sharedProperties.length})
                  </button>
                )}
              </div>

              {loadingProperties ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] animate-pulse"
                    />
                  ))}
                </div>
              ) : sharedProperties.length > 0 ? (
                <div className="space-y-2">
                  {sharedProperties.slice(0, 2).map((prop) => (
                    <div
                      key={prop.propertyId}
                      className="flex gap-2.5 p-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] transition-colors"
                    >
                      {prop.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prop.image}
                          alt={prop.title ?? "Property"}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#d9fdd3] dark:bg-[#005c4b] flex items-center justify-center flex-shrink-0">
                          <Home className="h-5 w-5 text-[#008069]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                          {prop.title ?? prop.vsid ?? "Property"}
                        </p>
                        {(prop.vsid ?? prop.city) ? (
                          <p className="text-[10px] text-[#8696a0] truncate">
                            {[prop.vsid, prop.city].filter(Boolean).join(" • ")}
                          </p>
                        ) : null}
                        {prop.owner?.name ? (
                          <p className="text-[10px] text-[#8696a0] truncate">
                            Owner: {prop.owner.name}
                          </p>
                        ) : null}
                        {prop.basePrice ? (
                          <p className="text-[11px] font-semibold text-[#008069]">
                            €{prop.basePrice.toLocaleString()} / month
                          </p>
                        ) : null}
                      </div>
                      {prop.url ? (
                        <a
                          href={prop.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 self-start mt-0.5 text-[#8696a0] hover:text-[#008069] transition-colors"
                          aria-label="Open property"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#8696a0] py-1">
                  No properties shared yet
                </p>
              )}

              {/* VSID Search */}
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8696a0] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search property by VSID"
                  value={vsidSearch}
                  onChange={(e) => setVsidSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl border border-transparent focus:border-[#008069] focus:outline-none text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] transition-colors"
                />
              </div>
            </section>
          </div>
        )}

        {/* ──── Details Tab ──── */}
        {activeTab === "details" && (
          <div className="px-4 py-3 space-y-1">
            {(
              [
                {
                  label: "CRM status",
                  value: leadInfo
                    ? `${formatLeadStatusLabel(crmLeadStatus)}${crmReason ? ` (${crmReason})` : ""}`
                    : undefined,
                },
                {
                  label: "Biz line",
                  value: (() => {
                    const phoneId = conversation.businessPhoneId?.trim();
                    if (!phoneId) return undefined;
                    const config =
                      availablePhoneConfigs.find(
                        (c) => c.phoneNumberId === phoneId,
                      ) || getPhoneConfigById(phoneId);
                    if (config) return formatPhoneDisplayWithLocation(config);
                    return phoneId;
                  })(),
                },
                {
                  label: "Location",
                  value: conversation.participantLocation,
                },
                { label: "Type", value: conversation.conversationType },
                { label: "Rental", value: conversation.rentalType },
                {
                  label: "Phone",
                  value: conversation.participantPhone,
                  mono: true,
                },
                {
                  label: "Labels",
                  value:
                    conversation.labels?.join(", ") || undefined,
                },
                ...(conversation.handedToSales === true
                  ? [
                      {
                        label: "Forwarded",
                        value: conversation.handedToSalesByName?.trim()
                          ? `By ${conversation.handedToSalesByName.trim()}`
                          : "By LeadGen",
                      },
                      {
                        label: "At",
                        value: conversation.handedToSalesAt
                          ? new Date(
                              conversation.handedToSalesAt,
                            ).toLocaleString()
                          : undefined,
                      },
                    ]
                  : []),
              ] as Array<{
                label: string;
                value: string | undefined;
                mono?: boolean;
              }>
            )
              .filter((r) => Boolean(r.value))
              .map(({ label, value, mono }) => (
                <div key={label} className="flex items-start gap-3 py-1.5">
                  <span className="text-[12px] text-[#8696a0] w-20 flex-shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] text-[#111b21] dark:text-[#e9edef] flex-1 min-w-0 break-all",
                      mono && "font-mono text-[12px]",
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            {conversation.lastCustomerMessageAt ? (
              <div className="flex items-start gap-3 py-1.5">
                <span className="text-[12px] text-[#8696a0] w-20 flex-shrink-0 pt-0.5">
                  Last msg
                </span>
                <span className="text-[13px] text-[#111b21] dark:text-[#e9edef]">
                  {new Date(
                    conversation.lastCustomerMessageAt,
                  ).toLocaleDateString()}
                </span>
              </div>
            ) : null}
            {conversation.referenceLink ? (
              <div className="flex items-start gap-3 py-1.5">
                <span className="text-[12px] text-[#8696a0] w-20 flex-shrink-0 pt-0.5">
                  Link
                </span>
                <a
                  href={conversation.referenceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[#008069] hover:underline flex items-center gap-1 min-w-0 flex-1"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{conversation.referenceLink}</span>
                </a>
              </div>
            ) : null}
          </div>
        )}

        {/* ──── Notes Tab ──── */}
        {activeTab === "notes" && (
          <div className="px-4 py-3 space-y-4">
            {leadInfo ? (
              <p className="text-[12px] text-[#8696a0]">
                Notes sync to CRM lead{" "}
                <span className="font-medium text-[#54656f] dark:text-[#aebac1]">
                  {leadInfo.name || leadInfo.phoneNo}
                </span>{" "}
                and appear on lead dashboards.
              </p>
            ) : (
              <p className="text-[12px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                No CRM lead linked — notes save to this chat only.
              </p>
            )}

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                Add note
              </p>
              <Textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Write a note about this conversation…"
                rows={3}
                className="text-[13px] resize-none bg-[#f0f2f5] dark:bg-[#202c33] border-transparent"
              />
              <Button
                size="sm"
                className="bg-[#008069] hover:bg-[#006e5a] text-white"
                disabled={!noteValue.trim() || savingNote}
                onClick={() => void handleSaveNote()}
              >
                {savingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save note"
                )}
              </Button>
            </div>

            {leadInfo?.note && leadInfo.note.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                  CRM notes
                </p>
                <div className="space-y-2">
                  {[...leadInfo.note].reverse().map((entry, index) => (
                    <div
                      key={`${entry.createOn}-${index}`}
                      className="rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] px-3 py-2"
                    >
                      <p className="text-[13px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap">
                        {entry.noteData}
                      </p>
                      <p className="text-[10px] text-[#8696a0] mt-1">
                        {[entry.createdBy, entry.createOn]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!leadInfo && chatNote ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wide">
                  Chat note
                </p>
                <div className="rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] px-3 py-2">
                  <p className="text-[13px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap">
                    {chatNote}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
