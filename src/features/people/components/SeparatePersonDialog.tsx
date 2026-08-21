"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SeparationReason =
  | "resigned"
  | "terminated"
  | "suspended"
  | "abscond";

const SEPARATION_REASON_LABELS: Record<SeparationReason, string> = {
  resigned: "Resigned",
  terminated: "Terminated",
  suspended: "Suspended",
  abscond: "Absconded",
};

export interface SeparatePersonDialogProps {
  candidateId?: string | null;
  employeeId?: string | null;
  employeeName?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: { error?: string } } })
      .response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }
  return fallback;
}

export function SeparatePersonDialog({
  candidateId,
  employeeId,
  employeeName,
  open,
  onClose,
  onSuccess,
}: SeparatePersonDialogProps) {
  const [reason, setReason] = useState<SeparationReason>("resigned");
  const [effectiveDate, setEffectiveDate] = useState(todayIsoDate);
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setReason("resigned");
    setEffectiveDate(todayIsoDate());
    setNotes("");
    setSendEmail(false);
  }, [open, candidateId, employeeId]);

  const handleConfirm = async () => {
    const resolvedCandidateId = candidateId?.trim() || "";
    const resolvedEmployeeId = employeeId?.trim() || "";

    if (!resolvedCandidateId && !resolvedEmployeeId) {
      toast.error("Missing candidate or employee id");
      return;
    }

    setSubmitting(true);
    try {
      if (resolvedCandidateId) {
        const response = await axios.post(
          `/api/candidates/${resolvedCandidateId}/exit`,
          {
            exitReason: reason,
            exitNotes: notes.trim() || undefined,
            effectiveDate: effectiveDate || undefined,
            sendEmail,
          }
        );

        if (!response.data?.success) {
          toast.error(response.data?.error || "Failed to mark as exited");
          return;
        }

        toast.success(
          `Moved to Exited (${SEPARATION_REASON_LABELS[reason]})`
        );
      } else {
        const response = await axios.post("/api/employee/separation", {
          employeeId: resolvedEmployeeId,
          separationType: reason,
          reason: notes.trim(),
          effectiveDate: effectiveDate || undefined,
          sendEmail,
        });

        if (!response.data?.success) {
          toast.error(response.data?.error || "Failed to process separation");
          return;
        }

        toast.success(
          response.data?.emailSent
            ? `Employee ${SEPARATION_REASON_LABELS[reason].toLowerCase()} and email sent`
            : `Employee ${SEPARATION_REASON_LABELS[reason].toLowerCase()}`
        );
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(getAxiosErrorMessage(error, "Failed to mark as exited"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Mark as Exited ({SEPARATION_REASON_LABELS[reason]})
          </DialogTitle>
          <DialogDescription>
            {employeeName
              ? `Move ${employeeName} from Employed to Exited as ${SEPARATION_REASON_LABELS[reason]}. Their employee login will be deactivated.`
              : "Move this person from Employed to Exited."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="separate-reason">Exit reason</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as SeparationReason)}
            >
              <SelectTrigger id="separate-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resigned">Resigned</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="abscond">Absconded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="separate-effective-date">Last working date</Label>
            <Input
              id="separate-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="separate-notes">Notes (optional)</Label>
            <Textarea
              id="separate-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason or handover notes…"
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-input"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Send exit acknowledgement email
          </label>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Confirm Exit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
