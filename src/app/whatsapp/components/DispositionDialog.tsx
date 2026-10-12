"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/util/axios";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LEAD_DECLINE_REASONS,
  LEAD_REJECTION_REASONS,
} from "@/lib/leads/dispositionReasons";
import {
  dispositionRequiresLeadQuality,
  formatLeadStatusLabel,
  LEAD_QUALITY_BY_REVIEWER_OPTIONS,
  primaryDispositionActionsForLeadStatus,
  type CoreWhatsAppDispositionAction,
} from "@/lib/leads/leadDisposition";
import {
  CORE_WHATSAPP_DISPOSITION_ACTIONS,
} from "@/lib/whatsapp/crmLabels";
import type { LeadLookupResult } from "@/lib/whatsapp/leadLookupService";
import type { Conversation } from "../types";

export type DispositionAppliedResult = {
  labels: string[];
  lead: LeadLookupResult | null;
  previousLeadStatus: string | null;
  leadStatus: string;
};

type DispositionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  initialAction?: CoreWhatsAppDispositionAction;
  onApplied: (result: DispositionAppliedResult) => void;
};

export function DispositionDialog({
  open,
  onOpenChange,
  conversation,
  initialAction,
  onApplied,
}: DispositionDialogProps) {
  const { toast } = useToast();
  const [action, setAction] = useState<CoreWhatsAppDispositionAction | "">("");
  const [reason, setReason] = useState("");
  const [leadQuality, setLeadQuality] = useState("");
  const [leadInfo, setLeadInfo] = useState<LeadLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (!open || !conversation) return;

    setLookupLoading(true);
    axios
      .get("/api/whatsapp/leads/lookup", {
        params: { phone: conversation.participantPhone },
      })
      .then((res) => {
        const lead = (res.data?.lead as LeadLookupResult | null) ?? null;
        setLeadInfo(lead);
        setLeadQuality(lead?.leadQualityByReviewer || "");

        const suggested = primaryDispositionActionsForLeadStatus(
          lead?.leadStatus,
        );
        const nextAction =
          initialAction && suggested.includes(initialAction)
            ? initialAction
            : suggested[0] ?? initialAction ?? "";
        setAction(nextAction);
        setReason("");
      })
      .finally(() => setLookupLoading(false));
  }, [open, conversation, initialAction]);

  const selected = CORE_WHATSAPP_DISPOSITION_ACTIONS.find(
    (item) => item.action === action,
  );

  const visibleActions = useMemo(() => {
    const allowed = new Set(
      primaryDispositionActionsForLeadStatus(leadInfo?.leadStatus),
    );
    return CORE_WHATSAPP_DISPOSITION_ACTIONS.filter((item) =>
      allowed.has(item.action),
    );
  }, [leadInfo?.leadStatus]);

  const reasonOptions = useMemo(() => {
    if (action === "decline_lead") return [...LEAD_DECLINE_REASONS];
    if (action === "reject_lead") return [...LEAD_REJECTION_REASONS];
    return [];
  }, [action]);

  const needsCrmLead = Boolean(leadInfo?._id);
  const needsQuality =
    needsCrmLead &&
    Boolean(action) &&
    dispositionRequiresLeadQuality(action as CoreWhatsAppDispositionAction);
  const needsReason = selected?.requiresReason ?? false;

  const canSubmit = useMemo(() => {
    if (!action || loading) return false;
    if (needsQuality && !leadQuality.trim()) return false;
    if (needsReason && !reason.trim()) return false;
    return true;
  }, [action, loading, needsQuality, leadQuality, needsReason, reason]);

  const submit = async () => {
    if (!conversation || !action) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp/disposition", {
        conversationId: conversation._id,
        action,
        reason: reason || undefined,
        leadId: leadInfo?._id,
        leadQualityByReviewer: leadQuality || undefined,
      });
      toast({ title: "Disposition updated" });
      onApplied({
        labels: res.data.labels || [],
        lead: res.data.lead ?? null,
        previousLeadStatus: res.data.previousLeadStatus ?? null,
        leadStatus: res.data.leadStatus ?? "",
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to update disposition";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead disposition</DialogTitle>
        </DialogHeader>

        {lookupLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {leadInfo ? (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {leadInfo.name || "CRM lead"}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Page: {formatLeadStatusLabel(leadInfo.leadStatus)}
                  {leadInfo.rejectionReason
                    ? ` · ${leadInfo.rejectionReason}`
                    : leadInfo.reason
                      ? ` · ${leadInfo.reason}`
                      : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No CRM lead matched this phone — only conversation labels will
                update.
              </p>
            )}

            {needsQuality && (
              <div className="space-y-2">
                <Label>Lead review (required)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LEAD_QUALITY_BY_REVIEWER_OPTIONS.map((quality) => (
                    <Button
                      key={quality}
                      type="button"
                      size="sm"
                      variant={leadQuality === quality ? "default" : "outline"}
                      className={
                        leadQuality === quality
                          ? "bg-[#00a884] hover:bg-[#008f6f] text-white"
                          : ""
                      }
                      onClick={() => setLeadQuality(quality)}
                    >
                      {quality}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {visibleActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No disposition actions are available for this lead status.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Action</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {visibleActions.map((item) => (
                    <Button
                      key={item.action}
                      type="button"
                      variant={action === item.action ? "default" : "outline"}
                      className={
                        action === item.action
                          ? "bg-[#00a884] hover:bg-[#008f6f] text-white"
                          : ""
                      }
                      onClick={() => {
                        setAction(item.action);
                        setReason("");
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {reasonOptions.length > 0 && (
              <div className="space-y-2">
                <Label>
                  {action === "decline_lead"
                    ? "Decline reason"
                    : "Rejection reason"}
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#00a884] hover:bg-[#008f6f]"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
