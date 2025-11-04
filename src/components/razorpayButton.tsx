"use client";

import type React from "react";

import { useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import { FileUp, PlusCircle, Trash2 } from "lucide-react";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";

export type Owner = {
  name: string;
  email: string;
  phoneNo: string;
  idNumber: string;
  documents: string[];
};

interface UploadCellProps {
  onUploadComplete?: (urls: string[]) => void; // callback to parent
  existingUrls?: string[]; // existing uploaded file URLs
}

type Props = {
  amount: number;
  amountRecieved?: number; // legacy naming
  amountReceived?: number; // preferred naming
  finalPrice?: number;
  name: string;
  email?: string;
  phone: string;
  description?: string;
  bookingId?: string;
  booking_Id?: string;
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;

  currency?: string; // e.g. "INR", "EUR", "USD"
};

export default function PaymentLinkButton({
  amount,
  amountRecieved = 0,
  amountReceived: amountReceivedProp,
  finalPrice,
  name,
  email: initialEmail,
  phone,
  description,
  bookingId,
  booking_Id,
  numberOfPeople,
  propertyOwner,
  address: initialAddress,
  checkIn,
  checkOut,
  currency = "INR",
}: Props) {
  const received = amountReceivedProp ?? amountRecieved ?? 0;

  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [rentPayable, setRentPayable] = useState<number>(0);
  const [depositPaid, setDepositPaid] = useState<number>(0);

  const [email, setEmail] = useState(initialEmail || "");
  const [address, setAddress] = useState(initialAddress || "");

  const [owners, setOwners] = useState<Owner[]>([
    { name: "", email: "", phoneNo: "", idNumber: "" ,documents: []},
  ]);

  const [paymentType, setPaymentType] = useState<
    "full" | "partial" | "remaining" | "split"
  >("full");
  const [partialAmount, setPartialAmount] = useState<number>(0);

  const { toast } = useToast();

  const fmt = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // Fallback if currency code is invalid
      return `${value.toFixed(2)} ${currency}`;
    }
  };

  const handleAddOwner = () => {
    setOwners((prev) => [
      ...prev,
      { name: "", email: "", phoneNo: "", idNumber: "", documents: [] },
    ]);

  };

  const handleRemoveOwner = (index: number) => {
    setOwners((prev) => prev.filter((_, i) => i !== index));

  };

  const handleOwnerChange = (
    index: number,
    field: keyof Owner,
    value: string
  ) => {
    setOwners((prev) => {
      const next = [...prev];
      (next[index][field] as string) = value;
      return next;
    });
  };

  const handleDocumentsChange = (index: number, urls: string[]) => {
    setOwners((prev) => {
      const next = [...prev];
      next[index].documents = urls;
      return next;
    });
  };

  const validateBeforeSubmit = () => {
    if (!email?.trim()) {
      return "Enter customer email";
    }
    if (paymentType === "partial") {
      if (!Number.isFinite(partialAmount) || partialAmount <= 0) {
        return "Enter a valid partial amount greater than 0";
      }
      const maxPartial = Math.max(amount - received, 0);
      if (partialAmount > maxPartial) {
        return `Partial amount cannot exceed remaining balance (${fmt(
          maxPartial
        )})`;
      }
    }
    if (paymentType === "remaining") {
      const remaining = Math.max(amount - received, 0);
      if (remaining <= 0) {
        return "No remaining balance to collect";
      }
    }
    return null;
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const validationError = validateBeforeSubmit();
      if (validationError) throw new Error(validationError);

      let finalAmount = amount;

      if (paymentType === "partial") {
        finalAmount = partialAmount;
      } else if (paymentType === "remaining") {
        finalAmount = Math.max(amount - received, 0);
      }

      const payload = {
        amount: finalAmount,
        finalPrice,
        name,
        email,
        phone,
        description,
        bookingId,
        booking_Id,
        numberOfPeople,
        propertyOwner,
        address,
        checkIn,
        checkOut,
        paymentType,
        partialAmount,
        rentPayable,
        depositPaid,
        currency,

        guests: owners.map((o, i) => ({
          documents: o.documents,
          name: o.name,
          email: o.email,
          phoneNo: o.phoneNo, // align with API
          idNumber: o.idNumber,
        })),
      };

      const res = await fetch("/api/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      if (data?.success) {
        setLink(data.link || null);
        setMessage(data.message || "Payment link(s) created and emailed.");
        setOpen(false);
        toast({ title: "Success", description: "Payment link generated." });
      } else {
        throw new Error(data?.error || "Unexpected response from server");
      }
    } catch (err: any) {
      const msg = err?.message || "Request failed";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  function UploadCell({
    onUploadComplete,
    existingUrls = [],
  }: UploadCellProps) {
    const { uploadFiles, loading } = useBunnyUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploaded, setUploaded] = useState(existingUrls.length > 0);

    const handleFileChange = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const input = event.target;
      const files = input.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      const { imageUrls, error } = await uploadFiles(
        fileArray,
        "GuestDocuments"
      );

      if (error) {
        toast({
          title: "Upload failed",
          description: error,
          variant: "destructive",
        });
        return;
      }

      const allUrls = [...existingUrls, ...imageUrls];
      setUploaded(true);

      if (onUploadComplete) onUploadComplete(allUrls);

      toast({
        title: "Files uploaded successfully",
        description: `${imageUrls.length} file(s) uploaded.`,
      });

      input.value = ""; // reset input for re-upload
    };

    return (
      <>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon"
          className="p-0"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp
            className={`h-5 w-5 ${
              uploaded ? "text-green-500" : "text-gray-500"
            }`}
          />
          <span className="sr-only">Upload documents</span>
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={() => setOpen(true)} disabled={loading}>
        {loading ? "Processing..." : "Create Payment Link + Send PDF"}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4 ">
          <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-stone-900 p-6 shadow-lg max-h-[90vh] overflow-y-auto ">
            <Dialog.Title className="text-xl font-semibold mb-4">
              Create Payment Link
            </Dialog.Title>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Customer Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Property Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter property address"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Rent Payable */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Rent Payable ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rentPayable}
                  onChange={(e) =>
                    setRentPayable(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder={`Enter rent payable amount (${currency})`}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {/* Deposit Paid */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Deposit Paid ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={depositPaid}
                  onChange={(e) =>
                    setDepositPaid(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder={`Enter deposit paid amount (${currency})`}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 flex items-center justify-between">
                Property Owner(s)
                <button
                  type="button"
                  onClick={handleAddOwner}
                  className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                >
                  <PlusCircle size={16} /> Add Owner
                </button>
              </label>

              <div className="flex flex-col gap-3">
                {owners.map((owner, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-md bg-stone-800 relative"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={owner.name}
                        onChange={(e) =>
                          handleOwnerChange(index, "name", e.target.value)
                        }
                        placeholder="Owner name"
                        className="rounded-md border px-3 py-2 text-sm"
                      />
                      <input
                        type="email"
                        value={owner.email}
                        onChange={(e) =>
                          handleOwnerChange(index, "email", e.target.value)
                        }
                        placeholder="Owner email"
                        className="rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={owner.phoneNo}
                        onChange={(e) =>
                          handleOwnerChange(index, "phoneNo", e.target.value)
                        }
                        placeholder="Phone number"
                        className="rounded-md border px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={owner.idNumber}
                        onChange={(e) =>
                          handleOwnerChange(index, "idNumber", e.target.value)
                        }
                        placeholder="ID Number"
                        className="rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <UploadCell
                        existingUrls={owner.documents}
                        onUploadComplete={(urls) =>
                          handleDocumentsChange(index, urls)
                        }
                      />
                      {owner.documents.length ? (
                        <span className="text-xs text-green-400">
                          {owner.documents.length} file(s) attached
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Attach documents
                        </span>
                      )}
                    </div>
                    {owners.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOwner(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                        aria-label="Remove owner"
                        title="Remove owner"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Payment Type
              </label>
              <div className="flex flex-col gap-2">
                {["full", "partial", "remaining", "split"].map((type) => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      value={type}
                      checked={paymentType === (type as any)}
                      onChange={() => setPaymentType(type as any)}
                    />
                    <span className="capitalize">{type} Payment</span>
                  </label>
                ))}
              </div>
            </div>

            {paymentType === "partial" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Enter Partial Amount
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={partialAmount}
                  onChange={(e) =>
                    setPartialAmount(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder={`Enter partial amount (${currency})`}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}

            {paymentType === "remaining" && (
              <div className="mb-4 text-sm text-gray-300">
                <p>
                  <strong>Total:</strong> {fmt(amount)}
                </p>
                <p>
                  <strong>Received:</strong> {fmt(received)}
                </p>
                <p className="text-green-500">
                  <strong>Remaining:</strong>{" "}
                  {fmt(Math.max(amount - received, 0))}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateLink} disabled={loading}>
                {loading ? "Processing..." : "Generate Link"}
              </Button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {message && <p className="text-green-600">{message}</p>}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          Open Payment Link
        </a>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
