"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

interface Customer {
  name: string;
  email: string;
  phone?: string;
  amountDue?: number;
  amountPaid?: number;
}

interface CustomerPaymentEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  amount: string;
  // paymentType removed from per-customer entries; handled globally
}

interface ManualPaymentModalProps {
  bookingId: string;
  guests?: Customer[];
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

  const [customerPayments, setCustomerPayments] = useState<CustomerPaymentEntry[]>([
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
      // Pre-fill with existing guests if available
      if (guests && guests.length > 0) {
        setCustomerPayments(
          guests.map((guest, index) => ({
            id: String(index + 1),
            name: guest.name || "",
            email: guest.email || "",
            phone: guest.phone || "",
            idNumber: "",
            amount: guest.amountDue && guest.amountPaid !== undefined
              ? String(Math.max(0, guest.amountDue - guest.amountPaid))
              : guest.amountDue
              ? String(guest.amountDue)
              : "",
          }))
        );
      } else {
        setCustomerPayments([
          {
            id: "1",
            name: "",
            email: "",
            phone: "",
            idNumber: "",
            amount: "",
          },
        ]);
      }
      setPaymentType("full");
      setCommonNotes("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    }
  };

  const handleCustomerChange = (
    id: string,
    field: keyof CustomerPaymentEntry,
    value: string
  ) => {
    setCustomerPayments((prev) =>
      prev.map((customer) =>
        customer.id === id ? { ...customer, [field]: value } : customer
      )
    );
  };

  const addCustomerEntry = () => {
    const newId = String(
      Math.max(...customerPayments.map((c) => Number.parseInt(c.id) || 0)) + 1
    );
    setCustomerPayments((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        email: "",
        phone: "",
        idNumber: "",
        amount: "",
        // per-customer paymentType removed; global `paymentType` will apply
      },
    ]);
  };

  const removeCustomerEntry = (id: string) => {
    if (customerPayments.length > 1) {
      setCustomerPayments((prev) => prev.filter((customer) => customer.id !== id));
    } else {
      toast({
        title: "Error",
        description: "At least one customer entry is required",
        variant: "destructive",
      });
    }
  };

  const validateCustomerPayments = (): boolean => {
    // Check for duplicate emails
    const emails = customerPayments.map(c => c.email.trim().toLowerCase());
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicateEmails.length > 0) {
      toast({
        title: "Validation Error",
        description: `Duplicate email detected: ${duplicateEmails[0]}`,
        variant: "destructive",
      });
      return false;
    }

    for (let i = 0; i < customerPayments.length; i++) {
      const customer = customerPayments[i];
      const customerLabel = `Customer ${i + 1}${customer.name ? ` (${customer.name})` : ''}`;

      if (!customer.name.trim()) {
        toast({
          title: "Validation Error",
          description: `${customerLabel}: Please enter customer name`,
          variant: "destructive",
        });
        return false;
      }

      if (!customer.email.trim()) {
        toast({
          title: "Validation Error",
          description: `${customerLabel}: Please enter customer email`,
          variant: "destructive",
        });
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        toast({
          title: "Validation Error",
          description: `${customerLabel}: Invalid email format`,
          variant: "destructive",
        });
        return false;
      }

      if (!customer.phone.trim()) {
        toast({
          title: "Validation Error",
          description: `${customerLabel}: Please enter phone number`,
          variant: "destructive",
        });
        return false;
      }

      if (!customer.idNumber.trim()) {
        toast({
          title: "Validation Error",
          description: `${customerLabel}: Please enter ID number`,
          variant: "destructive",
        });
        return false;
      }

      if (!customer.amount || customer.amount === "0") {
        toast({
          title: "Validation Error",
          description: `${customerLabel}: Please enter a valid amount`,
          variant: "destructive",
        });
        return false;
      }

      const amountNum = Number.parseFloat(customer.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast({
          title: "Validation Error",
          description: `${customerLabel}: Amount must be greater than 0`,
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

    // Check if payment date is not in the future
    const selectedDate = new Date(paymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) {
      toast({
        title: "Validation Error",
        description: "Payment date cannot be in the future",
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
      if (!validateCustomerPayments()) {
        setLoading(false);
        return;
      }

      const paymentData = {
        bookingId,
        paymentDate,
        notes: commonNotes.trim() || undefined,
        paymentType: paymentType,
        guests: customerPayments.map((customer) => ({
          name: customer.name.trim(),
          email: customer.email.trim().toLowerCase(),
          phone: customer.phone.trim(),
          idNumber: customer.idNumber.trim(),
          amount: Math.round(Number.parseFloat(customer.amount) * 100) / 100,

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
        description: (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold">Payment Recorded</p>
              <p className="text-sm">
                {customerPayments.length} payment(s) totaling €{totalAmount.toFixed(2)} recorded successfully
              </p>
            </div>
          </div>
        ),
      });

      setOpen(false);
      
      // Small delay before refresh to ensure UI updates
      setTimeout(() => {
        onPaymentSuccess?.();
      }, 500);
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

  const totalAmount = customerPayments.reduce((sum, customer) => {
    const amount = Number.parseFloat(customer.amount) || 0;
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
            Enter payment details for one or multiple customers. Each customer can
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
              <Label className="text-base font-semibold">Customer Payments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomerEntry}
                disabled={loading}
                className="gap-2 bg-transparent"
              >
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            </div>

            {/* Global Payment Type */}
            <div className="w-56 mb-2">
              <Label className="text-sm">Payment Type for all customers</Label>
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
              {customerPayments.map((guest, index) => (
                <div
                  key={guest.id}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      Customer {index + 1}
                    </span>
                    {customerPayments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomerEntry(guest.id)}
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
                        placeholder="Customer name"
                        value={guest.name}
                        onChange={(e) =>
                          handleCustomerChange(guest.id, "name", e.target.value)
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
                        placeholder="customer@example.com"
                        value={guest.email}
                        onChange={(e) =>
                          handleCustomerChange(guest.id, "email", e.target.value)
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
                          handleCustomerChange(guest.id, "phone", e.target.value)
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
                          handleCustomerChange(
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
                    <div className="space-y-1 col-span-2">
                      <Label htmlFor={`amount-${guest.id}`} className="text-xs">
                        Amount (€) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`amount-${guest.id}`}
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        value={guest.amount}
                        onChange={(e) =>
                          handleCustomerChange(guest.id, "amount", e.target.value)
                        }
                        disabled={loading}
                      />
                      {/* Show remaining amount if guest exists in booking */}
                      {(() => {
                        const existingGuest = guests.find(
                          g => g.email?.toLowerCase() === guest.email?.toLowerCase()
                        );
                        if (existingGuest && existingGuest.amountDue !== undefined && existingGuest.amountPaid !== undefined) {
                          const remaining = existingGuest.amountDue - existingGuest.amountPaid;
                          if (remaining > 0) {
                            return (
                              <p className="text-xs text-muted-foreground mt-1">
                                Remaining: €{remaining.toFixed(2)}
                              </p>
                            );
                          }
                        }
                        return null;
                      })()}
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
                €{totalAmount.toFixed(2)}
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

          {/* Payment Summary */}
          {customerPayments.length > 0 && totalAmount > 0 && (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Payment Summary
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Number of Customers:</span>
                  <span className="font-medium">{customerPayments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Type:</span>
                  <span className="font-medium capitalize">{paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Date:</span>
                  <span className="font-medium">
                    {new Date(paymentDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-primary">€{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

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
            <Button type="submit" disabled={loading || totalAmount === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading
                ? "Recording..."
                : `Record ${customerPayments.length} Payment(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
