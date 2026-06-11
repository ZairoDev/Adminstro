"use client";

import { useState } from "react";
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
import { Loader2, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Conversation } from "../types";

type ReminderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  onCreated: (labels: string[]) => void;
};

export function ReminderDialog({
  open,
  onOpenChange,
  conversation,
  onCreated,
}: ReminderDialogProps) {
  const { toast } = useToast();
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!conversation) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp/reminders", {
        conversationId: conversation._id,
        scheduledAt: new Date(scheduledAt).toISOString(),
        note,
      });
      toast({ title: "Reminder set" });
      onCreated(res.data.labels || []);
      onOpenChange(false);
      setNote("");
      setScheduledAt("");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to create reminder";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#00a884]" />
            Set reminder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date & time</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Follow up about property options…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#00a884] hover:bg-[#008f6f]"
            disabled={loading || !scheduledAt || !note.trim()}
            onClick={submit}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
