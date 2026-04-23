"use client";

import { useState } from "react";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneIncoming, XCircle, ShieldBan } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REJECTION_REASONS } from "@/util/offerConstants";
import type { OfferDoc } from "@/util/type";

export interface BulkResult {
  id: string;
  success: boolean;
  error?: string;
}

interface BulkActionBarProps {
  selectedOffers: OfferDoc[];
  onSuccess: () => void;
  onClear: () => void;
}

type ActiveDialog = "callback" | "reject" | "blacklist" | null;

async function runBulk(
  ids: string[],
  url: (id: string) => string,
  payload: object,
): Promise<BulkResult[]> {
  const results: BulkResult[] = [];
  await Promise.all(
    ids.map(async (id) => {
      try {
        await axios.post(url(id), payload);
        results.push({ id, success: true });
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed";
        results.push({ id, success: false, error: msg });
      }
    }),
  );
  return results;
}

export function BulkActionBar({ selectedOffers, onSuccess, onClear }: BulkActionBarProps) {
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [loading, setLoading] = useState(false);

  const ids = selectedOffers.map((o) => o._id);
  const count = ids.length;

  const handleBulk = async (url: (id: string) => string, payload: object, label: string) => {
    setLoading(true);
    const results = await runBulk(ids, url, payload);
    setLoading(false);
    const failed = results.filter((r) => !r.success);
    if (failed.length === 0) {
      toast({ title: `${label} applied to ${count} lead(s)` });
    } else {
      toast({
        title: `${label}: ${count - failed.length} succeeded, ${failed.length} failed`,
        variant: "destructive",
      });
    }
    onSuccess();
    onClear();
    setActiveDialog(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary">{count} selected</Badge>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={loading}
          onClick={() => setActiveDialog("callback")}
        >
          <PhoneIncoming size={12} className="mr-1" />
          Bulk Callback
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
          disabled={loading}
          onClick={() => setActiveDialog("reject")}
        >
          <XCircle size={12} className="mr-1" />
          Bulk Reject
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
          disabled={loading}
          onClick={() => setActiveDialog("blacklist")}
        >
          <ShieldBan size={12} className="mr-1" />
          Bulk Blacklist
        </Button>

        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          Clear
        </Button>

        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>

      {/* Bulk Callback Dialog */}
      <BulkCallbackDialog
        open={activeDialog === "callback"}
        count={count}
        onClose={() => setActiveDialog(null)}
        onConfirm={(date, time, note) =>
          handleBulk((id) => `/api/offers/${id}/callback`, { date, time, note }, "Callback")
        }
      />

      {/* Bulk Reject Dialog */}
      <BulkRejectDialog
        open={activeDialog === "reject"}
        count={count}
        onClose={() => setActiveDialog(null)}
        onConfirm={(reason, note) =>
          handleBulk((id) => `/api/offers/${id}/reject`, { reason, note }, "Reject")
        }
      />

      {/* Bulk Blacklist Dialog */}
      <BulkBlacklistDialog
        open={activeDialog === "blacklist"}
        count={count}
        onClose={() => setActiveDialog(null)}
        onConfirm={(reason, note) =>
          handleBulk((id) => `/api/offers/${id}/blacklist`, { reason, note }, "Blacklist")
        }
      />
    </>
  );
}

function BulkCallbackDialog({
  open, count, onClose, onConfirm,
}: { open: boolean; count: number; onClose: () => void; onConfirm: (date: string, time: string, note: string) => Promise<void> }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!date) return;
    setLoading(true);
    await onConfirm(date, time, note);
    setLoading(false);
    setDate(""); setTime(""); setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Callback ({count} leads)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading || !date}>
            {loading ? "Applying…" : `Apply to ${count} leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkRejectDialog({
  open, count, onClose, onConfirm,
}: { open: boolean; count: number; onClose: () => void; onConfirm: (reason: string, note: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason) return;
    setLoading(true);
    await onConfirm(reason, note);
    setLoading(false);
    setReason(""); setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Reject ({count} leads)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason…" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || !reason}>
            {loading ? "Rejecting…" : `Reject ${count} leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkBlacklistDialog({
  open, count, onClose, onConfirm,
}: { open: boolean; count: number; onClose: () => void; onConfirm: (reason: string, note: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason, note);
    setLoading(false);
    setReason(""); setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Blacklist ({count} leads)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Reason *</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || !reason.trim()}>
            {loading ? "Blacklisting…" : `Blacklist ${count} leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
