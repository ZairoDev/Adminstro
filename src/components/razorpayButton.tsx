"use client";

import { useState } from "react";
import axios from "axios";

type Props = {
  amount: number;
  name: string;
  email: string;
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
}: Props) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await axios.post("/api/payment-link", {
        amount,
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
      });

      if (data?.success) {
        setLink(data.link);
        setMessage("Payment link created and PDF emailed to customer.");
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
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Create Payment Link + Send PDF"}
      </button>

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
