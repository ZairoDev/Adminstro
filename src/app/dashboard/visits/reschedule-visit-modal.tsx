"use client";

import { useState } from "react";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VisitInterface } from "@/util/type";
import { useVisitOverdue } from "@/components/visits/VisitOverdueContext";

interface RescheduleVisitModalProps {
  visit: VisitInterface | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function toLocalDateInputValue(date: Date | string | undefined): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLocalDateInput(): string {
  return toLocalDateInputValue(new Date());
}

export function RescheduleVisitModal({
  visit,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleVisitModalProps) {
  const { toast } = useToast();
  const { refresh } = useVisitOverdue();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && visit) {
      setDate(todayLocalDateInput());
      setTime(visit.schedule?.[0]?.time ?? "");
      setReason("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!visit) return;
    if (!date || !time) {
      toast({
        title: "Date and time are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await axios.patch(`/api/visits/${visit._id}/reschedule`, {
        date,
        time,
        reason: reason.trim() || undefined,
      });
      toast({ title: "Visit rescheduled" });
      onOpenChange(false);
      await refresh();
      onSuccess?.();
    } catch (error) {
      const apiMessage =
        axios.isAxiosError?.(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Unable to reschedule visit";
      toast({
        title: apiMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Visit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">New Date</Label>
            <Input
              id="reschedule-date"
              type="date"
              min={todayLocalDateInput()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reschedule-time">New Time</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reschedule-reason">Reason (optional)</Label>
            <Textarea
              id="reschedule-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this visit being rescheduled?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
