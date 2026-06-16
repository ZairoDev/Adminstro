"use client";

import { useState, useEffect } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Repeat,
  MoreHorizontal,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";

const LABEL_COLORS: Record<string, string> = {
  "Good To Go":
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  Declined:
    "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  "Visit Scheduled":
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "Reminder Set":
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  Future:
    "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  "Low Budget":
    "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/30",
  Blocked:
    "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

const DISPOSITION_LABELS = [
  "Good To Go",
  "Rejected",
  "Declined",
  "Future",
  "Low Budget",
  "Blocked",
];

const LEAD_ACTIONS: Array<{
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  onClick: "disposition" | "reminder";
}> = [
  {
    id: "reject",
    label: "Reject Lead",
    icon: XCircle,
    color: "text-red-500",
    onClick: "disposition",
  },
  {
    id: "decline",
    label: "Decline Lead",
    icon: ThumbsDown,
    color: "text-orange-500",
    onClick: "disposition",
  },
  {
    id: "good-to-go",
    label: "Good To Go",
    icon: CheckCircle2,
    color: "text-emerald-500",
    onClick: "disposition",
  },
  {
    id: "reminder",
    label: "Set Reminder",
    icon: Bell,
    color: "text-violet-500",
    onClick: "reminder",
  },
  {
    id: "future",
    label: "Future Follow Up",
    icon: Repeat,
    color: "text-amber-500",
    onClick: "disposition",
  },
  {
    id: "found",
    label: "Already Found",
    icon: Home,
    color: "text-blue-500",
    onClick: "disposition",
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
  onClose: () => void;
  onOpenDisposition: () => void;
  onOpenSetVisit: () => void;
  onOpenReminder: () => void;
  onLabelsUpdated?: (labels: string[]) => void;
  className?: string;
}

export function CrmPanel({
  isOpen = true,
  conversation,
  onClose,
  onOpenDisposition,
  onOpenSetVisit,
  onOpenReminder,
  onLabelsUpdated,
  className,
}: CrmPanelProps) {
  const [activeTab, setActiveTab] = useState<"crm" | "details" | "notes">(
    "crm",
  );
  const [sharedProperties, setSharedProperties] = useState<SharedProperty[]>(
    [],
  );
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [vsidSearch, setVsidSearch] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const conversationId = conversation?._id;

  useEffect(() => {
    setLabels(conversation?.labels ?? []);
  }, [conversation?.labels]);

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

  const currentDisposition = labels.find((l) =>
    DISPOSITION_LABELS.includes(l),
  );

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
              {currentDisposition ? (
                <button
                  type="button"
                  onClick={onOpenDisposition}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer transition-opacity hover:opacity-80",
                    LABEL_COLORS[currentDisposition] ??
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {currentDisposition}
                  <ChevronRight className="h-3 w-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenDisposition}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border border-dashed border-[#d1d5db] dark:border-[#374045] text-[#8696a0] hover:border-[#008069] hover:text-[#008069] transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Set Status
                </button>
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
                  onClick={onOpenDisposition}
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
                      LABEL_COLORS[label] ??
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
                  onClick={onOpenDisposition}
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
                {LEAD_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={
                        action.onClick === "reminder"
                          ? onOpenReminder
                          : onOpenDisposition
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
                <button
                  type="button"
                  onClick={onOpenDisposition}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl",
                    "bg-[#f0f2f5] dark:bg-[#202c33]",
                    "hover:bg-[#e9edef] dark:hover:bg-[#2a3942]",
                    "transition-colors cursor-pointer text-center",
                  )}
                >
                  <MoreHorizontal className="h-4 w-4 text-[#8696a0]" />
                  <span className="text-[10px] font-medium text-[#54656f] dark:text-[#aebac1] leading-tight">
                    More Actions
                  </span>
                </button>
              </div>
            </section>

            <Separator className="bg-[#f0f2f5] dark:bg-[#222d34]" />

            {/* Visit */}
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
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] text-[#8696a0]">Notes coming soon</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
