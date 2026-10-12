import { useState } from "react";

export function useRazorpayLink() {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createPaymentLink = async (data: {
    amount: number;
    name: string;
    email: string;
    phone: string;
    description?: string;
  }) => {
    setLoading(true);
    setError(null);
    setLink(null);

    try {
      const res = await fetch("/api/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        setLink(result.paymentLink.short_url);
      } else {
        throw new Error(result.error || "Failed to create payment link");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { createPaymentLink, link, loading, error };
}
