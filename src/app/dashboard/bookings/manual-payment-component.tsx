"use client";

import type React from "react";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Guest {
  name: string;
  email: string;
  amountDue?: number;
  amountPaid?: number;
}

interface GuestPaymentEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  amount: string;
  // paymentType removed from per-guest entries; handled globally
}

interface ManualPaymentModalProps {
  bookingId: string;
  guests?: Guest[];
  onPaymentSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ManualPaymentModal({
  bookingId,
  guests = [],
  onPaymentSuccess,
  trigger,
}: ManualPaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [guestPayments, setGuestPayments] = useState<GuestPaymentEntry[]>([
    {
      id: "1",
      name: "",
      email: "",
      phone: "",
      idNumber: "",
      amount: "",
      // paymentType omitted here
    },
  ]);

  // Global payment type for all guests: 'full' | 'partial' | 'split'
  const [paymentType, setPaymentType] = useState<"full" | "partial" | "split">("full");

  const [commonNotes, setCommonNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setGuestPayments([
        {
          id: "1",
          name: "",
          email: "",
          phone: "",
          idNumber: "",
          amount: "",

        },
      ]);
      setCommonNotes("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    }
  };

  const handleGuestChange = (
    id: string,
    field: keyof GuestPaymentEntry,
    value: string
  ) => {
    setGuestPayments((prev) =>
      prev.map((guest) =>
        guest.id === id ? { ...guest, [field]: value } : guest
      )
    );
  };

  const addGuestEntry = () => {
    const newId = String(
      Math.max(...guestPayments.map((g) => Number.parseInt(g.id) || 0)) + 1
    );
    setGuestPayments((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        email: "",
        phone: "",
        idNumber: "",
        amount: "",
        // per-guest paymentType removed; global `paymentType` will apply
      },
    ]);
  };

  const removeGuestEntry = (id: string) => {
    if (guestPayments.length > 1) {
      setGuestPayments((prev) => prev.filter((guest) => guest.id !== id));
    } else {
      toast({
        title: "Error",
        description: "At least one guest entry is required",
        variant: "destructive",
      });
    }
  };

  const validateGuestPayments = (): boolean => {
    for (const guest of guestPayments) {
      if (!guest.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter guest name for all entries",
          variant: "destructive",
        });
        return false;
      }

      if (!guest.email.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter guest email for all entries",
          variant: "destructive",
        });
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guest.email)) {
        toast({
          title: "Validation Error",
          description: `Invalid email format: ${guest.email}`,
          variant: "destructive",
        });
        return false;
      }

      if (!guest.phone.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter phone number for all entries",
          variant: "destructive",
        });
        return false;
      }

      if (!guest.idNumber.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter ID number for all entries",
          variant: "destructive",
        });
        return false;
      }

      if (!guest.amount) {
        toast({
          title: "Validation Error",
          description: "Please enter amount for all entries",
          variant: "destructive",
        });
        return false;
      }

      const amountNum = Number.parseFloat(guest.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast({
          title: "Validation Error",
          description: `Invalid amount for ${guest.name}: must be greater than 0`,
          variant: "destructive",
        });
        return false;
      }
    }

    if (!paymentDate) {
      toast({
        title: "Validation Error",
        description: "Please select payment date",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validateGuestPayments()) {
        setLoading(false);
        return;
      }

      const paymentData = {
        bookingId,
        paymentDate,
        notes: commonNotes.trim() || undefined,
        paymentType: paymentType,
        guests: guestPayments.map((guest) => ({
          name: guest.name.trim(),
          email: guest.email.trim().toLowerCase(),
          phone: guest.phone.trim(),
          idNumber: guest.idNumber.trim(),
          amount: Math.round(Number.parseFloat(guest.amount) * 100) / 100,

        })),
      };

      const response = await fetch("/api/bookings/manual-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record payment");
      }

      toast({
        title: "Success",
        description: `Manual payments recorded successfully for ${guestPayments.length} guest(s)`,
      });

      setOpen(false);
      onPaymentSuccess?.();
    } catch (error: any) {
      console.error("[v0] Payment submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = guestPayments.reduce((sum, guest) => {
    const amount = Number.parseFloat(guest.amount) || 0;
    return sum + amount;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Add Manual Payment</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Manual Payments</DialogTitle>
          <DialogDescription>
            Enter payment details for one or multiple guests. Each guest can
            have their own payment type and amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">
              Payment Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Guest Payments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Guest Payments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGuestEntry}
                disabled={loading}
                className="gap-2 bg-transparent"
              >
                <Plus className="h-4 w-4" />
                Add Guest
              </Button>
            </div>

            {/* Global Payment Type */}
            <div className="w-56 mb-2">
              <Label className="text-sm">Payment Type for all guests</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "full" | "partial" | "split") } disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Payment</SelectItem>
                  <SelectItem value="partial">Partial Payment</SelectItem>
                  <SelectItem value="split">Split Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Guest Entries */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {guestPayments.map((guest, index) => (
                <div
                  key={guest.id}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      Guest {index + 1}
                    </span>
                    {guestPayments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGuestEntry(guest.id)}
                        disabled={loading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Name */}
                    <div className="space-y-1">
                      <Label htmlFor={`name-${guest.id}`} className="text-xs">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`name-${guest.id}`}
                        placeholder="Guest name"
                        value={guest.name}
                        onChange={(e) =>
                          handleGuestChange(guest.id, "name", e.target.value)
                        }
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <Label htmlFor={`email-${guest.id}`} className="text-xs">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`email-${guest.id}`}
                        type="email"
                        placeholder="guest@example.com"
                        value={guest.email}
                        onChange={(e) =>
                          handleGuestChange(guest.id, "email", e.target.value)
                        }
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <Label htmlFor={`phone-${guest.id}`} className="text-xs">
                        Phone <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`phone-${guest.id}`}
                        placeholder="+91 XXXXX XXXXX"
                        value={guest.phone}
                        onChange={(e) =>
                          handleGuestChange(guest.id, "phone", e.target.value)
                        }
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>

                    {/* ID Number */}
                    <div className="space-y-1">
                      <Label
                        htmlFor={`idNumber-${guest.id}`}
                        className="text-xs"
                      >
                        ID Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`idNumber-${guest.id}`}
                        placeholder="Passport/Aadhar/License"
                        value={guest.idNumber}
                        onChange={(e) =>
                          handleGuestChange(
                            guest.id,
                            "idNumber",
                            e.target.value
                          )
                        }
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <Label htmlFor={`amount-${guest.id}`} className="text-xs">
                        Amount (INR) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`amount-${guest.id}`}
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={guest.amount}
                        onChange={(e) =>
                          handleGuestChange(guest.id, "amount", e.target.value)
                        }
                        disabled={loading}
                      />
                    </div>

                    {/* Payment Type is now global; omitted per-guest */}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Amount */}
            <div className="bg-primary/10 rounded-lg p-3 flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-lg font-bold text-primary">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Common Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about these payments"
              value={commonNotes}
              onChange={(e) => setCommonNotes(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading
                ? "Recording..."
                : `Record ${guestPayments.length} Payment(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
