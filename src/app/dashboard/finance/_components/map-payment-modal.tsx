"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { FinanceTransaction, GuestSuggestion } from "../_lib/types";

type MapPaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Pick<
    FinanceTransaction,
    | "paymentId"
    | "paymentLinkId"
    | "customerName"
    | "customerPhone"
    | "customerEmail"
    | "amount"
    | "currency"
    | "invoiceStatus"
  > | null;
  onMapped: () => void;
};

export default function MapPaymentModal({
  open,
  onOpenChange,
  transaction,
  onMapped,
}: MapPaymentModalProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<GuestSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GuestSuggestion | null>(null);
  const [reason, setReason] = useState("");
  const [confirmRemap, setConfirmRemap] = useState(false);

  const alreadyInvoiced =
    transaction?.invoiceStatus !== undefined &&
    transaction.invoiceStatus !== "not_generated";

  const loadSuggestions = useCallback(
    async (searchTerm?: string) => {
      if (!transaction) return;
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (transaction.paymentId) params.paymentId = transaction.paymentId;
        if (transaction.paymentLinkId) params.paymentLinkId = transaction.paymentLinkId;
        if (searchTerm) params.search = searchTerm;

        const { data } = await axios.get("/api/finance/map-suggestions", { params });
        if (data.success) setSuggestions(data.suggestions ?? []);
      } catch {
        toast({ title: "Failed to load suggestions", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [transaction, toast],
  );

  useEffect(() => {
    if (open && transaction) {
      setSelected(null);
      setSearch("");
      setReason("");
      setConfirmRemap(false);
      void loadSuggestions();
    }
  }, [open, transaction, loadSuggestions]);

  const handleMap = async () => {
    if (!transaction || !selected) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post("/api/finance/map-payment", {
        paymentId: transaction.paymentId ?? undefined,
        paymentLinkId: transaction.paymentLinkId ?? undefined,
        bookingId: selected.bookingId,
        guestId: selected.guestId,
        reason: reason || undefined,
        confirmRemap: alreadyInvoiced ? confirmRemap : undefined,
      });
      if (data.success) {
        toast({ title: "Payment mapped successfully" });
        onOpenChange(false);
        onMapped();
      } else {
        toast({ title: data.message ?? "Mapping failed", variant: "destructive" });
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; code?: string } } };
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message ?? "Mapping failed";
      if (code === "INVOICE_EXISTS") {
        toast({
          title: "Invoice already exists",
          description: "Tick 'Confirm remap' if you still want to reassign this payment.",
          variant: "destructive",
        });
      } else {
        toast({ title: message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confidenceLabel = (c: GuestSuggestion["confidence"]) => {
    if (c === "exact_phone") return "Exact phone";
    if (c === "name_email") return "Name / email";
    return "Search";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map Payment to Booking</DialogTitle>
        </DialogHeader>

        {transaction && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
            <div><span className="text-muted-foreground">Customer: </span>{transaction.customerName || "—"}</div>
            <div><span className="text-muted-foreground">Phone: </span>{transaction.customerPhone || "—"}</div>
            <div><span className="text-muted-foreground">Email: </span>{transaction.customerEmail || "—"}</div>
            <div><span className="text-muted-foreground">Amount: </span>{transaction.currency} {transaction.amount}</div>
          </div>
        )}

        {alreadyInvoiced && (
          <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
            An invoice has already been generated for this payment. Remapping will not automatically
            update or void the existing invoice — you should regenerate it from the transaction page
            after remapping.
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="map-search">Search guests</Label>
            <Input
              id="map-search"
              placeholder="Booking ID, guest name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void loadSuggestions(search); }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadSuggestions(search)}
            disabled={loading}
          >
            Search
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Suggestions</Label>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches. Try searching by booking ID, email or phone.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suggestions.map((s) => {
                const key = `${s.bookingObjectId}-${s.guestId}`;
                const isSelected = selected?.guestId === s.guestId && selected?.bookingId === s.bookingId;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={`w-full text-left rounded-md border p-3 text-sm transition ${
                      isSelected ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium">{s.guestName || "Unnamed guest"}</div>
                    <div className="text-muted-foreground">
                      Booking {s.bookingId}{s.propertyName ? ` · ${s.propertyName}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.guestPhone || "—"} · {s.guestEmail || "—"} · {confidenceLabel(s.confidence)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="map-reason">Reason / note (optional)</Label>
          <Textarea
            id="map-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>

        {alreadyInvoiced && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={confirmRemap}
              onChange={(e) => setConfirmRemap(e.target.checked)}
              className="rounded"
            />
            <span>I understand this payment already has an invoice — confirm remap</span>
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => void handleMap()}
            disabled={!selected || submitting || (alreadyInvoiced && !confirmRemap)}
          >
            {submitting ? "Mapping…" : "Confirm mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
