"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  WHATSAPP_DISPOSITION_ACTIONS,
  type WhatsAppDispositionAction,
} from "@/lib/whatsapp/crmLabels";
import type { Conversation } from "../types";

type DispositionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  onApplied: (labels: string[]) => void;
};

export function DispositionDialog({
  open,
  onOpenChange,
  conversation,
  onApplied,
}: DispositionDialogProps) {
  const { toast } = useToast();
  const [action, setAction] = useState<WhatsAppDispositionAction | "">("");
  const [reason, setReason] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [leadInfo, setLeadInfo] = useState<{
    _id?: string;
    name?: string;
    leadStatus?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (!open || !conversation) return;
    setAction("");
    setReason("");
    setCustomLabel("");
    setReminderAt("");
    setLookupLoading(true);
    axios
      .get("/api/whatsapp/leads/lookup", {
        params: { phone: conversation.participantPhone },
      })
      .then((res) => setLeadInfo(res.data?.lead || null))
      .finally(() => setLookupLoading(false));
  }, [open, conversation]);

  const selected = WHATSAPP_DISPOSITION_ACTIONS.find((a) => a.action === action);

  const submit = async () => {
    if (!conversation || !action) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp/disposition", {
        conversationId: conversation._id,
        action,
        reason: reason || undefined,
        customLabel: customLabel || undefined,
        reminderAt: action === "set_reminder" ? reminderAt : undefined,
        leadId: leadInfo?._id,
      });
      toast({ title: "Disposition updated" });
      onApplied(res.data.labels || []);
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
            {leadInfo && (
              <p className="text-sm text-muted-foreground">
                CRM: {leadInfo.name || "Lead"} · Status: {leadInfo.leadStatus || "—"}
              </p>
            )}
            {!leadInfo && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No CRM lead matched this phone — disposition will update conversation labels only.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {WHATSAPP_DISPOSITION_ACTIONS.map((item) => (
                <Button
                  key={item.action}
                  type="button"
                  variant={action === item.action ? "default" : "outline"}
                  className={
                    action === item.action
                      ? "bg-[#00a884] hover:bg-[#008f6f] text-white"
                      : ""
                  }
                  onClick={() => setAction(item.action)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            {selected?.requiresReason && action !== "set_reminder" && (
              <div>
                <Label>Reason</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
              </div>
            )}

            {action === "set_reminder" && (
              <div>
                <Label>Reminder date & time</Label>
                <Input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                />
              </div>
            )}

            {action === "custom" && (
              <div>
                <Label>Custom label</Label>
                <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
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
            disabled={!action || loading}
            onClick={submit}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
