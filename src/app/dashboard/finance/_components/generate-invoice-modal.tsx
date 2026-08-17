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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Trash2, PlusCircle } from "lucide-react";
import type { FinanceInvoiceRow } from "../_lib/types";

type Classification = "complete" | "partial" | "split";

type BookingGuest = {
  guestId: string;
  name: string;
  email: string;
  phone: string;
  amountDue: number;
};

type BookingStayInfo = {
  bookingId: string;
  propertyName: string | null;
  propertyAddress: string | null;
  checkIn: string | null;
  checkOut: string | null;
};

function formatStayDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

type SplitRow = {
  key: string;
  guestId?: string;
  name: string;
  email: string;
  phone: string;
  amount: string;
};

type GenerateInvoiceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId?: string | null;
  paymentLinkId?: string | null;
  bookingId?: string | null;
  currency: string;
  paymentAmount: number;
  invoiceStatus: string;
  onGenerated: (invoices: FinanceInvoiceRow[]) => void;
};

function newSplitRow(): SplitRow {
  return { key: Math.random().toString(36).slice(2), name: "", email: "", phone: "", amount: "" };
}

export default function GenerateInvoiceModal({
  open,
  onOpenChange,
  paymentId,
  paymentLinkId,
  bookingId,
  currency,
  paymentAmount,
  invoiceStatus,
  onGenerated,
}: GenerateInvoiceModalProps) {
  const { toast } = useToast();
  const [classification, setClassification] = useState<Classification>("complete");
  const [discountReason, setDiscountReason] = useState("");
  const [notes, setNotes] = useState("");
  const [splitRows, setSplitRows] = useState<SplitRow[]>([newSplitRow(), newSplitRow()]);
  const [guestOptions, setGuestOptions] = useState<BookingGuest[]>([]);
  const [bookingInfo, setBookingInfo] = useState<BookingStayInfo | null>(null);
  const [manualCheckIn, setManualCheckIn] = useState("");
  const [manualCheckOut, setManualCheckOut] = useState("");
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isRegenerate = invoiceStatus !== "not_generated";
  const needsManualStayDates =
    !!bookingInfo && (!bookingInfo.checkIn || !bookingInfo.checkOut);

  const loadGuests = useCallback(async () => {
    if (!bookingId) return;
    setLoadingGuests(true);
    try {
      const { data } = await axios.get("/api/finance/booking-guests", {
        params: { bookingId },
      });
      if (data.success) {
        setGuestOptions(data.guests ?? []);
        setBookingInfo(data.booking ?? null);
      }
    } catch {
      toast({ title: "Could not load booking guests", variant: "destructive" });
    } finally {
      setLoadingGuests(false);
    }
  }, [bookingId, toast]);

  useEffect(() => {
    if (open) {
      setClassification("complete");
      setDiscountReason("");
      setNotes("");
      setSplitRows([newSplitRow(), newSplitRow()]);
      setBookingInfo(null);
      setManualCheckIn("");
      setManualCheckOut("");
      if (bookingId) void loadGuests();
    }
  }, [open, bookingId, loadGuests]);

  const splitTotal = splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const splitDiff = Math.abs(splitTotal - paymentAmount);
  const splitValid = splitDiff < 1;

  const fillGuestIntoRow = (rowKey: string, guestId: string) => {
    const guest = guestOptions.find((g) => g.guestId === guestId);
    setSplitRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? {
              ...r,
              guestId: guest?.guestId,
              name: guest?.name ?? r.name,
              email: guest?.email ?? r.email,
              phone: guest?.phone ?? r.phone,
            }
          : r,
      ),
    );
  };

  const updateRow = (key: string, field: keyof SplitRow, value: string) => {
    setSplitRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const handleSubmit = async () => {
    if (needsManualStayDates) {
      if (!manualCheckIn || !manualCheckOut) {
        toast({
          title: "Check-in and check-out dates are required",
          variant: "destructive",
        });
        return;
      }
      if (new Date(manualCheckOut) < new Date(manualCheckIn)) {
        toast({
          title: "Check-out must be on or after check-in",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const base: Record<string, unknown> = {
        paymentId: paymentId ?? undefined,
        paymentLinkId: paymentLinkId ?? undefined,
        notes: notes || undefined,
        regenerate: isRegenerate,
      };

      if (needsManualStayDates) {
        base.checkIn = manualCheckIn;
        base.checkOut = manualCheckOut;
      }

      let body: Record<string, unknown>;

      if (classification === "complete") {
        body = { ...base, classification: "complete", discountReason: discountReason || undefined };
      } else if (classification === "partial") {
        body = { ...base, classification: "partial" };
      } else {
        if (!splitValid) {
          toast({ title: `Split amounts must sum to ${currency} ${paymentAmount}`, variant: "destructive" });
          return;
        }
        const allocations = splitRows
          .filter((r) => r.name || r.guestId)
          .map((r) => ({
            guestId: r.guestId || undefined,
            name: r.name,
            email: r.email || undefined,
            phone: r.phone || undefined,
            amount: parseFloat(r.amount) || 0,
          }));
        body = { ...base, classification: "split", splitAllocations: allocations };
      }

      const { data } = await axios.post("/api/finance/generate-invoice", body);
      if (data.success) {
        toast({ title: `${data.invoices.length} invoice(s) generated` });
        onGenerated(data.invoices as FinanceInvoiceRow[]);
        onOpenChange(false);
      } else {
        toast({ title: data.message ?? "Generation failed", variant: "destructive" });
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: err?.response?.data?.message ?? "Generation failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRegenerate ? "Regenerate Invoice" : "Generate Invoice"}</DialogTitle>
        </DialogHeader>

        {isRegenerate && (
          <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
            An invoice was already generated. Regenerating will mark previous invoice(s) as
            superseded and create new ones.
          </div>
        )}

        <div className="space-y-4">
          {bookingInfo && (
            <div className="rounded-md border p-3 text-sm space-y-2 bg-muted/40">
              <div className="font-medium">Booking stay details</div>
              {bookingInfo.propertyName && (
                <div className="text-muted-foreground">{bookingInfo.propertyName}</div>
              )}
              {bookingInfo.checkIn && bookingInfo.checkOut ? (
                <div className="text-muted-foreground">
                  Check-in: {formatStayDate(bookingInfo.checkIn)} · Check-out:{" "}
                  {formatStayDate(bookingInfo.checkOut)}
                </div>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This booking has no stay dates saved. Enter them below for the invoice.
                </p>
              )}
            </div>
          )}

          {needsManualStayDates && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="check-in-date">Check-in date *</Label>
                <Input
                  id="check-in-date"
                  type="date"
                  value={manualCheckIn}
                  onChange={(e) => setManualCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="check-out-date">Check-out date *</Label>
                <Input
                  id="check-out-date"
                  type="date"
                  value={manualCheckOut}
                  min={manualCheckIn || undefined}
                  onChange={(e) => setManualCheckOut(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Classification</Label>
            <RadioGroup
              value={classification}
              onValueChange={(v) => setClassification(v as Classification)}
              className="flex flex-wrap gap-4"
            >
              {(["complete", "partial", "split"] as const).map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <RadioGroupItem value={c} id={`class-${c}`} />
                  <Label htmlFor={`class-${c}`} className="cursor-pointer capitalize">{c}</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {classification === "complete" && `Full payment of ${currency} ${paymentAmount}. Any difference from booking amount will be recorded as a discount.`}
              {classification === "partial" && `Partial payment of ${currency} ${paymentAmount}. Remaining balance will be saved as pending amount.`}
              {classification === "split" && `${currency} ${paymentAmount} split among multiple guests. Enter allocations below.`}
            </p>
          </div>

          {classification === "complete" && (
            <div className="space-y-1">
              <Label htmlFor="discount-reason">Discount reason (if any)</Label>
              <Input
                id="discount-reason"
                placeholder="e.g. Loyalty discount, negotiated rate…"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
          )}

          {classification === "split" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Split Allocations</Label>
                <span className={`text-xs font-mono ${splitValid ? "text-green-600" : "text-destructive"}`}>
                  {currency} {splitTotal.toFixed(2)} / {paymentAmount}
                  {splitValid ? " ✓" : ` (diff ${splitDiff.toFixed(2)})`}
                </span>
              </div>

              {loadingGuests && (
                <p className="text-xs text-muted-foreground">Loading booking guests…</p>
              )}

              {splitRows.map((row, i) => (
                <div key={row.key} className="border rounded-md p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Person {i + 1}</span>
                    {splitRows.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => setSplitRows((p) => p.filter((r) => r.key !== row.key))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {guestOptions.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Fill from existing guest</Label>
                      <select
                        className="w-full text-sm rounded-md border border-input bg-background px-3 py-2"
                        value={row.guestId ?? ""}
                        onChange={(e) => fillGuestIntoRow(row.key, e.target.value)}
                      >
                        <option value="">— Select existing guest —</option>
                        {guestOptions.map((g) => (
                          <option key={g.guestId} value={g.guestId}>
                            {g.name} · {g.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.key, "name", e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount ({currency}) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) => updateRow(row.key, "amount", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={row.email}
                        onChange={(e) => updateRow(row.key, "email", e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={row.phone}
                        onChange={(e) => updateRow(row.key, "phone", e.target.value)}
                        placeholder="+91XXXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSplitRows((p) => [...p, newSplitRow()])}
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Add person
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="inv-notes">Notes (optional)</Label>
            <Textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes for this invoice…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              submitting ||
              loadingGuests ||
              (classification === "split" && !splitValid) ||
              (needsManualStayDates && (!manualCheckIn || !manualCheckOut))
            }
          >
            {submitting ? "Generating…" : isRegenerate ? "Regenerate" : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
