"use client";

import { useState } from "react";
import axios from "axios";
import { Dialog } from "@headlessui/react";

type Props = {
  amount: number; // travellerPayment.finalAmount
  amountRecieved?: number; // NEW FIELD
  finalPrice?: number; // NEW FIELD
  name: string;
  email?: string;
  phone: string;
  description?: string;
  bookingId?: string;
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
};

export default function PaymentLinkButton({
  amount,
  amountRecieved = 0, // default to 0 if missing
  finalPrice,
  name,
  email: initialEmail,
  phone,
  description,
  bookingId,
  numberOfPeople,
  propertyOwner,
  address,
  checkIn,
  checkOut,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // form state
  const [email, setEmail] = useState(initialEmail || "");
  const [paymentType, setPaymentType] = useState<
    "full" | "partial" | "remaining"
  >("full");
  const [partialAmount, setPartialAmount] = useState<number>(0);

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      let finalAmount = amount;

      if (paymentType === "partial") {
        if (partialAmount <= 0) {
          setError("Please enter a valid partial amount");
          setLoading(false);
          return;
        }
        finalAmount = partialAmount;
      } else if (paymentType === "remaining") {
        const remaining = Math.max(amount - amountRecieved, 0);
        finalAmount = remaining;
      }

      if (!email) {
        setError("Please enter customer email");
        setLoading(false);
        return;
      }

      const { data } = await axios.post("/api/payment-link", {
        amount: finalAmount,
        finalPrice,
        name,
        email,
        phone,
        description,
        bookingId,
        numberOfPeople,
        propertyOwner,
        address,
        checkIn,
        checkOut,
        paymentType,
        partialAmount,
      });

      if (data?.success) {
        setLink(data.link);
        setMessage("Payment link created and PDF emailed to customer.");
        setOpen(false);
      } else {
        setError(data?.error || "Unexpected response from server");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        Create Payment Link + Send PDF
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-2xl bg-stone-900 p-6 shadow-lg">
            <Dialog.Title className="text-xl font-semibold mb-4">
              Create Payment Link
            </Dialog.Title>

            {/* Email Input */}
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

            {/* Payment Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Payment Type
              </label>
              <div className="flex flex-col gap-2">
                {["full", "partial", "remaining"].map((type) => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentType"
                      value={type}
                      checked={paymentType === type}
                      onChange={() => setPaymentType(type as any)}
                    />
                    <span className="capitalize">{type} Payment</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Partial Amount Input */}
            {paymentType === "partial" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Enter Partial Amount
                </label>
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(Number(e.target.value))}
                  placeholder="Enter partial amount"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* Remaining Payment Info */}
            {paymentType === "remaining" && (
              <div className="mb-4">
                <p className="text-sm text-gray-300 mb-2">
                  <strong>Total:</strong> ₹{amount}
                </p>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>Already Received:</strong> ₹{amountRecieved}
                </p>
                <p className="text-sm text-green-500">
                  <strong>Remaining to Collect:</strong> ₹
                  {Math.max(amount - amountRecieved, 0)}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Generate Link"}
              </button>
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
